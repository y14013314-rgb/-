export const cookieName = '__Host-sukha-team';
export const digest = async value => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(b => b.toString(16).padStart(2, '0')).join('');
export const response = (body, status = 200, headers = {}) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } });
export async function member(email, env) {
  if(email===env.TEAM_ADMIN_EMAIL)return {email,role:'admin'};
  const row=await env.TEAM_DB.prepare('SELECT email FROM team_members WHERE email=? AND active=1').bind(email).first();
  return row?{email:row.email,role:'editor'}:null;
}
export async function session(request, env) {
  const token = request.headers.get('Cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  if (!token || !/^[a-f0-9-]{72}$/.test(token)) return null;
  const row = await env.TEAM_DB.prepare('SELECT email FROM login_sessions WHERE token_hash=? AND expires_at>?').bind(await digest(token), Date.now()).first();
  return row ? member(row.email, env) : null;
}
export async function limit(db, key, maximum, now) {
  const row = await db.prepare('INSERT INTO login_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key, now + 7200000).first();
  return row.count <= maximum;
}
export async function onAuth({ request, env, params }) {
  if (!env.TEAM_DB || !env.TEAM_ADMIN_EMAIL) return response({ error: '后台尚未启用。' }, 503);
  const action = params.action;
  if (request.method === 'GET' && action === 'me') {
    const user = await session(request, env);
    return user ? response({ email: user.email, role: user.role }) : response({ error: '请先登录。' }, 401);
  }
  if (request.method !== 'POST') return response({ error: 'Method not allowed' }, 405);
  if (request.headers.get('Origin') !== new URL(request.url).origin) return response({ error: 'Invalid origin' }, 403);
  if (action === 'logout') {
    const token = request.headers.get('Cookie')?.split(';').map(v => v.trim()).find(v => v.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
    if (token) await env.TEAM_DB.prepare('DELETE FROM login_sessions WHERE token_hash=?').bind(await digest(token)).run();
    return response({ ok: true }, 200, { 'Set-Cookie': `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });
  }
  if (request.headers.get('Content-Type')?.split(';')[0] !== 'application/json') return response({ error: 'JSON required' }, 415);
  const raw = await request.text();
  if (raw.length > 2048) return response({ error: 'Request too large' }, 413);
  let body;
  try { body = JSON.parse(raw); } catch { return response({ error: 'Invalid JSON' }, 400); }
  const now = Date.now(), db = env.TEAM_DB;
  if (action === 'request-code') {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!await member(email,env)) return response({ error: '该邮箱未获授权。' }, 403);
    if (!env.RESEND_API_KEY || !env.INQUIRY_FROM) return response({ error: '邮件服务尚未配置。' }, 503);
    const hour = Math.floor(now / 3600000), ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (!await limit(db, `ip:${await digest(ip)}:${hour}`, 20, now) || !await limit(db, `email:${email}:${hour}`, 5, now)) return response({ error: '发送次数过多，请稍后再试。' }, 429);
    const challenge = crypto.randomUUID();
    let random;
    do { random = crypto.getRandomValues(new Uint32Array(1))[0]; } while (random >= 4200000000);
    const code = String(random % 100000000).padStart(8, '0');
    await db.prepare('INSERT INTO login_codes (id,email,code_hash,expires_at) VALUES (?,?,?,?)').bind(challenge, email, await digest(challenge + ':' + code), now + 600000).run();
    let sent = false;
    try {
      const mail = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Idempotency-Key': challenge }, signal: AbortSignal.timeout(8000), body: JSON.stringify({ from: env.INQUIRY_FROM, to: [email], subject: 'SUKHA 后台登录验证码', text: `你的登录验证码：${code}\n\n10 分钟内有效，仅可使用一次。请勿向他人提供验证码。若非本人操作，请忽略此邮件。` }) });
      sent = mail.ok;
    } catch {}
    if (!sent) {
      await db.prepare('DELETE FROM login_codes WHERE id=?').bind(challenge).run();
      return response({ error: '验证码邮件发送失败，请稍后再试。' }, 502);
    }
    await db.batch([db.prepare('DELETE FROM login_codes WHERE expires_at<?').bind(now), db.prepare('DELETE FROM login_sessions WHERE expires_at<?').bind(now), db.prepare('DELETE FROM login_limits WHERE expires_at<?').bind(now)]);
    return response({ challenge });
  }
  if (action === 'verify') {
    if (typeof body.challenge !== 'string' || !/^[a-f0-9-]{36}$/.test(body.challenge) || typeof body.code !== 'string' || !/^\d{8}$/.test(body.code)) return response({ error: '请输入邮件中的 8 位验证码。' }, 400);
    const row = await db.prepare('UPDATE login_codes SET attempts=attempts+1 WHERE id=? AND expires_at>? AND attempts<5 RETURNING *').bind(body.challenge, now).first();
    if (!row || !await member(row.email,env) || row.code_hash !== await digest(body.challenge + ':' + body.code)) return response({ error: '验证码错误、已过期或尝试次数已用尽。' }, 401);
    const consumed = await db.prepare('DELETE FROM login_codes WHERE id=? RETURNING id').bind(body.challenge).first();
    if (!consumed) return response({ error: '验证码已使用，请重新获取。' }, 401);
    const token = crypto.randomUUID() + crypto.randomUUID();
    await db.prepare('INSERT INTO login_sessions (token_hash,email,expires_at) VALUES (?,?,?)').bind(await digest(token), row.email, now + 28800000).run();
    return response(await member(row.email,env), 200, { 'Set-Cookie': `${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800` });
  }
  return response({ error: 'Not found' }, 404);
}
