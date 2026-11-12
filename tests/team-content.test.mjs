import {onRequest as trainCollectionRequest} from '../functions/silk-road-luxury-trains/index.js';
import {onRequest as sitemapRequest} from '../functions/sitemap.xml.js';
import {onCatalogPage,catalogCollection,updateCards} from '../lib/content/catalog-published.mjs';
import {catalog,validateCatalogProduct,renderCatalogProduct} from '../lib/content/catalog-product.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {upload,image,maxImageBytes} from '../lib/content/media.mjs';
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
 const call=(action,body,options={})=>(action==='members'?onMembers:onContent)({env,params:{action:action.split('?')[0]},request:new Request('https://sukhatrip.com/api/team/'+action,{method:body?'POST':'GET',headers:{Origin:options.origin||'https://sukhatrip.com','Content-Type':'application/json',...(options.anonymous?{}:{Cookie:'__Host-sukha-team='+token})},...(body?{body:JSON.stringify(body)}:{})})});
 const page=collection=>published({env,request:new Request('https://sukhatrip.com/silk-road-luxury-trains/baiyun/'),next:async()=>new Response(collection?'<article class="cruise-collection-card" id="baiyun">original card</article>':'original page')},collection);
 return {env,call,page,sql,token};
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

test('member grants, self-publication and immediate revocation',async()=>{
 const {env,call,sql}=await setup();
 assert.equal((await call('members',null,{anonymous:true})).status,401);
 assert.equal((await call('members',{email:'staff@example.test',active:true})).status,200);
 assert.equal((await member('staff@example.test',env)).role,'editor');
 const listing=await (await call('members')).json();assert.equal(listing.members.length,1);
 assert.equal((await call('members',{email:'owner@example.test',active:false})).status,400);
 const token=crypto.randomUUID()+crypto.randomUUID();sql.prepare('INSERT INTO login_sessions VALUES (?,?,?)').run(await digest(token),'staff@example.test',Date.now()+60000);
 const invoke=(handler,action,body)=>handler({env,params:{action:action.split('?')[0]},request:new Request('https://sukhatrip.com/api/team/'+action,{method:body?'POST':'GET',headers:{Origin:'https://sukhatrip.com','Content-Type':'application/json',Cookie:'__Host-sukha-team='+token},...(body?{body:JSON.stringify(body)}:{})})});
 assert.equal((await invoke(onMembers,'members')).status,403);
 assert.equal((await (await invoke(onContent,'product')).json()).canPublish,true);
 assert.equal((await invoke(onContent,'publish',{revision:0})).status,409);
 assert.equal((await invoke(onContent,'save',{revision:0,product:seed})).status,200);
 assert.equal((await invoke(onContent,'publish',{revision:1})).status,200);
 assert.equal((await call('members',{email:'staff@example.test',active:false})).status,200);
 assert.equal(await member('staff@example.test',env),null);
 assert.equal((await invoke(onContent,'product')).status,401);
 assert.equal((await call('members',{email:'staff@example.test',active:true})).status,200);
 assert.equal((await invoke(onContent,'product')).status,401);
});

test('image upload permission, byte limits and public image response',async()=>{
 const {env,token}=await setup();const bytes=readFileSync(new URL('../public/assets/trains/baiyun-salon.webp',import.meta.url));
 const send=(body,options={})=>upload({env,request:new Request('https://sukhatrip.com/api/team/upload',{method:'POST',headers:{Origin:options.origin||'https://sukhatrip.com','Content-Type':'image/webp',...(options.anonymous?{}:{Cookie:'__Host-sukha-team='+token})},body})});
 assert.equal((await send(bytes,{anonymous:true})).status,401);
 assert.equal((await send(bytes,{origin:'https://evil.test'})).status,403);
 assert.equal((await send(new Uint8Array(maxImageBytes+1))).status,413);
 assert.equal((await send(new TextEncoder().encode('<script>alert(1)</script>'))).status,400);
 const r=await send(bytes);assert.equal(r.status,200);const {url}=await r.json();
 const served=await image({env,params:{id:url.split('/').pop()},request:new Request('https://sukhatrip.com'+url)});
 assert.equal(served.headers.get('Content-Type'),'image/webp');assert.deepEqual(new Uint8Array(await served.arrayBuffer()),new Uint8Array(bytes));
 const p=structuredClone(seed);p.image.src=url;validateProduct(p);
});

test('catalog products and homepage keep drafts separate and render escaped updates',async()=>{
 const {call}=await setup();assert.equal(Object.keys(catalog).length,18);
 for(const [slug,e] of Object.entries(catalog)){
  const p=structuredClone(e.product);validateCatalogProduct(p);p.title='Edited '+slug;
  const text=e.fields.find(f=>f.type==='text');p.values[text.key]='<script>unsafe</script>';
  const html=renderCatalogProduct(p,'https://sukhatrip.com');assert(html.includes('Edited '+slug));assert(!html.includes('<script>unsafe</script>'));assert(!html.includes('{{CMS_'));
  assert.equal((await call('save',{product:p,revision:0})).status,200);
  assert.equal((await call('publish',{slug,revision:1})).status,200);
 }
 assert.equal((await call('save',{product:{slug:'unlisted'},revision:0})).status,404);
});

test('published catalog name updates matching collection card only',()=>{
 const e=catalog['chengdu'],p=structuredClone(e.product);p.title='New & Name';
 const html='<article><a href="'+e.path+'">Photo</a><h2>Old name</h2></article><article><h2>Other product</h2></article>';
 const result=updateCards(html,[{slug:p.slug,published:JSON.stringify(p)}]);assert(result.includes('<h2>New &amp; Name</h2>'));assert(result.includes('<h2>Other product</h2>'));
});

test('create, publish, feature, unpublish and relaunch a new private journey',async()=>{
 const {call,env}=await setup();const slug='new-family-journey';
 assert.equal((await call('create',{slug,title:'Family Journey',baseSlug:'classic-china'})).status,201);
 assert.equal((await call('create',{slug,title:'Duplicate',baseSlug:'classic-china'})).status,409);
 assert.equal((await call('create',{slug:'invalid-template',title:'Bad',baseSlug:'homepage'})).status,400);
 let item=await (await call('product?slug='+slug)).json();assert.equal(item.product.templateSlug,'classic-china');assert.equal(item.url,'/journeys/'+slug+'/');
 const page=()=>onCatalogPage({env,params:{slug},request:new Request('https://sukhatrip.com/journeys/'+slug+'/'),next:async()=>new Response('missing',{status:404})});
 assert.equal((await page()).status,404);
 item.product.featured=true;item.product.sections=[{title:'Day 20',description:'Additional touring day <safe>'}];assert.equal((await call('save',{product:item.product,revision:1})).status,200);
 assert.equal((await call('publish',{slug,revision:2})).status,200);
 const live=await page();assert.equal(live.status,200);const html=await live.text();assert(html.includes('Family Journey'));assert(html.includes('Additional touring day &lt;safe&gt;'));assert(html.includes('https://sukhatrip.com/journeys/'+slug+'/'));
 const collection=path=>catalogCollection({env,request:new Request('https://sukhatrip.com'+path),next:async()=>new Response('<main><section id="itineraries"><div id="journey-results"></div></section></main>',{headers:{'Content-Type':'text/html'}})});
 assert((await (await collection('/private-china-tours/')).text()).includes('/journeys/'+slug+'/'));
 assert((await (await collection('/')).text()).includes('/journeys/'+slug+'/'));
 const sitemap=()=>sitemapRequest({env,request:new Request('https://sukhatrip.com/sitemap.xml'),next:async()=>new Response('<urlset></urlset>')});
 assert((await (await sitemap()).text()).includes('/journeys/'+slug+'/'));
 assert.equal((await call('unpublish',{slug,revision:3})).status,200);assert.equal((await page()).status,404);
 assert(!(await (await collection('/private-china-tours/')).text()).includes('/journeys/'+slug+'/'));
 assert(!(await (await sitemap()).text()).includes('/journeys/'+slug+'/'));
 assert.equal((await call('publish',{slug,revision:4})).status,200);assert.equal((await page()).status,200);
});
test('existing products can be withdrawn without erasing drafts and homepage stays available',async()=>{
 const {call,env}=await setup();assert.equal((await call('unpublish',{slug:'chengdu',revision:0})).status,200);
 const item=await (await call('product?slug=chengdu')).json();assert.equal(item.hidden,true);assert(item.product.title);
 const page=await onCatalogPage({env,params:{slug:'chengdu'},request:new Request('https://sukhatrip.com/silk-road-luxury-trains/chengdu/'),next:async()=>new Response('existing content')});assert.equal(page.status,404);
 assert.equal((await call('unpublish',{slug:'homepage',revision:0})).status,400);
 const home=await (await call('product?slug=homepage')).json();assert(home.fields.length>0);assert.equal(home.canUnpublish,false);
 assert.equal((await call('save',{product:home.product,revision:0})).status,200);assert.equal((await call('publish',{slug:'homepage',revision:1})).status,200);
 const list=await (await call('products')).json();assert.equal(list.products.length,19);assert(list.templates.every(p=>p.slug!=='homepage'));
});
test('new Baiyun-based product retains structured editing and its own URL',async()=>{
 const {call,env}=await setup();const slug='new-rail';assert.equal((await call('create',{slug,title:'New Rail',baseSlug:'baiyun'})).status,201);
 const item=await (await call('product?slug='+slug)).json();assert(item.product.itinerary);assert.equal((await call('save',{revision:1,product:item.product})).status,200);assert.equal((await call('publish',{slug,revision:2})).status,200);
 const page=await onCatalogPage({env,params:{slug},request:new Request('https://sukhatrip.com/silk-road-luxury-trains/'+slug+'/'),next:async()=>new Response('missing',{status:404})});assert.equal(page.status,200);assert((await page.text()).includes('New Rail'));
});

test('delete removes only unpublished or withdrawn custom records and rejects stale requests',async()=>{
 const {call,env}=await setup();const slug='delete-test';
 assert.equal((await call('delete',{slug:'baiyun',revision:0})).status,400);
 assert.equal((await call('delete',{slug:'homepage',revision:0})).status,400);
 assert.equal((await call('create',{slug,title:'Delete test',baseSlug:'classic-china'})).status,201);
 const item=await (await call('product?slug='+slug)).json();assert.equal(item.canDelete,true);
 assert.equal((await call('delete',{slug,revision:0})).status,409);
 assert.equal((await call('publish',{slug,revision:1})).status,200);
 assert.equal((await call('delete',{slug,revision:2})).status,409);
 assert.equal((await call('unpublish',{slug,revision:2})).status,200);
 assert.equal((await call('delete',{slug,revision:2})).status,409);
 env.TEAM_PUBLISH='0';assert.equal((await call('delete',{slug,revision:3})).status,403);env.TEAM_PUBLISH='1';
 assert.equal((await call('delete',{slug,revision:3}, {anonymous:true})).status,401);
 assert.equal((await call('delete',{slug,revision:3}, {origin:'https://evil.test'})).status,403);
 assert.equal((await call('delete',{slug,revision:3})).status,200);
 assert.equal((await call('product?slug='+slug)).status,404);
 const list=await (await call('products')).json();assert(!list.products.some(p=>p.slug===slug));
 assert.equal((await call('create',{slug:'draft-delete',title:'Draft',baseSlug:'baiyun'})).status,201);
 assert.equal((await call('delete',{slug:'draft-delete',revision:1})).status,200);
});

test('publication placement moves cards between real sections without changing detail URLs',async()=>{
 const {call,env}=await setup(),slug='choose-location';
 await call('create',{slug,title:'Placement <safe>',baseSlug:'classic-china'});
 let item=await (await call('product?slug='+slug)).json();
 assert.equal(item.product.placement,'itineraries');assert.equal(item.placements.length,4);
 const source=readFileSync(new URL('../public/private-china-tours/index.html',import.meta.url),'utf8');
 const collection=async()=>await (await catalogCollection({env,request:new Request('https://sukhatrip.com/private-china-tours/'),next:async()=>new Response(source)})).text();
 for(const location of ['destinations','itineraries','experiences','more']){
  item.product.placement=location;
  const before=await collection();
  const saved=await (await call('save',{product:item.product,revision:item.revision})).json();
  assert.equal(await collection(),before,'saving a draft must not move the live card');
  const published=await (await call('publish',{slug,revision:saved.revision})).json();item.revision=published.revision;
  const html=await collection(),path='/journeys/'+slug+'/';
  if(location==='more')assert(html.slice(html.indexOf('More journeys to discover.')).includes(path));
  else{const start=html.indexOf('id="'+location+'"'),end=html.indexOf('</section>',start);assert(html.slice(start,end).includes(path));assert(!html.slice(end).includes(path));}
  assert(html.includes('Placement &lt;safe&gt;'));assert.equal((await (await call('product?slug='+slug)).json()).url,path);
 }
 item.product.placement='collection';assert.equal((await call('save',{product:item.product,revision:item.revision})).status,400);
 item.product.placement='destinations';const saved=await (await call('save',{product:item.product,revision:item.revision})).json();await call('publish',{slug,revision:saved.revision});item=await (await call('product?slug='+slug)).json();await call('unpublish',{slug,revision:item.revision});assert(!(await collection()).includes('/journeys/'+slug+'/'));
});

test('existing placements stay unchanged and rail products can choose the main collection',async()=>{
 const {call,env}=await setup();
 const existing=await (await call('product?slug=classic-china')).json();assert.equal(existing.product.placement,'original');
 const source=readFileSync(new URL('../public/private-china-tours/index.html',import.meta.url),'utf8');
 existing.product.placement='destinations';let saved=await (await call('save',{product:existing.product,revision:existing.revision})).json();await call('publish',{slug:'classic-china',revision:saved.revision});
 const html=await (await catalogCollection({env,request:new Request('https://sukhatrip.com/private-china-tours/'),next:async()=>new Response(source)})).text();
 const start=html.indexOf('id="destinations"'),end=html.indexOf('</section>',start);assert(html.slice(start,end).includes('/journeys/classic-china/'));assert(!html.slice(end).includes('/journeys/classic-china/'));
 await call('create',{slug:'rail-location',title:'Rail placement',baseSlug:'baiyun'});const rail=await (await call('product?slug=rail-location')).json();assert.equal(rail.product.placement,'collection');assert.deepEqual(rail.placements.map(x=>x.value),['collection','more']);saved=await (await call('save',{product:rail.product,revision:rail.revision})).json();await call('publish',{slug:rail.product.slug,revision:saved.revision});
 const railHtml=await (await catalogCollection({env,request:new Request('https://sukhatrip.com/silk-road-luxury-trains/'),next:async()=>new Response(readFileSync(new URL('../public/silk-road-luxury-trains/index.html',import.meta.url),'utf8'))})).text();const a=railHtml.indexOf('id="train-collection"'),b=railHtml.indexOf('</section>',a);assert(railHtml.slice(a,b).includes('/silk-road-luxury-trains/rail-location/'));assert(!railHtml.includes('More journeys to discover.'));
});

test('authenticated collection preview shows saved placement without publishing or leaking other drafts',async()=>{
 const {call,env,token,sql}=await setup();
 await call('create',{slug:'preview-location',title:'Saved preview only',baseSlug:'classic-china'});
 await call('create',{slug:'private-other',title:'Other private draft',baseSlug:'classic-china'});
 let item=await (await call('product?slug=preview-location')).json();item.product.placement='destinations';
 const saved=await (await call('save',{product:item.product,revision:item.revision})).json();
 item=await (await call('product?slug=preview-location')).json();assert.equal(item.collectionPreviewUrl,'/private-china-tours/?team-preview=preview-location#destinations');
 const source=readFileSync(new URL('../public/private-china-tours/index.html',import.meta.url),'utf8');
 const render=(query='',authorized=true)=>catalogCollection({env,request:new Request('https://sukhatrip.com/private-china-tours/'+query,{headers:authorized?{Cookie:'__Host-sukha-team='+token}:{}}),next:async()=>new Response(source)});
 const before=sql.prepare('SELECT * FROM product_content').all();
 assert.equal((await render('?team-preview=preview-location',false)).status,401);
 const preview=await render('?team-preview=preview-location');assert.equal(preview.headers.get('X-Robots-Tag'),'noindex, nofollow');assert.match(preview.headers.get('Cache-Control'),/private, no-store/);
 const html=await preview.text(),start=html.indexOf('id="destinations"'),end=html.indexOf('</section>',start);
 assert(html.includes('草稿位置预览'));assert(html.slice(start,end).includes('Saved preview only'));assert(html.includes('/api/team/preview?slug=preview-location'));assert(!html.includes('Other private draft'));assert(!(await (await render()).text()).includes('Saved preview only'));assert.deepEqual(sql.prepare('SELECT * FROM product_content').all(),before);
 await call('unpublish',{slug:'preview-location',revision:saved.revision});assert((await (await render('?team-preview=preview-location')).text()).includes('Saved preview only'));
 assert.equal((await render('?team-preview=missing')).status,404);
});

test('withdrawn built-in Baiyun can preview its original collection position',async()=>{
 const {call,env,token}=await setup();let item=await (await call('product?slug=baiyun')).json();item.product.title='Hidden train draft';let saved=await (await call('save',{product:item.product,revision:0})).json();await call('unpublish',{slug:'baiyun',revision:saved.revision});
 const result=await trainCollectionRequest({env,request:new Request('https://sukhatrip.com/silk-road-luxury-trains/?team-preview=baiyun',{headers:{Cookie:'__Host-sukha-team='+token}}),next:async()=>new Response(readFileSync(new URL('../public/silk-road-luxury-trains/index.html',import.meta.url),'utf8'))});assert((await result.text()).includes('Hidden train draft'));assert.equal(result.headers.get('X-Robots-Tag'),'noindex, nofollow');
});
