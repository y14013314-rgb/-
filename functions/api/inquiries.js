import {notify} from '../../lib/content/inquiry-notifications.mjs';
const respond = (body, status = 200) => Response.json(body, {
  status,
  headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});


export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { Allow: 'POST' } });
  }
  if (request.headers.get('Origin') !== url.origin) {
    return respond({ error: 'Invalid request origin.' }, 403);
  }
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return respond({ error: 'JSON required.' }, 415);
  }
  if (!env.DB) return respond({ error: 'Online submission is unavailable. Please use a contact option below.' }, 503);

  let body;
  try {
    if (Number(request.headers.get('Content-Length')) > 12000) {
      return respond({ error: 'Request too large.' }, 413);
    }
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 12000) return respond({ error: 'Request too large.' }, 413);
    body = JSON.parse(raw);
  } catch {
    return respond({ error: 'Invalid request.' }, 400);
  }
  const { requestId, consent } = body || {};
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const summary = typeof body?.summary === 'string' ? body.summary.trim() : '';
  if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254
      || !summary || summary.length > 5000 || consent !== true
      || typeof requestId !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(requestId)) {
    return respond({ error: 'Check your name, email, inquiry details and privacy consent.' }, 400);
  }

  const reference = 'INQ-' + requestId.toUpperCase();
  const notificationId = 'pages-' + reference;
  const type=body.type===undefined?'rail':body.type;
  if(!['private','rail','cruise'].includes(type))return respond({error:'Invalid journey type.'},400);
  const payload = JSON.stringify({ type, summary, consent: true });
  const time = Date.now();
  const db = env.DB;
  const lookup = db.prepare('SELECT name,email,payload FROM inquiries WHERE id=?').bind(reference);

  try {
    const existing = await lookup.first();
    if (!existing) {
      const hour = Math.floor(time / 3600000);
      const address = request.headers.get('CF-Connecting-IP') || 'local';
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`pages:${address}:${hour}`));
      const key = [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
      const limit = await db.prepare(`INSERT INTO rate_limits (key,count,expires_at) VALUES (?,1,?)
        ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count`).bind(key, time + 7200000).first();
      if (limit.count > 12) return respond({ error: 'Too many requests. Please try again later.' }, 429);
      await db.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(time).run();
    }
    const [saved] = await db.batch([
      db.prepare(`INSERT INTO inquiries (id,name,email,payload,status,created_at,updated_at)
        VALUES (?,?,?,?,'new',?,?) ON CONFLICT(id) DO NOTHING`).bind(reference, name, email, payload, time, time),
      db.prepare(`INSERT INTO notifications (id,inquiry_id,recipient,status,created_at)
        SELECT ?,id,?,'pending',? FROM inquiries WHERE id=? AND name=? AND email=? AND payload=?
        ON CONFLICT(id) DO NOTHING`).bind(notificationId, env.INQUIRY_EMAIL || '', time, reference, name, email, payload),
    ]);
    const stored = await lookup.first();
    if (stored.name !== name || stored.email !== email || stored.payload !== payload) {
      return respond({ error: 'This request ID belongs to different inquiry details.' }, 409);
    }
    if (env.INQUIRY_EMAIL) {
      await db.prepare("UPDATE notifications SET recipient=? WHERE id=? AND recipient='' AND status='pending'")
        .bind(env.INQUIRY_EMAIL, notificationId).run();
    }
    const notification = await db.prepare('SELECT id,recipient,status FROM notifications WHERE id=?')
      .bind(notificationId).first();
    const emailSent = await notify(env, url.hostname, notification, { name, email, summary }, reference);
    return respond({ reference, saved: true, emailSent }, saved.meta.changes ? 201 : 200);
  } catch {
    return respond({ error: 'Could not confirm the save. Retry with the same details or use a contact option below.' }, 503);
  }
}
