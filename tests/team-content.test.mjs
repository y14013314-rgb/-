import {onRequest as trainCollectionRequest} from '../functions/silk-road-luxury-trains/index.js';
import {onRequest as sitemapRequest} from '../functions/sitemap.xml.js';
import {onRequest as destinationRequest} from '../functions/destinations/[slug].js';
import {onCatalogPage,catalogCollection,updateCards} from '../lib/content/catalog-published.mjs';
import {catalog,coverFor,galleryFor,validateContent,validateCatalogProduct,renderCatalogProduct,renderContent} from '../lib/content/catalog-product.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {upload,image,maxImageBytes} from '../lib/content/media.mjs';
import {videoAuth,maxVideoBytes,youtubeEmbedUrl} from '../lib/content/video.mjs';
import {onMembers} from '../lib/content/members.mjs';
import {member} from '../lib/content/auth.mjs';
import {onContent} from '../lib/content/content-api.mjs';
import {published} from '../lib/content/published.mjs';
import {cookieName,digest} from '../lib/content/auth.mjs';
import {validateProduct} from '../lib/content/product.mjs';
import {renderTrain} from '../lib/content/render-train.mjs';
import template from '../lib/content/train-template.mjs';
import {signatures} from '../lib/content/private-seed.mjs';
import {layoutApi} from '../lib/content/private-layout.mjs';
import {privateRequest} from '../lib/content/private-pages.mjs';
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
test('each product category supports adding, previewing, publishing and removing related products',async()=>{
 const {env,token}=await setup();
 const api=body=>layoutApi({env,request:new Request(env.SITE_URL+'/api/team/private-layout',{method:body?'POST':'GET',headers:{Origin:env.SITE_URL,Cookie:cookieName+'='+token,'Content-Type':'application/json'},body:body&&JSON.stringify(body)})});
 const {layout,tours}=await (await api()).json();
 const owners=[...new Map(Object.values(tours).map(item=>[item.group,item])).values()];
 assert.equal(owners.length,7);
 const related=Object.values(tours).find(item=>!owners.some(owner=>owner.id===item.id));
 layout.cardProducts=Object.fromEntries(owners.map(owner=>[owner.id,[related.id]]));
 const show=(owner,preview=false,auth=false)=>onCatalogPage({env,params:{slug:owner.id},request:new Request(env.SITE_URL+owner.href+(preview?'?card-preview=1':''),{headers:auth?{Cookie:cookieName+'='+token}:{}}),next:async()=>new Response('<main><h1>Test</h1></main>')},owner.id);
 assert.equal((await api({action:'save',layout,revision:0})).status,200);
 assert.equal((await show(owners[0],true)).status,401);
 assert(!(await (await show(owners[0])).text()).includes('Related journeys'));
 assert((await (await show(owners[0],true,true)).text()).includes(related.href));
 assert.equal((await api({action:'publish',revision:1})).status,200);
 for(const owner of owners)assert((await (await show(owner)).text()).includes(related.href));
 layout.cardProducts={};assert.equal((await api({action:'save',layout,revision:2})).status,200);
 assert.equal((await api({action:'publish',revision:3})).status,200);
 for(const owner of owners)assert(!(await (await show(owner)).text()).includes('Related journeys'));
});
test('guide galleries and individual experience images are editable in draft before publication',async()=>{
 const {env,token}=await setup(),origin=env.SITE_URL;
 const request=(path,body)=>new Request(origin+path,{method:body?'POST':'GET',headers:{Cookie:cookieName+'='+token,Origin:origin,'Content-Type':'application/json'},body:body&&JSON.stringify(body)});
 const api=body=>layoutApi({env,request:request('/api/team/private-layout',body)});
 const page=async(path,preview=false)=>(await privateRequest({env,request:request('/private-china-tours/'+path+'/'+(preview?'?layout-preview=1':''))})).text();
 const {layout}=await (await api()).json(),guide=layout.destinations.find(item=>item.id==='beijing'),style=layout.styles[0];
 layout.overviews.destinations.title='Updated overview';
 guide.hero={eyebrow:'Custom label',subtitle:'Custom subtitle',button:'Read our guide',back:'Back to destinations',storyTitle:'An edited story'};
 guide.experiences.forEach((card,index)=>{card.image=`/assets/experience-${index}.jpg`;});
 for(const item of [guide,style])item.extraPhotos=Array.from({length:9},(_,index)=>`/assets/tour-${index}.jpg`);
 guide.extraPhotos.push('/assets/too-many.jpg');assert.equal((await api({action:'save',layout,revision:0})).status,400);guide.extraPhotos.pop();
 guide.extraPhotos[0]='javascript:foo';assert.equal((await api({action:'save',layout,revision:0})).status,400);guide.extraPhotos[0]='/assets/first-extra.jpg';
 assert.equal((await api({action:'save',layout,revision:0})).status,200);
 assert.match(await page('destinations',true),/Updated overview/);
 assert.match(await page('destinations/beijing',true),/Read our guide/);
 assert.doesNotMatch(await page('destinations/beijing'),/Read our guide/);
 for(const path of ['destinations/beijing','travel-styles/'+style.id]){assert.match(await page(path,true),/1 \/ 10/);assert.doesNotMatch(await page(path),/1 \/ 10/);}
 assert.equal((await api({action:'publish',revision:1})).status,200);const live=await page('destinations/beijing');assert.match(live,/1 \/ 10/);
 for(const value of Object.values(guide.hero))assert(live.includes(value));
 assert.match(await page('destinations'),/Updated overview/);
 for(const card of guide.experiences)assert(live.includes(`src="${card.image}" alt="" loading="lazy"><strong>${card.title}</strong>`));
});
test('signature journeys support ten photos and omit the old tag and customization panel for saved products',async()=>{
 const {call}=await setup(),slug='icons-natural-wonders',edit=await (await call('product?slug='+slug)).json();assert.equal(edit.editor.signature,true);assert.equal(edit.editor.galleryLimit,10);
 const product=edit.product;product.heroButton='Explore my route';product.heroBack='All trips';product.galleryUnified=true;product.gallery=Array.from({length:10},(_,index)=>({src:`/assets/pic-${index}.jpg`,alt:'Photo',credit:'Source'}));
 product.gallery.push(product.gallery[0]);assert.equal((await call('save',{product,revision:0})).status,400);product.gallery.pop();product.signatureTag='City & nature';product.values.field9='Legacy planning title';product.values.field10='Legacy planning body';assert.equal((await call('save',{product,revision:0})).status,200);
 const preview=await (await call('preview?slug='+slug)).text();assert.match(preview,/1 \/ 10/);assert.doesNotMatch(preview,/class="trip-tags"|Customize this journey|Legacy planning/);assert.match(preview,/Journey highlights[\s\S]*?pt-route[\s\S]*?pt-ending/);assert(preview.indexOf('pic-0.jpg')<preview.indexOf('pic-9.jpg'));
 assert.match(preview,/Explore my route/);assert.match(preview,/All trips/);
 product.signatureTag='';assert.doesNotMatch(renderContent(product,'https://site.test'),/class="trip-tags"/);
 const classic=structuredClone(catalog['classic-china'].product);classic.gallery=[product.gallery[0]];const legacy=renderContent(classic,'https://site.test');assert.match(legacy,/1 \/ 2/);assert.match(legacy,/<button class="product-film-play"/);assert.match(legacy,/<figcaption>Photo: <a/);
});
test('classics-pandas-cities opens with route photos and retains only the photos saved by the editor',async()=>{
 const {call}=await setup(),slug='classics-pandas-cities';const load=async()=>(await call('product?slug='+slug)).json();
 const edit=await load();assert.deepEqual(edit.gallery.map(photo=>photo.alt),['Beijing','Xi’an','Chengdu & Sichuan','Chongqing','Shanghai']);assert.equal(edit.editor.galleryLimit,10);
 const custom={src:'/assets/custom-city.webp',alt:'Custom city',credit:''};edit.product.gallery=[custom,edit.gallery[2]];
 assert.equal((await call('save',{product:edit.product,revision:0})).status,200);assert.deepEqual((await load()).gallery,edit.product.gallery);
 const preview=await (await call('preview?slug='+slug)).text();assert.match(preview,/1 \/ 2/);assert.doesNotMatch(preview,/src="\/assets\/home-v1\/beijing.webp"/);
});
test('video upload authorization enforces sessions, origin, configuration, rate and signed restrictions',async()=>{
 const {env,token}=await setup();
 const call=(options={})=>videoAuth({env,request:new Request('https://sukhatrip.com/api/team/video-auth',{method:options.method||'POST',headers:{Origin:options.origin||'https://sukhatrip.com',...(options.anonymous?{}:{Cookie:'__Host-sukha-team='+token})}})});
 assert.equal((await call({anonymous:true})).status,401);
 assert.equal((await call({origin:'https://evil.test'})).status,403);
 assert.equal((await call({method:'GET'})).status,405);
 assert.equal((await call()).status,503);
 env.IMAGEKIT_PRIVATE_KEY='test-key-not-real';
 const r=await call(),v=await r.json();assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'no-store');
 const [header,payload,signature]=v.token.split('.'),p=JSON.parse(Buffer.from(payload,'base64url'));
 assert.equal(JSON.parse(Buffer.from(header,'base64url')).kid,'public_AwTSuxst7OTsYoBXsqHLDtLKIP4=');
 assert.equal(p.exp-p.iat,600);assert.match(p.fileName,/^[a-f0-9-]+\.mp4$/);assert.equal(p.folder,'/sukha-videos');
 assert.equal(p.checks,'"file.mime" IN ["video/mp4"] AND "file.size" > 0 AND "file.size" <= '+maxVideoBytes);
 assert.equal(p.overwriteFile,'false');assert.deepEqual(v.parameters,Object.fromEntries(Object.entries(p).filter(([k])=>!['iat','exp'].includes(k))));
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.IMAGEKIT_PRIVATE_KEY),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 assert(await crypto.subtle.verify('HMAC',key,Buffer.from(signature,'base64url'),new TextEncoder().encode(header+'.'+payload)));
 assert(!JSON.stringify(v).includes(env.IMAGEKIT_PRIVATE_KEY));
 assert.notEqual((await (await call()).json()).token,v.token);
 for(let i=2;i<30;i++)assert.equal((await call()).status,200);
 assert.equal((await call()).status,429);
});
test('catalog videos preserve templates until saved and published, including pages without video',async()=>{
 const {call,env}=await setup(),url='https://ik.imagekit.io/negxem1l9/C0642.MP4';
 for(const slug of ['chengdu','classic-china','homepage']){
  const p=structuredClone(catalog[slug].product),original=renderCatalogProduct(p,env.SITE_URL);p.videoUrl=url;validateCatalogProduct(p);
  assert.equal((await call('save',{product:p,revision:0})).status,200);
  const preview=await (await call('preview?slug='+slug)).text();assert(preview.includes(url));assert(!original.includes(url));
  const rowBefore=await env.TEAM_DB.prepare('SELECT published FROM product_content WHERE slug=?').bind(slug).first();assert.equal(rowBefore.published,null);
  assert.equal((await call('publish',{slug,revision:1})).status,200);
  const row=await env.TEAM_DB.prepare('SELECT published FROM product_content WHERE slug=?').bind(slug).first();assert(renderCatalogProduct(JSON.parse(row.published),env.SITE_URL).includes(url));
  p.videoUrl='javascript:alert(1)';assert.throws(()=>validateCatalogProduct(p));
  p.videoUrl='';validateCatalogProduct(p);assert(!renderCatalogProduct(p,env.SITE_URL).includes('<video'));
 }
 const p=structuredClone(seed);p.film.src=url;validateProduct(p);assert(renderTrain(p,template,env.SITE_URL).detail.includes(url));
});
test('YouTube links replace the existing snow leopard film after saving and publishing',async()=>{
 const {call,env}=await setup(),slug='wildlife-sanjiangyuan-snow-leopard';
 const p=structuredClone(catalog[slug].product),id='M7lc1UVf-VE',frame='https://www.youtube.com/embed/'+id;
 for(const url of ['https://www.youtube.com/watch?v='+id,'https://youtu.be/'+id+'?si=share','https://www.youtube.com/shorts/'+id,frame])assert.equal(youtubeEmbedUrl(url),frame);
 for(const url of ['https://youtube.com.evil.test/watch?v='+id,'javascript:alert(1)','https://youtube.com/watch?v=bad'])assert.equal(youtubeEmbedUrl(url),'');
 p.videoUrl='https://www.youtube.com/watch?v='+id;
 const original=renderCatalogProduct(catalog[slug].product,env.SITE_URL),old=original.match(/data-film-src="([^"]+)"/)[1];
 assert.equal((await call('save',{product:p,revision:0})).status,200);
 const preview=await (await call('preview?slug='+slug)).text();
 assert(preview.includes('data-film-frame="'+frame+'"'));assert(!preview.includes('data-film-src='));assert(!preview.includes(old));assert(!preview.includes('<video'));
 assert.equal((await env.TEAM_DB.prepare('SELECT published FROM product_content WHERE slug=?').bind(slug).first()).published,null);
 assert.equal((await call('publish',{slug,revision:1})).status,200);
 const live=await onCatalogPage({env,request:new Request(env.SITE_URL+catalog[slug].path),next:async()=>new Response(original)},slug);
 assert((await live.text()).includes('data-film-frame="'+frame+'"'));
 p.videoUrl='https://example.test/new.mp4';const mp4=renderCatalogProduct(p,env.SITE_URL);assert(mp4.includes('data-film-src="'+p.videoUrl+'"'));assert(!mp4.includes(old));assert(!mp4.includes('<video'));
 p.videoUrl='';assert(!renderCatalogProduct(p,env.SITE_URL).includes('data-film-title='));
 const home=structuredClone(catalog.homepage.product);home.videoUrl='https://youtu.be/'+id;assert(renderCatalogProduct(home,env.SITE_URL).includes('<iframe title="Product video" src="'+frame+'"'));
 const train=structuredClone(seed);train.film.src='https://youtu.be/'+id;assert(renderTrain(train,template,env.SITE_URL).detail.includes('<iframe title="Product video" src="'+frame+'"'));
});
test('destination additions continue the existing day list in preview and only go live after publication',async()=>{
 const {call,env}=await setup();
 const additions=[
  {title:'DAY 06 — Tashilhunpo & a return to Lhasa',description:'Visit the monastery.\nReturn to Lhasa.'},
  {title:'DAY 07 — Namtso & the northern plateau',description:'Explore the lake.'},
  {title:'Onward <travel>',description:'Keep <script>literal</script> & flexible.'},
 ];
 for(const entry of Object.values(catalog).filter(e=>e.category==='destinations')){
  const p=structuredClone(entry.product),before=renderCatalogProduct(p,env.SITE_URL);
  p.sections=[];assert.equal(renderCatalogProduct(p,env.SITE_URL),before);
  p.sections=structuredClone(additions);const html=renderCatalogProduct(p,env.SITE_URL),days=html.match(/<ol class="destination-days">([\s\S]*?)<\/ol>/)[1];
  assert(days.includes('<span>DAY 06</span><div><h3>Tashilhunpo &amp; a return to Lhasa</h3><p>Visit the monastery.<br>Return to Lhasa.</p>'));
  assert(days.includes('<span>DAY 07</span><div><h3>Namtso &amp; the northern plateau</h3>'));
  assert(days.includes('<span>DAY 08</span><div><h3>Onward &lt;travel&gt;</h3>'));
  assert(!html.includes('class="article-section"'));assert(!html.includes('<script>literal</script>'));
  assert.equal(html.split('Tashilhunpo &amp; a return to Lhasa').length,2);
  assert(html.indexOf('Namtso &amp; the northern plateau')<html.indexOf('destination-next'));
  if(p.slug==='destination-tibet'){
   assert.equal((await call('save',{product:p,revision:0})).status,200);
   const page=()=>onCatalogPage({env,request:new Request(env.SITE_URL+entry.path),next:async()=>new Response(before)},p.slug);
   assert.equal(await (await page()).text(),before);
   assert.equal(await (await call('preview?slug='+p.slug)).text(),html);
   assert.equal((await call('publish',{slug:p.slug,revision:1})).status,200);
   assert.equal(await (await page()).text(),html);
  }
  const numbered=p.sections.map(s=>s.title);assert.deepEqual(numbered,additions.map(s=>s.title));
 }
 const p=structuredClone(catalog['destination-tibet'].product);p.sections=[{title:'Extra day',description:'Continue exploring.'}];
 assert(renderCatalogProduct(p,env.SITE_URL).includes('<span>DAY 05</span><div><h3>Extra day</h3>'));
 p.sections=[{title:'DAY 06',description:'Continue exploring.'}];
 assert(renderCatalogProduct(p,env.SITE_URL).includes('<span>DAY 06</span><div><p>Continue exploring.</p>'));
 const other=structuredClone(catalog['wildlife-sanjiangyuan-snow-leopard'].product);other.sections=additions;
 assert(renderCatalogProduct(other,env.SITE_URL).includes('<article class="article-section"><h2>DAY 06 — Tashilhunpo &amp; a return to Lhasa</h2>'));
});
test('Yangzi Explorer merges uploaded and original photos only in the editor until saved',async()=>{
 const {call,sql,env}=await setup(),slug='yangzi-explorer';
 const product=structuredClone(catalog[slug].product),originals=galleryFor(product);
 product.gallery=[{src:'/assets/uploaded.webp',alt:'Uploaded',credit:''},{src:'https://www.sukhatrip.com'+originals[0].src,alt:'Retained',credit:''}];
 const legacy=JSON.stringify(product),publicPage=()=>onCatalogPage({env,request:new Request(env.SITE_URL+catalog[slug].path),next:async()=>new Response('original')},slug);
 sql.prepare('INSERT INTO product_content (slug,draft,published,revision,updated_by,updated_at) VALUES (?,?,?,1,?,?)').run(slug,legacy,legacy,'owner@example.test',Date.now());
 const before=await (await publicPage()).text(),edit=await (await call('product?slug='+slug)).json();
 assert.equal(edit.gallery.length,11);assert.equal(edit.gallery[0].src,product.gallery[0].src);assert.equal(edit.gallery[1].sourceIndex,0);assert.equal(edit.gallery[2].src,originals[1].src);
 assert.deepEqual(edit.product.gallery,product.gallery);assert.equal(edit.product.galleryUnified,undefined);
 assert.equal(sql.prepare('SELECT draft FROM product_content WHERE slug=?').get(slug).draft,legacy);
 assert(before.includes('More moments from this journey.'));
 edit.product.galleryUnified=true;edit.product.gallery=[edit.gallery[2],edit.gallery[0]];
 assert.equal((await call('save',{product:edit.product,revision:1})).status,200);
 const reopened=await (await call('product?slug='+slug)).json();
 assert.deepEqual(reopened.gallery,edit.product.gallery);assert.equal(coverFor(reopened.product),originals[1].src);
 assert.deepEqual(reopened.product.values,product.values);
 const preview=await (await call('preview?slug='+slug)).text();
 assert.equal((preview.match(/class="cruise-hero-slide"/g)||[]).length,2);
 assert(!preview.includes(originals[0].src));assert(!preview.includes('More moments from this journey.'));
 assert(preview.includes('property="og:image" content="'+env.SITE_URL+originals[1].src+'"'));
 assert.equal(await (await publicPage()).text(),before);
 assert.equal((await call('save',{product:{...reopened.product,gallery:[]},revision:2})).status,400);
 assert.equal((await call('publish',{slug,revision:2})).status,200);
 assert.equal(await (await publicPage()).text(),preview);
});
test('unified galleries replace original image slots without changing untouched page types',()=>{
 const entries=[seed,...Object.values(catalog).filter(entry=>['journeys','silk-road-luxury-trains','yangtze-river-cruises'].includes(entry.category)).map(entry=>entry.product)];
 for(const original of entries){
  const product=structuredClone(original),photos=galleryFor(product);
  assert(photos.length,original.slug);
  assert.equal(photos[0].src,coverFor(product),original.slug);
  product.galleryUnified=true;product.gallery=[{src:'/assets/new-cover.webp',alt:'',credit:''},{src:'/assets/second.webp',alt:'Second',credit:''}];
  validateContent(product);
  const html=renderContent(product,'https://sukhatrip.com'),main=html.match(/<main\b[\s\S]*?<\/main>/)[0];
  assert.deepEqual([...main.matchAll(/<img\b[^>]*src="([^"]*)"/g)].map(match=>match[1]),product.gallery.map(item=>item.src),original.slug);
  assert.equal((main.match(/<h1\b/g)||[]).length,1,original.slug);
 }
 const destination=structuredClone(catalog['destination-tibet'].product),gallery=[{src:'/assets/new-cover.webp',alt:'Photo',credit:''}];
 assert.equal(galleryFor(destination),null);
 destination.gallery=gallery;validateContent(destination);
 assert(renderContent(destination,'https://sukhatrip.com').includes('More moments from this journey.'));
 assert.throws(()=>validateContent({...destination,galleryUnified:true}));
});
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
  assert.throws(()=>validateProduct(p),/封面图片/);assert.equal((await call('save',{product:p,revision:0})).status,400);
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
 const read=(headers={})=>image({env,params:{id:url.split('/').pop()},request:new Request('https://sukhatrip.com'+url,{headers})});
 assert.equal((await read()).status,404);
 const editorImage=await read({Cookie:cookieName+'='+token});
 assert.equal(editorImage.status,200);assert.match(editorImage.headers.get('Cache-Control'),/private/);
 await env.TEAM_DB.prepare('INSERT INTO product_content (slug,draft,published,updated_by,updated_at) VALUES (?,?,?,?,?)').bind('photo-test','{}',JSON.stringify({image:url}),'editor',0).run();
 const served=await read();
 assert.equal(served.headers.get('Content-Type'),'image/webp');assert.deepEqual(new Uint8Array(await served.arrayBuffer()),new Uint8Array(bytes));
 const p=structuredClone(seed);p.image.src=url;validateProduct(p);
});

test('catalog products and homepage keep drafts separate and render escaped updates',async()=>{
 const {call}=await setup();assert.equal(Object.keys(catalog).length,35+signatures.length);
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
 const list=await (await call('products')).json();assert.equal(list.products.length,38+signatures.length);assert.deepEqual(list.products.filter(p=>p.category==='collection').map(p=>p.slug),['train-collection-page','cruise-collection-page']);assert(list.templates.every(p=>!['home','collection'].includes(p.category)));
});
test('new Baiyun-based product retains structured editing and its own URL',async()=>{
 const {call,env}=await setup();const slug='new-rail';assert.equal((await call('create',{slug,title:'New Rail',baseSlug:'baiyun'})).status,201);
 const item=await (await call('product?slug='+slug)).json();assert(item.product.itinerary);assert.equal((await call('save',{revision:1,product:item.product})).status,200);assert.equal((await call('publish',{slug,revision:2})).status,200);
 const page=await onCatalogPage({env,params:{slug},request:new Request('https://sukhatrip.com/silk-road-luxury-trains/'+slug+'/'),next:async()=>new Response('missing',{status:404})});assert.equal(page.status,200);assert((await page.text()).includes('New Rail'));
});
test('private journey editor moves a numbered legacy draft into the original day rows, route and tags',async()=>{
 const {call,env,sql}=await setup(),slug='nature-china',entry=catalog[slug],old=structuredClone(entry.product);
 const route=['Yushu','Longbao','Hashiu','Juela','Yushu'];old.values.field13=route.join(' · ');
 old.sections=[{title:'Note',description:'Keep this at the end'},...Array.from({length:7},(_,index)=>({title:`DAY 0${index+1} — New stop ${index+1}`,description:`Walk ${index+1}`}))];
 assert.equal((await call('save',{revision:0,product:old})).status,200);
 const form=await (await call('product?slug='+slug)).json();assert.deepEqual(form.product.journey.route,route);assert.equal(form.product.sections.length,1);assert.equal(form.product.journey.itinerary.length,7);
 const preview=async()=>await (await call('preview?slug='+slug)).text();let html=await preview();assert.match(html,/<span>7 days suggested<\/span>/);assert.equal((html.match(/<summary><span>DAY /g)||[]).length,7);assert.equal(html.split('New stop 1').length,2);assert.match(html,/<b>05<\/b>Yushu/);assert.match(html,/data-quote-days="7"/);assert.match(html,/Keep this at the end/);assert(!html.includes('<span>DAY 08')&&!html.includes('<b>01</b>Chengdu'));
 assert.equal(sql.prepare('SELECT published FROM product_content WHERE slug=?').get(slug).published,null);
 const {journey}=form.product;journey.itinerary.splice(1,1);journey.itinerary.reverse();journey.durationLabel='{days} days in the wild';journey.themeLabel='Birds & wildlife';journey.styleLabel='';journey.route=['Yushu','<return>'];journey.itinerary[0].description='Text <only>\nSecond line';
 assert.equal((await call('save',{revision:1,product:form.product})).status,200);assert.equal((await call('publish',{slug,revision:2})).status,200);
 const live=await onCatalogPage({env,params:{slug},request:new Request(env.SITE_URL+'/journeys/'+slug+'/'),next:()=>new Response('static')});html=await live.text();assert.equal(html,await preview());assert.match(html,/<span>6 days in the wild<\/span><span>Birds &amp; wildlife<\/span><\/div>/);assert.match(html,/<span>DAY 01<\/span> New stop 7/);assert.match(html,/Text &lt;only&gt;<br>Second line/);assert.match(html,/data-quote-destinations="Yushu · &lt;return&gt;" data-quote-days="6"/);
 journey.itinerary=[];assert.equal((await call('save',{revision:3,product:form.product})).status,400);
});
test('all destination and experience templates create independent editable, routable and reusable drafts',async()=>{
 const {call,env}=await setup(),list=await (await call('products')).json();
 const templates=list.templates.filter(item=>['destinations','experiences','signature-experiences','wildlife'].includes(item.category));assert.equal(templates.length,17);
 for(const base of templates){
  const source=await (await call('product?slug='+base.slug)).json(),name='new-'+source.url.split('/')[2],url=`/${base.category}/${name}/`;
  const create=()=>call('create',{baseSlug:base.slug,slug:name,title:'Independent travel idea'});
  assert.equal((await call('create',{baseSlug:base.slug,slug:source.url.split('/')[2],title:'Duplicate'})).status,400);
  const created=await create();assert.equal(created.status,201);const {slug}=await created.json();assert.equal((await create()).status,409);
  const item=await (await call('product?slug='+slug)).json();assert.equal(item.url,url);assert.equal(item.collectionPreviewUrl,null);assert.deepEqual(item.product.values,source.product.values);
  const {onRequest}=await import('../functions/'+base.category+'/[slug].js');const detail=()=>onRequest({env,params:{slug:name},request:new Request(env.SITE_URL+url),next:async()=>new Response('missing',{status:404})});
  assert.equal((await detail()).status,404);item.product.values.field0='Customized copy';assert.equal((await call('save',{product:item.product,revision:1})).status,200);
  const preview=await call('preview?slug='+slug);assert.equal(preview.status,200);assert((await preview.text()).includes('Customized copy'));assert.equal((await detail()).status,404);
  assert.equal((await call('publish',{slug,revision:2})).status,200);const live=await detail();assert.equal(live.status,200);const html=await live.text();assert(html.includes('rel="canonical" href="'+env.SITE_URL+url+'"'));assert(html.includes('Independent travel idea'));
  const updated=await (await call('product?slug='+base.slug)).json();assert.deepEqual(updated,source);
  const copy=await call('create',{baseSlug:slug,slug:name+'-again',title:'Another idea'});assert.equal(copy.status,201);
  const next=await (await call('product?slug='+(await copy.json()).slug)).json();assert.equal(next.url,url.slice(0,-1)+'-again/');assert.equal(next.product.values.field0,'Customized copy');
  assert.equal((await call('unpublish',{slug,revision:3})).status,200);assert.equal((await detail()).status,404);
 }
});
test('rail and cruise collection copy, breadcrumb and product cards are published independently',async()=>{
 const {call,env,token}=await setup(),railPath='/silk-road-luxury-trains/',cruisePath='/yangtze-river-cruises/';
 const listing=(path,search='',authorized=true)=>catalogCollection({env,request:new Request(env.SITE_URL+path+search,{headers:authorized?{Cookie:`${cookieName}=${token}`}:{}}),next:async()=>new Response(readFileSync(new URL('../public'+path+'index.html',import.meta.url),'utf8'))});
 const rail=await (await call('product?slug=train-collection-page')).json();
 const header=rail.editor.pageFields.find(field=>field.value==='different pace.');assert(header);
 assert.equal(rail.canUnpublish,false);
 rail.product.pageCopy={[header.key]:'A slower pace <test>.'};rail.product.backLabel='← Back to trains';
 assert.equal((await call('save',{product:rail.product,revision:0})).status,200);
 assert.equal((await call('preview?slug=train-collection-page')).headers.get('Location'),env.SITE_URL+railPath+'?team-preview=train-collection-page');
 assert.equal((await listing(railPath,'?team-preview=train-collection-page',false)).status,401);
 assert((await (await listing(railPath,'?team-preview=train-collection-page')).text()).includes('<em>A slower pace &lt;test&gt;.</em>'));
 assert(!(await (await listing(railPath)).text()).includes('A slower pace'));
 await call('publish',{slug:rail.product.slug,revision:1});
 assert((await (await listing(railPath)).text()).includes('A slower pace'));assert(!(await (await listing(cruisePath)).text()).includes('A slower pace'));
 const train=await (await call('product?slug=chengdu')).json();
 assert.equal(train.editor.card.eyebrow,'熊猫专列·成都号');assert.equal(train.editor.card.duration,'16 days · 2027');
 train.product.cardCopy={eyebrow:'New label',duration:'12 days · 2028',description:'New card description',route:'Chengdu · Xi’an',button:'Read more ↗',credit:'Licensed train photo',photo:'/assets/trains/baiyun-salon.webp'};
 train.product.breadcrumbTitle='Chengdu listing detail';
 assert.equal((await call('save',{product:train.product,revision:0})).status,200);
 const detail=await (await call('preview?slug=chengdu')).text();
 assert(detail.includes('href="/silk-road-luxury-trains/">← Back to trains</a><span>Chengdu listing detail</span>'));assert(!detail.includes('New card description'));
 assert(!(await (await listing(railPath)).text()).includes('New card description'));
 const preview=await (await listing(railPath,'?team-preview=chengdu')).text();
 for(const text of Object.values(train.product.cardCopy))assert(preview.includes(text),text);
 await call('publish',{slug:'chengdu',revision:1});assert((await (await listing(railPath)).text()).includes('New card description'));
 assert.equal((await call('unpublish',{slug:rail.product.slug,revision:2})).status,400);
});
test('route versions and day ranges retain existing text and support independent edits and photos',async()=>{
 const {call,env}=await setup();
 for(const slug of ['baiyun','chengdu','jinxiu-dongfang','jinxiu-tianfu']){
  const loaded=await (await call('product?slug='+slug)).json();assert(loaded.editor.plan.editions.length>=2);assert(loaded.editor.plan.itinerary.length>=5);
 }
 const slug='chengdu',loaded=await (await call('product?slug='+slug)).json(),{product,editor}=loaded;
 assert.deepEqual(editor.plan.editions.map(item=>item.title),['Autumn · 秋韵鎏境','Midsummer · 仲夏长卷']);
 const untouched=await (await call('preview?slug='+slug)).text(),day=editor.plan.itinerary[0],photo={src:'/assets/trains/baiyun-salon.webp',alt:'Lakeside & train',credit:'Licensed photo'};
 const removed=editor.plan.itinerary.pop(),summer=editor.plan.editions[1];
 product.plan={itinerary:[...editor.plan.itinerary.reverse(),{title:'Day 12 · Return',description:'Return journey',photo}],editions:[summer,{...editor.plan.editions[0],title:'Private autumn',ownItinerary:true,days:'12 days',route:'Chengdu → Kashgar',itinerary:[{title:'Days 1–3 · Mountain journey',description:'Private route',photo}]}]};
 product.introPhoto=photo;
 product.gallery=[{...photo,alt:''}];
 const button=editor.pageFields.find(field=>field.value==='Request a tailored quote ↗');product.pageCopy={[button.key]:'Ask about this itinerary ↗'};
 assert.equal((await call('save',{product,revision:0})).status,200);
 const saved=await (await call('product?slug='+slug)).json();assert.deepEqual(saved.product.plan,product.plan);assert.deepEqual(saved.product.values,loaded.product.values);
 const preview=await (await call('preview?slug='+slug)).text();
 assert(preview.indexOf(summer.title)<preview.indexOf('Private autumn'));assert(preview.includes('Days 1–3 · Mountain journey'));assert(preview.includes('12 days · Chengdu → Kashgar'));
 assert(!preview.includes(removed.title));assert(preview.includes(day.title));assert(preview.includes('Day 12 · Return'));
 assert.equal((preview.match(/class="product-inline-photo"/g)||[]).length,3);assert(preview.includes('Lakeside &amp; train'));assert(preview.includes('Ask about this itinerary ↗'));
 assert(!untouched.includes('Private autumn'));assert(!renderContent(catalog['jinxiu-tianfu'].product,env.SITE_URL).includes('Private route'));
 assert.equal((await call('save',{product:{...product,introPhoto:{...photo,src:'javascript:alert(1)'}},revision:1})).status,400);
 const cruise=await (await call('product?slug=yangzi-explorer')).json();assert.equal(cruise.editor.plan.voyages.length,6);
 cruise.product.plan=cruise.editor.plan;cruise.product.plan.voyages[0].itinerary=[{title:'Day 1 · Chongqing arrival',description:'Independent cruise itinerary',photo}];
 assert.equal((await call('save',{product:cruise.product,revision:0})).status,200);
 const cruisePreview=await (await call('preview?slug=yangzi-explorer')).text();assert(cruisePreview.includes('Day 1 · Chongqing arrival'));assert(cruisePreview.includes('data-explorer-route="downstream"'));
});

test('cruise cards, shore visits and page blocks stay independent per ship through preview and publication',async()=>{
 const {env,call}=await setup();const slug='aurora-layout-test';
 assert.equal((await call('create',{baseSlug:'yangzi-explorer',slug,title:'Test Aurora'})).status,201);
 const {product,editor,revision}=await (await call('product?slug='+slug)).json();product.plan=editor.plan;
 const first=product.plan.voyages[0],second=product.plan.voyages[1];product.plan.voyages=[second,{...first,id:'new-voyage',title:'New voyage'}];
 product.plan.shore=[{title:'Shore visit',description:'An editable note.'}];product.plan.blocks.film.visible=false;product.plan.blocks.intro.extra='Extra ship note';
 assert.equal((await call('save',{product,revision})).status,200);const preview=await (await call('preview?slug='+slug)).text();assert.equal((preview.match(/class="explorer-route"/g)||[]).length,2);assert(!preview.includes('data-explorer-route="downstream"'));assert(preview.indexOf(second.title)<preview.indexOf('New voyage'));assert(preview.includes('An editable note.'));assert(preview.includes('Extra ship note'));assert(!preview.includes('class="wrap section rail-film"'));
 assert.equal((await call('publish',{slug,revision:revision+1})).status,200);
 const live=await (await onCatalogPage({env,params:{slug},request:new Request(env.SITE_URL+'/yangtze-river-cruises/'+slug+'/'),next:async()=>new Response('fallback')})).text();assert(live.includes('data-explorer-route="new-voyage"'));
 product.plan.voyages=[];product.plan.blocks.shore.visible=false;assert.equal((await call('save',{product,revision:revision+2})).status,200);const empty=await (await call('preview?slug='+slug)).text();assert(!empty.includes('class="explorer-route"'));assert(!empty.includes('What to expect on shore'));assert(empty.includes('id="cruise-inquiry"'));
 for(const baseSlug of ['yangzi-explorer','century-legend','yangtze-miracle']){const data=await (await call('product?slug='+baseSlug)).json();assert(data.editor.plan.voyages.length>=2);assert(data.editor.plan.shore.length);assert.equal(data.editor.plan.shoreTitle,'What to expect on shore');assert(data.editor.plan.blocks.shore.visible);}
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

test('all destination pages are editable and isolated from train products and public drafts',async()=>{
 const {call,env}=await setup(),list=await (await call('products')).json();
 const slugs=readdirSync(new URL('../public/destinations/',import.meta.url),{withFileTypes:true}).filter(d=>d.isDirectory()).map(d=>d.name);
 const destinations=list.products.filter(p=>p.category==='destinations');assert.equal(destinations.length,11);
 assert.deepEqual(destinations.map(p=>p.slug).sort(),slugs.map(s=>'destination-'+s).sort());
 assert(destinations.every(p=>p.localName));assert.equal(list.templates.filter(p=>p.category==='destinations').length,destinations.length);
 assert(list.products.some(p=>p.slug==='chengdu'&&p.category==='silk-road-luxury-trains'));
 for(const slug of slugs){
  const id='destination-'+slug,item=await (await call('product?slug='+id)).json();
  assert.equal(item.url,'/destinations/'+slug+'/');assert.equal(item.product.placement,undefined);assert.equal(item.placements.length,0);
  assert.equal(item.canDelete,false);assert.equal(item.canUnpublish,true);assert(item.collectionPreviewUrl.endsWith('#'+slug));
  const page=(method='GET',tail='/')=>destinationRequest({env,params:{slug},request:new Request('https://sukhatrip.com/destinations/'+slug+tail,{method}),next:async()=>new Response('original '+slug)});
  item.product.title='Edited '+slug;
  assert.equal((await call('save',{product:item.product,revision:0})).status,200);
  assert.equal(await (await page()).text(),'original '+slug);
  const preview=await call('preview?slug='+id);assert.equal(preview.headers.get('X-Robots-Tag'),'noindex');assert((await preview.text()).includes('Edited '+slug));
  assert.equal((await call('publish',{slug:id,revision:1})).status,200);
  const live=await page(),html=await live.text();assert.equal(live.status,200);assert(html.includes('Edited '+slug));assert(!html.includes('{{CMS_'));
  assert(html.includes('https://sukhatrip.com/destinations/'+slug+'/'));assert(!html.includes('/destinations/destination-'));
  assert.equal((await page('HEAD')).body,null);assert.equal((await page('GET','')).status,301);
  assert.equal((await call('unpublish',{slug:id,revision:2})).status,200);assert.equal((await page()).status,404);
  assert.equal((await call('publish',{slug:id,revision:3})).status,200);assert.equal((await page()).status,200);
 }
 assert.equal((await call('create',{slug:'copy-destination',title:'Copy',baseSlug:'destination-tibet'})).status,201);
 const train=await (await call('product?slug=chengdu')).json();assert.equal(train.revision,0);assert.equal(train.product.title,catalog.chengdu.product.title);
});

test('destination collection preview, published cards and sitemap follow destination publication',async()=>{
 const {call,env,token}=await setup(),slug='destination-tibet',original=readFileSync(new URL('../public/private-china-tours/index.html',import.meta.url),'utf8');
 const item=await (await call('product?slug='+slug)).json();item.product.title='Tibet updated';item.product.values[catalog[slug].fields.find(f=>f.type==='image').key]='/assets/home-v1/yunnan.webp';
 await call('save',{product:item.product,revision:0});
 const collection=(preview=false,authorized=true)=>catalogCollection({env,request:new Request('https://sukhatrip.com/private-china-tours/'+(preview?'?team-preview='+slug:''),{headers:authorized?{Cookie:'__Host-sukha-team='+token}:{}}),next:async()=>new Response(original)});
 assert(!(await (await collection()).text()).includes('Tibet updated'));
 assert.equal((await collection(true,false)).status,401);
 const preview=await collection(true);assert.equal(preview.headers.get('X-Robots-Tag'),'noindex, nofollow');assert((await preview.text()).includes('Tibet updated'));
 await call('publish',{slug,revision:1});const live=await (await collection()).text();assert(live.includes('Tibet updated'));assert(live.includes('/destinations/inner-mongolia/'));
 const sitemap=()=>sitemapRequest({env,request:new Request('https://sukhatrip.com/sitemap.xml'),next:async()=>new Response('<urlset><url><loc>https://sukhatrip.com/destinations/tibet/</loc></url></urlset>')});
 assert((await (await sitemap()).text()).includes('/destinations/tibet/'));await call('unpublish',{slug,revision:2});
 assert(!(await (await collection()).text()).includes('href="/destinations/tibet/"'));assert(!(await (await sitemap()).text()).includes('/destinations/tibet/'));
 await call('publish',{slug,revision:3});assert((await (await collection()).text()).includes('Tibet updated'));
});

test('destination films use the existing play button and reject unsafe links and quote days',()=>{
 const entry=catalog['destination-tibet'],p=structuredClone(entry.product),field=type=>entry.fields.find(f=>f.type===type);
 p.videoUrl='https://ik.imagekit.io/negxem1l9/new.mp4';p.values[field('days').key]='9';validateCatalogProduct(p);
 const html=renderCatalogProduct(p,'https://sukhatrip.com');assert(html.includes('data-film-src="'+p.videoUrl+'"'));assert(html.includes('data-quote-days="9"'));assert(!html.includes('<video'));
 p.values[field('url').key]='javascript:alert(1)';assert.throws(()=>validateCatalogProduct(p),/HTTPS/);
 p.values[field('url').key]='https://example.test/film';p.values[field('days').key]='0';assert.throws(()=>validateCatalogProduct(p),/天数/);
 const routes=JSON.parse(readFileSync(new URL('../pages-dist/_routes.json',import.meta.url),'utf8'));assert(routes.include.includes('/destinations/*'));
});

test('all six experience pages publish at their original URLs and update themed cards',async()=>{
 const {call,env,token}=await setup(),list=await (await call('products')).json();
 const categories=['signature-experiences','experiences','wildlife'],pages=list.products.filter(p=>categories.includes(p.category));assert.equal(pages.length,6);
 assert.equal(list.templates.filter(p=>categories.includes(p.category)).length,pages.length);
 const original=readFileSync(new URL('../public/private-china-tours/index.html',import.meta.url),'utf8');
 for(const category of categories){
  const {onRequest}=await import('../functions/'+category+'/[slug].js');
  for(const p of pages.filter(p=>p.category===category)){
   const item=await (await call('product?slug='+p.slug)).json(),slug=item.url.split('/')[2];assert(item.collectionPreviewUrl.endsWith('#experiences'));
   item.product.title='Updated '+slug;await call('save',{product:item.product,revision:0});
   const page=()=>onRequest({env,params:{slug},request:new Request('https://sukhatrip.com'+item.url),next:async()=>new Response('original')});
   assert.equal(await (await page()).text(),'original');
   const collection=preview=>catalogCollection({env,request:new Request('https://sukhatrip.com/private-china-tours/'+(preview?'?team-preview='+p.slug:''),{headers:{Cookie:'__Host-sukha-team='+token}}),next:async()=>new Response(original)});
   assert((await (await collection(true)).text()).includes('Updated '+slug));assert(!(await (await collection(false)).text()).includes('Updated '+slug));
   await call('publish',{slug:p.slug,revision:1});assert((await (await page()).text()).includes('Updated '+slug));assert((await (await collection(false)).text()).includes('Updated '+slug));
   await call('unpublish',{slug:p.slug,revision:2});assert.equal((await page()).status,404);assert(!(await (await collection(false)).text()).includes('href="'+item.url+'"'));
   assert.equal((await call('create',{slug:'copy-'+slug,title:'Copy',baseSlug:p.slug})).status,201);
  }
 }
});
