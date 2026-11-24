import {catalog,entryFor,pathFor,coverFor} from './catalog-product.mjs';
import {initialLayout,regions,facets,signatures} from './private-seed.mjs';
import {journeyEditor} from './journey-days.mjs';
import {pageDefaults,guidePlanDefaults,validEditorial} from './private-editorial.mjs';
import {response,session} from './auth.mjs';
const layoutKey='@private-tours-layout';
const overviewDefaults={
 destinations:{title:'Explore China',intro:'Discover China’s destinations, from classic stops to lesser-known places.',popular:'Popular Destinations',deep:'Beyond the Classics',region:'Explore by Region'},
 'travel-styles':{title:'Travel Beyond the Ordinary',intro:'Explore China through the experiences that inspire you.',themes:'Travel Styles'},
 'signature-journeys':{title:'Your Journey Through China Starts Here',intro:'Every journey is a starting point, not a fixed itinerary.',collections:'Choose Your Kind of Journey',journeys:'Explore Our Signature Journeys'}
};
const themePlaces={hiking:['zhangjiajie','yunnan'],wildlife:['chengdu','inner-mongolia'],heritage:['beijing','xian'],food:['chengdu','chongqing'],'ancient-routes':['gansu','xinjiang'],offbeat:['xinjiang','yunnan']};
const heroKeys=['eyebrow','subtitle','back','button','storyTitle'];
const validId=value=>typeof value==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)&&value.length<=82&&!Object.hasOwn(Object.prototype,value);
const text=(value,max=250)=>typeof value==='string'&&value.length<=max;
const picture=value=>text(value,1200)&&(!value||/^(?:\/(?:assets|media)\/|https:\/\/)[^"'<>\\\s]+$/.test(value));
const list=(value,predicate)=>Array.isArray(value)&&value.every(predicate);
const order=value=>list(value,validId)&&new Set(value).size===value.length;
const storyKeys=['eyebrow','title','body','tag1','tag2'];
const validStory=story=>story&&storyKeys.every(key=>text(story[key],5000));
function defaultStory(item,product){
 const entry=product&&entryFor(product),values=product?.values;
 if(values){
  const tags=entry.template.match(/class="destination-facts">([\s\S]*?)<\/div>/)?.[1]||'';
  const [tag1='',tag2='']=[...tags.matchAll(/\{\{CMS_(field\d+)\}\}/g)].map(match=>values[match[1]]||'');
  return {eyebrow:values.field3,title:values.field4,body:values.field5,tag1,tag2};
 }
 const descriptions={guizhou:'Take a village walk, then leave time to look at the timber architecture and local crafts of Dong and Miao communities.',gansu:'Follow the Hexi Corridor from Zhangye through Jiayuguan to Dunhuang. Allow time between stops to see how the landscape changes along the Silk Road.',shanxi:'Look closely at the carvings at Yungang before walking through Pingyao. The grottoes and the walled town offer two very different ways to read Shanxi’s history.',henan:'Spend time with the carvings at the Longmen Grottoes, then explore Luoyang or include a visit connected with Shaolin culture.',ningxia:'Pair a visit to Western Xia heritage sites with time in the vineyards at the foot of the Helan Mountains.',northeast:'Shape your route around the season: winter brings a different side of Harbin, while warmer months open up more time to explore Changbai Mountain.',jiangnan:'Take a garden walk in Suzhou, explore Hangzhou’s tea country and leave time to follow the canals of a water town on foot.'};
 return {eyebrow:'A SENSE OF PLACE',title:`Discover ${item.title}`,body:descriptions[item.id]||item.intro||'',tag1:'',tag2:''};
}
export function validLayout(layout){
 if(!layout||typeof layout!=='object'||!order(layout.featuredExperiences))return false;
 if(layout.cardProducts!==undefined&&(!layout.cardProducts||typeof layout.cardProducts!=='object'||Array.isArray(layout.cardProducts)||!Object.entries(layout.cardProducts).every(([id,ids])=>validId(id)&&order(ids)&&!ids.includes(id))))return false;
 if(layout.overviews&&Object.values(layout.overviews).some(value=>!validEditorial(value?.editorial)))return false;
 if(layout.overviews!==undefined&&!Object.entries(overviewDefaults).every(([area,defaults])=>Object.keys(defaults).every(key=>text(layout.overviews?.[area]?.[key],1000))))return false;
 for(const key of ['destinations','styles','collections']){
  if(!list(layout[key],item=>item&&validId(item.id)&&text(item.title)&&item.title.trim()&&picture(item.image)&&order(item.tours)))return false;
  if(!order(layout[key].map(item=>item.id)))return false;
  if(!layout[key].every(item=>validEditorial(item.editorial)))return false;
  if(!layout[key].every(item=>item.hero===undefined||heroKeys.every(key=>item.hero?.[key]===undefined||text(item.hero[key],1000))))return false;
  if(key!=='collections'&&!layout[key].every(item=>item.extraPhotos===undefined||list(item.extraPhotos,src=>src&&picture(src))&&item.extraPhotos.length<=9&&(!item.extraPhotos.length||item.image)))return false;
  if(key!=='collections'&&!layout[key].every(item=>text(item.intro,4000)&&list(item.experiences,exp=>exp&&text(exp.title)&&exp.title.trim()&&picture(exp.image))))return false;
  if(key==='destinations'&&!layout[key].every(item=>regions.includes(item.region)&&text(item.season,2000)&&(item.story===undefined||validStory(item.story))))return false;
 }
 for(const [keys,records] of [[['first','second','more'],null],[['popular','deep','other'],'destinations'],[['themes'],'styles'],[['series'],'collections']]){
  if(!keys.every(key=>order(layout[key])))return false;
  const ids=keys.flatMap(key=>layout[key]);if(!order(ids)||records&&!ids.every(id=>layout[records].some(item=>item.id===id)))return false;
 }
 if(!layout.tags||typeof layout.tags!=='object'||Array.isArray(layout.tags))return false;
 return Object.entries(layout.tags).every(([id,tags])=>validId(id)&&tags&&Object.entries(facets).every(([key,options])=>list(tags[key],tag=>options.includes(tag))));
}
function productCards(rows){
 const categories={journeys:'私人行程',destinations:'目的地行程',wildlife:'野生动物',experiences:'城市体验','signature-experiences':'主题体验','silk-road-luxury-trains':'列车','yangtze-river-cruises':'游轮'};
 const products=new Map([entryFor('baiyun'),...Object.values(catalog)].filter(entry=>categories[entry.category]).map(entry=>[entry.product.slug,entry.product]));
 for(const row of rows){if(row.is_hidden){products.delete(row.slug);continue;}if(!row.published||row.slug===layoutKey)continue;const product=JSON.parse(row.published);if(categories[entryFor(product)?.category])products.set(row.slug,product);}
 const tours=Object.fromEntries([...products].map(([id,product])=>{const entry=entryFor(product),seed=signatures.find(row=>row[0]===(product.templateSlug||id)),journey=product.journey||(product.sections?.length?journeyEditor(product,entry)?.journey:null);return [id,{id,title:product.cardCopy?.title||product.title,group:categories[entry.category],localName:product.templateSlug?'':entry.localName||'',image:product.cardCopy?.photo||coverFor(product),href:pathFor(product),summary:seed?product.values?.field2:'',days:seed?'':journey?.itinerary.length||product.days||entry.template?.match(/data-quote-days="(\d+)"/)?.[1]||''}];}));
 return {products,tours};
}
export async function privateState(db,edit=false){
 const rows=db?(await db.prepare('SELECT slug,published,is_hidden FROM product_content').all()).results:[];
 const row=edit&&db?await db.prepare('SELECT draft,revision FROM product_content WHERE slug=?').bind(layoutKey).first():null;
 return stateFromRows(rows,row,edit);
}
export function stateFromRows(rows,row=null,edit=false){
 const json=row?.draft||rows.find(item=>item.slug===layoutKey)?.published;
 const layout=json?JSON.parse(json):initialLayout();
 const defaults=initialLayout();
 const {products,tours}=productCards(rows);
 layout.overviews=Object.fromEntries(Object.entries(overviewDefaults).map(([key,defaults])=>[key,{...defaults,...layout.overviews?.[key]}]));
 for(const item of layout.styles){
  if(!item.image||item.extraPhotos!==undefined)continue;
  const places=(themePlaces[item.id]||[]).map(id=>layout.destinations.find(place=>place.id===id)?.image);
  item.extraPhotos=[...new Set(places.filter(src=>src&&src!==item.image))];
 }
 for(const item of layout.destinations){
  const seed=defaults.destinations.find(entry=>entry.id===item.id);
  if(seed?.editorial)item.editorial={...seed.editorial,...item.editorial};
  item.story??=defaultStory(item,products.get('destination-'+item.id));
 }
 if(!edit){const hidden=new Set(rows.filter(item=>item.is_hidden).map(item=>item.slug));const visible=id=>!hidden.has('destination-'+id);layout.destinations=layout.destinations.filter(item=>visible(item.id));for(const key of ['popular','deep','other'])layout[key]=layout[key].filter(visible);}
 const originals=Object.fromEntries(Object.values(catalog).filter(item=>item.category==='destinations').map(item=>[item.path.split('/')[2],item.path]));
 const guidePlans=Object.fromEntries(layout.destinations.map(item=>{const product=products.get('destination-'+item.id);return [item.id,guidePlanDefaults(item,product,product&&entryFor(product))];}));
 return {layout,revision:row?.revision||0,tours,originals,guidePlans};
}
export async function layoutApi({request,env}){
 if(!env.TEAM_DB)return response({error:'尚未连接内容库。'},503);
 const user=await session(request,env);if(!user)return response({error:'请先登录。'},401);
 if(request.method==='GET')return response({...await privateState(env.TEAM_DB,true),pageDefaults,regions,facets,canPublish:env.TEAM_PUBLISH==='1'});
 if(request.method!=='POST')return response({error:'Method not allowed'},405);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return response({error:'Invalid origin'},403);
 if(request.headers.get('Content-Type')?.split(';')[0]!=='application/json')return response({error:'JSON required'},415);
 const raw=await request.text();if(raw.length>750000)return response({error:'卡片内容过大。'},413);
 let body;try{body=JSON.parse(raw);}catch{return response({error:'无效的数据。'},400);}
 if(!Number.isSafeInteger(body?.revision)||body.revision<0||!['save','publish'].includes(body.action))return response({error:'请刷新后重试。'},400);
 let result;const db=env.TEAM_DB,now=Date.now();
 if(body.action==='publish'){
  if(env.TEAM_PUBLISH!=='1')return response({error:'当前环境不能发布。'},403);
  result=await db.prepare('UPDATE product_content SET published=draft,published_at=?,updated_by=?,revision=revision+1 WHERE slug=? AND revision=? RETURNING revision').bind(now,user.email,layoutKey,body.revision).first();
 }else{
  if(!validLayout(body.layout))return response({error:'请检查重复卡片、空标题、分组或图片地址。详情图库含封面最多 10 张，请补全或删除空白图片位置。'},400);
  const json=JSON.stringify(body.layout);result=body.revision===0?await db.prepare('INSERT INTO product_content (slug,draft,revision,updated_by,updated_at) VALUES (?,?,1,?,?) ON CONFLICT(slug) DO NOTHING RETURNING revision').bind(layoutKey,json,user.email,now).first():await db.prepare('UPDATE product_content SET draft=?,updated_at=?,updated_by=?,revision=revision+1 WHERE slug=? AND revision=? RETURNING revision').bind(json,now,user.email,layoutKey,body.revision).first();
 }
 return result?response(result):response({error:'此布局已被更新，请重新载入后再操作。'},409);
}
