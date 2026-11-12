import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {onRequest} from '../functions/api/inquiries.js';
import {onInquiryNotifications,notify} from '../lib/content/inquiry-notifications.mjs';
import {digest} from '../lib/content/auth.mjs';
async function setup(){
 const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../drizzle/0000_worthless_jack_flag.sql',import.meta.url),'utf8'));sql.exec(readFileSync(new URL('../team/schema.sql',import.meta.url),'utf8'));
 const db={prepare(q){let args=[];return {bind(...a){args=a;return this;},async first(){return sql.prepare(q).get(...args)||null;},async all(){return {results:sql.prepare(q).all(...args)};},async run(){const r=sql.prepare(q).run(...args);return {meta:{changes:Number(r.changes)}};}};},async batch(ss){sql.exec('BEGIN');try{const out=[];for(const s of ss)out.push(await s.run());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 const token=crypto.randomUUID()+crypto.randomUUID();sql.prepare('INSERT INTO login_sessions VALUES (?,?,?)').run(await digest(token),'admin@example.test',Date.now()+60000);
 const env={DB:db,TEAM_DB:db,TEAM_ADMIN_EMAIL:'admin@example.test',TEAM_PUBLISH:'1',INQUIRY_EMAIL:'team@example.test',INQUIRY_FROM:'site@example.test',RESEND_API_KEY:'fake-test-key'};
 const data={requestId:crypto.randomUUID(),name:'Test',email:'test@example.test',summary:'A journey',consent:true,type:'private'};
 const submit=(d=data)=>onRequest({env,request:new Request('https://site.test/api/inquiries',{method:'POST',headers:{Origin:'https://site.test','Content-Type':'application/json'},body:JSON.stringify(d)})});
 const admin=(body,options={})=>onInquiryNotifications({env,request:new Request('https://site.test/api/team/inquiry-notifications',{method:body?'POST':'GET',headers:{Origin:options.origin||'https://site.test','Content-Type':'application/json',...(options.anonymous?{}:{Cookie:'__Host-sukha-team='+token})},...(body?{body:JSON.stringify(body)}:{})})});
 return {sql,env,data,submit,admin};
}
test('save remains unique through mail failure and admin recovery; invalid inputs never save',async()=>{
 const {sql,data,submit,admin,env}=await setup(),original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return new Response('{}',{status:503});};
 try{
  assert.equal((await submit({...data,consent:false})).status,400);assert.equal((await submit({...data,email:'bad'})).status,400);assert.equal((await submit({...data,type:'invalid'})).status,400);
  const r=await submit(),v=await r.json();assert.equal(r.status,201);assert.equal(v.saved,true);assert.equal(v.emailSent,false);assert.equal(sql.prepare('SELECT status FROM notifications').get().status,'pending');
  assert.equal((await submit()).status,200);assert.equal(sql.prepare('SELECT count(*) n FROM inquiries').get().n,1);assert.equal((await submit({...data,name:'Different'})).status,409);
  assert.equal((await admin(null,{anonymous:true})).status,401);assert.equal((await admin({reference:v.reference},{origin:'https://evil.test'})).status,403);
  const list=await (await admin()).json();assert.equal(list.notifications[0].reference,v.reference);assert.equal(list.notifications[0].summary,data.summary);
  env.TEAM_PUBLISH='0';assert.equal((await admin({reference:v.reference})).status,403);env.TEAM_PUBLISH='1';
  const before=calls;globalThis.fetch=async(url,options)=>{calls++;assert.equal(options.headers['Idempotency-Key'],v.reference);return new Response('{}');};
  assert.equal((await (await admin({reference:v.reference})).json()).emailSent,true);assert.equal((await (await admin({reference:v.reference})).json()).emailSent,true);assert.equal(calls,before+1);assert.equal(sql.prepare('SELECT count(*) n FROM inquiries').get().n,1);assert.deepEqual((await (await admin()).json()).notifications,[]);
  sql.prepare('INSERT INTO team_members (email,active,updated_at) VALUES (?,?,?)').run('admin@example.test',1,Date.now());env.TEAM_ADMIN_EMAIL='other@example.test';assert.equal((await admin()).status,403);
 }finally{globalThis.fetch=original;}
});
test('notification sending lease prevents parallel sends and stale leases can recover',async()=>{
 const {env,data,submit,sql}=await setup(),original=globalThis.fetch;delete env.RESEND_API_KEY;await submit();env.RESEND_API_KEY='test';let release,calls=0;
 globalThis.fetch=async()=>{calls++;await new Promise(r=>release=r);return new Response('{}');};
 try{const n=sql.prepare('SELECT * FROM notifications').get();const first=notify(env,'site.test',n,data,n.inquiry_id);await new Promise(r=>setImmediate(r));assert.equal(await notify(env,'site.test',n,data,n.inquiry_id),false);assert.equal(calls,1);release();assert.equal(await first,true);
 sql.prepare('UPDATE notifications SET status=?').run('sending:'+(Date.now()-120000)+':old');globalThis.fetch=async()=>new Response('{}');assert.equal(await notify(env,'site.test',{...n,status:'sending'},data,n.inquiry_id),true);
 }finally{globalThis.fetch=original;}
});
test('home submission locks double clicks, retains UUID across reload, and never reports failed save as success',async()=>{
 const source=readFileSync(new URL('../public/home-v1.js',import.meta.url),'utf8'),code=source.slice(source.indexOf(" let requestId="),source.indexOf(" document.querySelector('#home-copy-request')")),storage=new Map();let calls=0,bodies=[],ok=true;
 const run=()=>{const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,{value:'',checked:true,disabled:false,handlers:{},addEventListener(n,f){this.handlers[n]=f;}});return elements.get(id);};get('#home-name').value='Test';get('#home-email').value='test@example.test';get('#home-interest').value='Yangtze River Cruise';
 const context=vm.createContext({document:{querySelector:get},form:{addEventListener(){}},summary:{value:'A river trip'},review:{querySelector:()=>get('review-p')},crypto,TextEncoder,Uint8Array,sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},fetch:async(url,options)=>{calls++;bodies.push(JSON.parse(options.body));return {ok,json:async()=>ok?{saved:true,reference:'INQ-TEST',emailSent:false}:{error:'failed'}};}});vm.runInContext(code,context);return {get,click:()=>get('#home-submit-inquiry').handlers.click()};};
 let ui=run();await Promise.all([ui.click(),ui.click()]);assert.equal(calls,1);assert.equal(bodies[0].type,'cruise');assert.match(ui.get('#home-submit-status').textContent,/INQ-TEST/);
 ui=run();ok=false;await ui.click();assert.equal(bodies[0].requestId,bodies[1].requestId);assert.match(ui.get('#home-submit-status').textContent,/could not confirm/);assert.equal(ui.get('#home-submit-inquiry').disabled,false);
});
