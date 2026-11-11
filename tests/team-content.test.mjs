import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {onMembers} from '../lib/content/members.mjs';
import {member} from '../lib/content/auth.mjs';
import {onContent} from '../lib/content/content-api.mjs';
import {published} from '../lib/content/published.mjs';
import {digest} from '../lib/content/auth.mjs';
import {validateProduct} from '../lib/content/product.mjs';
import {renderTrain} from '../lib/content/render-train.mjs';
import template from '../lib/content/train-template.mjs';
const seed=JSON.parse(readFileSync(new URL('../content/products/baiyun.json',import.meta.url)));
async function setup(){
 const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../team/schema.sql',import.meta.url),'utf8'));
 const db={async batch(statements){return Promise.all(statements.map(s=>s.run()));},prepare(query){let values=[];return {bind(...v){values=v;return this;},async first(){return sql.prepare(query).get(...values)||null;},async all(){return {results:sql.prepare(query).all(...values)};},async run(){return sql.prepare(query).run(...values);}};}};
 const token=crypto.randomUUID()+crypto.randomUUID();sql.prepare('INSERT INTO login_sessions VALUES (?,?,?)').run(await digest(token),'owner@example.test',Date.now()+60000);
 const env={TEAM_DB:db,TEAM_ADMIN_EMAIL:'owner@example.test',TEAM_PUBLISH:'1',SITE_URL:'https://sukhatrip.com'};
 const call=(action,body,options={})=>(action==='members'?onMembers:onContent)({env,params:{action},request:new Request('https://sukhatrip.com/api/team/'+action,{method:body?'POST':'GET',headers:{Origin:options.origin||'https://sukhatrip.com','Content-Type':'application/json',...(options.anonymous?{}:{Cookie:'__Host-sukha-team='+token})},...(body?{body:JSON.stringify(body)}:{})})});
 const page=collection=>published({env,request:new Request('https://sukhatrip.com/silk-road-luxury-trains/baiyun/'),next:async()=>new Response(collection?'<article class="cruise-collection-card" id="baiyun">original card</article>':'original page')},collection);
 return {env,call,page,sql};
}
test('draft privacy, saved preview, publication and revision conflicts',async()=>{
 const {call,page}=await setup();
 assert.equal((await call('product',null,{anonymous:true})).status,401);
 const p=structuredClone(seed);p.title='Edited train';p.price={status:'from',currency:'CNY',amount:10000};
 assert.equal((await call('save',{product:p,revision:0},{origin:'https://evil.test'})).status,403);
 assert.equal((await call('save',{product:p,revision:0})).status,200);
 assert.equal(await (await page()).text(),'original page');
 assert((await (await call('preview')).text()).includes('Edited train'));
 assert.equal((await call('save',{product:p,revision:0})).status,409);
 assert.equal((await call('publish',{revision:0})).status,409);
 assert.equal((await call('publish',{revision:1})).status,200);
 assert((await (await page()).text()).includes('Edited train'));
 assert((await (await page(true)).text()).includes('From CNY 10,000 per person'));
 p.title='Not yet published';assert.equal((await call('save',{product:p,revision:2})).status,200);
 assert(!(await (await page()).text()).includes('Not yet published'));
});
test('invalid content and script-bearing fields',async()=>{
 const {call}=await setup();const p=structuredClone(seed);p.image.src='javascript:alert(1)';
 assert.throws(()=>validateProduct(p));assert.equal((await call('save',{product:p,revision:0})).status,400);
 p.image.src='/assets/trains/baiyun-salon.webp';p.title='<script>alert(1)</script>';p.description='A & B';
 validateProduct(p);const r=renderTrain(p,template,'https://sukhatrip.com');
 assert(!r.detail.includes('<script>alert(1)</script>'));assert(r.card.includes('&lt;script&gt;'));
 p.days=-1;assert.throws(()=>validateProduct(p));
});
test('preview environment cannot publish and save requires a current revision',async()=>{
 const {call,env}=await setup();env.TEAM_PUBLISH='0';
 assert.equal((await call('publish',{revision:0})).status,403);
 assert.equal((await call('save',{product:seed,revision:4})).status,409);
 assert.equal((await call('save',{product:seed,revision:0})).status,200);
 const [a,b]=await Promise.all([call('save',{product:seed,revision:1}),call('save',{product:seed,revision:1})]);
 assert.deepEqual([a.status,b.status].sort(),[200,409]);
});

test('member grants, least privilege and immediate revocation',async()=>{
 const {env,call,sql}=await setup();
 assert.equal((await call('members',null,{anonymous:true})).status,401);
 assert.equal((await call('members',{email:'staff@example.test',active:true})).status,200);
 assert.equal((await member('staff@example.test',env)).role,'editor');
 const listing=await (await call('members')).json();assert.equal(listing.members.length,1);
 assert.equal((await call('members',{email:'owner@example.test',active:false})).status,400);
 const token=crypto.randomUUID()+crypto.randomUUID();sql.prepare('INSERT INTO login_sessions VALUES (?,?,?)').run(await digest(token),'staff@example.test',Date.now()+60000);
 const invoke=(handler,action,body)=>handler({env,params:{action},request:new Request('https://sukhatrip.com/api/team/'+action,{method:body?'POST':'GET',headers:{Origin:'https://sukhatrip.com','Content-Type':'application/json',Cookie:'__Host-sukha-team='+token},...(body?{body:JSON.stringify(body)}:{})})});
 assert.equal((await invoke(onMembers,'members')).status,403);
 assert.equal((await invoke(onContent,'publish',{revision:0})).status,403);
 assert.equal((await invoke(onContent,'save',{revision:0,product:seed})).status,200);
 assert.equal((await call('members',{email:'staff@example.test',active:false})).status,200);
 assert.equal(await member('staff@example.test',env),null);
 assert.equal((await invoke(onContent,'product')).status,401);
 assert.equal((await call('members',{email:'staff@example.test',active:true})).status,200);
 assert.equal((await invoke(onContent,'product')).status,401);
});
