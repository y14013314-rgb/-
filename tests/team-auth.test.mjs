import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { onAuth, digest } from '../lib/content/auth.mjs';
function setup() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../team/schema.sql', import.meta.url), 'utf8'));
  const db = { prepare(sql) { let values = []; return { bind(...v) { values = v; return this; }, async first() { return sqlite.prepare(sql).get(...values) || null; }, async run() { return sqlite.prepare(sql).run(...values); } }; }, async batch(statements) { return Promise.all(statements.map(s => s.run())); } };
  const env = { TEAM_DB: db, TEAM_ADMIN_EMAIL: 'owner@example.test', RESEND_API_KEY: 'test-only', INQUIRY_FROM: 'test@example.test' };
  const call = (action, body, options = {}) => onAuth({ env, params: { action }, request: new Request('https://sukhatrip.com/api/team/' + action, { method: options.method || 'POST', headers: { Origin: options.origin || 'https://sukhatrip.com', 'Content-Type': 'application/json', ...(options.cookie ? { Cookie: options.cookie } : {}) }, ...(options.method === 'GET' ? {} : { body: JSON.stringify(body || {}) }) }) });
  return { sqlite, env, call };
}
test('single-use OTP, secure session and logout', async () => {
  const { call } = setup(); const original = globalThis.fetch; let code;
  globalThis.fetch = async (_url, init) => { code = JSON.parse(init.body).text.match(/\d{8}/)[0]; return new Response('{}'); };
  try {
    assert.equal((await call('me', null, { method: 'GET' })).status, 401);
    assert.equal((await call('request-code', { email: 'other@example.test' })).status, 403);
    assert.equal((await call('request-code', { email: 'owner@example.test' }, { origin: 'https://evil.test' })).status, 403);
    const sent = await call('request-code', { email: 'owner@example.test' }); const { challenge } = await sent.json();
    assert.equal(sent.status, 200);
    const verified = await call('verify', { challenge, code }); assert.equal(verified.status, 200);
    const cookie = verified.headers.get('Set-Cookie');
    for (const flag of ['HttpOnly','Secure','SameSite=Strict','Path=/']) assert(cookie.includes(flag));
    assert.equal((await call('verify', { challenge, code })).status, 401);
    assert.equal((await call('me', null, { method: 'GET', cookie })).status, 200);
    await call('logout', {}, { cookie });
    assert.equal((await call('me', null, { method: 'GET', cookie })).status, 401);
  } finally { globalThis.fetch = original; }
});
test('expired codes, attempt exhaustion and concurrent replay', async () => {
  const { sqlite, call } = setup(); const id = crypto.randomUUID(), code = '12345678';
  const insert = sqlite.prepare('INSERT INTO login_codes (id,email,code_hash,expires_at) VALUES (?,?,?,?)');
  insert.run(id, 'owner@example.test', await digest(id + ':' + code), Date.now() - 1);
  assert.equal((await call('verify', { challenge:id,code })).status, 401);
  sqlite.prepare('UPDATE login_codes SET expires_at=? WHERE id=?').run(Date.now() + 600000,id);
  for (let i=0;i<5;i++) assert.equal((await call('verify',{challenge:id,code:'00000000'})).status,401);
  assert.equal((await call('verify',{challenge:id,code})).status,401);
  sqlite.prepare('UPDATE login_codes SET attempts=0 WHERE id=?').run(id);
  const replies = await Promise.all([call('verify',{challenge:id,code}),call('verify',{challenge:id,code})]);
  assert.deepEqual(replies.map(r=>r.status).sort(),[200,401]);
});
test('email limit and mail failure do not issue a usable code', async () => {
  const { call, sqlite } = setup();const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response('{}',{status:500});
  try {
    for(let i=0;i<5;i++) assert.equal((await call('request-code',{email:'owner@example.test'})).status,502);
    assert.equal((await call('request-code',{email:'owner@example.test'})).status,429);
    assert.equal(sqlite.prepare('SELECT count(*) AS n FROM login_codes').get().n,0);
  } finally { globalThis.fetch=original; }
});
