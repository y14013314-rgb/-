import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {cookieName,digest} from '../lib/content/auth.mjs';
import {videoUpload} from '../lib/content/video.mjs';

const origin='https://sukhatrip.com',uploadUrl='https://upload.imagekit.io/api/v2/files/upload';
const contentType='multipart/form-data; boundary=relay-test-boundary';
const resultUrl='https://ik.imagekit.io/negxem1l9/sukha-videos/test.mp4';

async function setup(t){
 const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../team/schema.sql',import.meta.url),'utf8'));
 t.after(()=>sql.close());
 const db={prepare(query){let values=[];return {bind(...v){values=v;return this;},async first(){return sql.prepare(query).get(...values)||null;},async run(){return sql.prepare(query).run(...values);}};}};
 const token=crypto.randomUUID()+crypto.randomUUID();
 sql.prepare('INSERT INTO login_sessions VALUES (?,?,?)').run(await digest(token),'owner@example.test',Date.now()+60000);
 const env={TEAM_DB:db,TEAM_ADMIN_EMAIL:'owner@example.test'};
 function request(options={}){
  const method=options.method||'POST';
  return new Request(origin+'/api/team/video-upload',{method,headers:{Origin:origin,'Content-Type':contentType,...(!options.anonymous?{Cookie:cookieName+'='+token}:{}),...options.headers},...(!['GET','HEAD'].includes(method)?{body:options.body===undefined?'multipart-test':options.body,duplex:'half'}:{})});
 }
 return {env,sql,request,call:options=>videoUpload({env,request:request(options)})};
}
function mockFetch(t,fn){const previous=globalThis.fetch;globalThis.fetch=fn;t.after(()=>{globalThis.fetch=previous;});}
async function drain(body){const reader=body.getReader();while(!(await reader.read()).done){};}

test('relay rejects missing sessions, foreign origins, unsupported methods and invalid media requests before forwarding',async t=>{
 const {call,env,request}=await setup(t);let forwarded=0;
 mockFetch(t,async()=>{forwarded++;throw new Error('Must not forward');});
 assert.equal((await videoUpload({env:{},request:request()})).status,503);
 assert.equal((await call({anonymous:true})).status,401);
 assert.equal((await call({headers:{Origin:'https://other.test'}})).status,403);
 assert.equal((await call({headers:{Origin:''}})).status,403);
 assert.equal((await call({method:'GET'})).status,405);
 assert.equal((await call({headers:{'Content-Type':'video/mp4'}})).status,415);
 assert.equal((await call({headers:{'Content-Type':'multipart/form-data'}})).status,415);
 assert.equal((await call({body:null})).status,415);
 assert.equal((await call({headers:{'Content-Length':'100000001'}})).status,413);
 assert.equal(forwarded,0);
});

test('relay streams multipart bytes and token unchanged without pre-reading or leaking client credentials',async t=>{
 const {env,request}=await setup(t),encoder=new TextEncoder();
 const chunks=[encoder.encode('--relay-test-boundary\r\nContent-Disposition: form-data; name="token"\r\n\r\nfixture.signed.token\r\n--relay-test-boundary\r\nContent-Disposition: form-data; name="file"; filename="test.mp4"\r\nContent-Type: video/mp4\r\n\r\n'),new Uint8Array([0,255,10,13,128,42]),encoder.encode('\r\n--relay-test-boundary--\r\n')];
 let pulls=0,forwarded=0;
 const stream=new ReadableStream({pull(controller){if(pulls<chunks.length)controller.enqueue(chunks[pulls++]);else controller.close();}},{highWaterMark:0});
 const incoming=request({body:stream,headers:{Authorization:'Bearer client-only',Cookie:request().headers.get('Cookie')+'; other=private'}});
 for(const method of ['formData','arrayBuffer','text','json'])incoming[method]=()=>{throw new Error('Request must not be buffered');};
 mockFetch(t,async(url,init)=>{
  forwarded++;assert.equal(url,uploadUrl);assert.equal(init.method,'POST');assert.equal(init.redirect,'manual');assert(init.signal instanceof AbortSignal);
  assert(pulls<chunks.length,'File was read before the upstream fetch began');
  const headers=new Headers(init.headers);assert.deepEqual([...headers.entries()],[['content-type',contentType]]);
  const bytes=new Uint8Array(await new Response(init.body).arrayBuffer());
  assert.deepEqual(bytes,new Uint8Array(Buffer.concat(chunks.map(chunk=>Buffer.from(chunk)))));
  return Response.json({url:resultUrl,fileId:'not-needed',other:'not-forwarded'});
 });
 const response=await videoUpload({env,request:incoming});assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.deepEqual(await response.json(),{url:resultUrl});assert.equal(forwarded,1);
});

test('relay enforces the per-user hourly limit without making an extra upload',async t=>{
 const {call}=await setup(t);let forwarded=0;
 mockFetch(t,async(url,init)=>{forwarded++;await drain(init.body);return Response.json({url:resultUrl});});
 for(let n=0;n<30;n++)assert.equal((await call()).status,200);
 assert.equal((await call()).status,429);assert.equal(forwarded,30);
});

test('relay rejects untrusted or malformed success URLs and never repeats the upload',async t=>{
 const {call}=await setup(t);let result,forwarded=0;
 mockFetch(t,async(url,init)=>{forwarded++;await drain(init.body);return Response.json(result);});
 for(const url of ['https://evil.test/video.mp4','https://ik.imagekit.io/another-account/video.mp4','https://ik.imagekit.io/negxem1l9/video.mp4" onload="bad','http://ik.imagekit.io/negxem1l9/video.mp4',null]){
  result={url};assert.equal((await call()).status,502);
 }
 assert.equal(forwarded,5);
});

test('relay exposes provider rejection status without retrying or forwarding upstream response content',async t=>{
 const {call}=await setup(t);let upstreamStatus=400,forwarded=0,canceled=0;
 mockFetch(t,async(url,init)=>{forwarded++;await drain(init.body);return new Response(new ReadableStream({cancel(){canceled++;}}),{status:upstreamStatus,headers:{'x-ik-requestid':'fixture-request','Set-Cookie':'provider-only=private'}});});
 const rejected=await call();assert.equal(rejected.status,502);assert.match((await rejected.json()).error,/HTTP 400/);assert.equal(rejected.headers.get('Set-Cookie'),null);
 upstreamStatus=413;assert.equal((await call()).status,413);
 upstreamStatus=302;assert.equal((await call()).status,502);
 assert.equal(forwarded,3);assert.equal(canceled,3);
});

test('relay returns an uncertain-result error after network failure or timeout and does not retry',async t=>{
 const {call}=await setup(t);let forwarded=0,error=new TypeError('Connection interrupted');
 mockFetch(t,async(url,init)=>{forwarded++;await drain(init.body);throw error;});
 const interrupted=await call();assert.equal(interrupted.status,502);assert.match((await interrupted.json()).error,/结果未确认/);
 error=new DOMException('Timed out','TimeoutError');const timedOut=await call();assert.equal(timedOut.status,502);assert.match((await timedOut.json()).error,/暂勿重复上传/);assert.equal(forwarded,2);
});

test('relay stops an oversized stream even when Content-Length is missing',async t=>{
 const {env,request}=await setup(t),chunk=new Uint8Array(1000000);let sent=0,forwarded=0,delivered=0,canceled=false;
 const stream=new ReadableStream({pull(controller){sent++;controller.enqueue(sent<=100?chunk:new Uint8Array([1]));},cancel(){canceled=true;}},{highWaterMark:0});
 const incoming=request({body:stream});assert.equal(incoming.headers.get('Content-Length'),null);
 mockFetch(t,async(url,init)=>{forwarded++;const reader=init.body.getReader();while(true){const part=await reader.read();if(part.done)break;delivered+=part.value.byteLength;}return Response.json({url:resultUrl});});
 const response=await videoUpload({env,request:incoming});assert.equal(response.status,413);assert.match((await response.json()).error,/99 MB/);assert.equal(forwarded,1);assert.equal(delivered,100000000);assert(canceled);
});
