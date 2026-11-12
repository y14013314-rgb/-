import {catalog,entryFor,pathFor,coverFor,placementOptions,placementFor,validateContent,renderContent} from './catalog-product.mjs';
import {response,session} from './auth.mjs';
const bases=['baiyun',...Object.keys(catalog)];
const seedFor=slug=>entryFor(slug)?.product;
export async function onContent({request,env,params}){
 if(!env.TEAM_DB)return response({error:'后台尚未启用。'},503);
 const user=await session(request,env);if(!user)return response({error:'请先登录。'},401);
 const action=params.action,db=env.TEAM_DB;
 if(request.method==='GET'){
  if(action==='products'){
   const rows=(await db.prepare('SELECT * FROM product_content').all()).results;
   const slugs=[...new Set([...bases,...rows.map(r=>r.slug)])];
   const products=slugs.map(slug=>{const row=rows.find(r=>r.slug===slug),p=row?JSON.parse(row.draft):seedFor(slug),e=entryFor(p);if(!e)return null;return {slug,label:slug==='homepage'?'首页':p.title,image:coverFor(p),publishedAt:row?.published_at||null,hidden:Boolean(row?.is_hidden),category:e.category,isNew:!bases.includes(slug)};}).filter(Boolean);
   return response({products,templates:products.filter(p=>p.category!=='home').map(p=>({slug:p.slug,label:p.label,category:p.category}))});
  }
  const slug=new URL(request.url).searchParams.get('slug')||'baiyun',row=await db.prepare('SELECT * FROM product_content WHERE slug=?').bind(slug).first();
  const p=row?JSON.parse(row.draft):structuredClone(seedFor(slug)),entry=entryFor(p);if(!entry)return response({error:'产品不存在。'},404);
  if(p.values&&p.sections===undefined)p.sections=[];
  if(slug!=='homepage'&&p.featured===undefined)p.featured=catalog.homepage.template.includes('href="'+pathFor(p)+'"');
  if(slug!=='homepage')p.placement=placementFor(p);
  if(action==='product')return response({product:p,placements:placementOptions(p),fields:entry.fields||null,videos:entry.template?[...entry.template.matchAll(/<source\b[^>]*src="([^"]*)"/g)].map(m=>m[1]):[],revision:row?.revision||0,publishedAt:row?.published_at||null,hidden:Boolean(row?.is_hidden),url:pathFor(p),collectionPreviewUrl:slug==='homepage'?null:(entry.category==='journeys'?'/private-china-tours/':`/${entry.category}/`)+'?team-preview='+encodeURIComponent(slug)+'#'+({more:'more-journeys',collection:entry.category==='silk-road-luxury-trains'?'train-collection':'',original:entry.category==='journeys'?'itineraries':entry.category==='silk-road-luxury-trains'?'train-collection':''}[p.placement]??p.placement),canUnpublish:slug!=='homepage',canDelete:!bases.includes(slug),canPublish:env.TEAM_PUBLISH==='1'});
  if(action==='preview')return new Response(renderContent(p,env.SITE_URL||new URL(request.url).origin),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex','Content-Security-Policy':"frame-ancestors 'none'; base-uri 'none'",'X-Content-Type-Options':'nosniff'}});
  return response({error:'Not found'},404);
 }
 if(request.method!=='POST')return response({error:'Method not allowed'},405);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return response({error:'Invalid origin'},403);
 if(request.headers.get('Content-Type')?.split(';')[0]!=='application/json')return response({error:'JSON required'},415);
 const reader=request.body?.getReader();let raw='',size=0;const decoder=new TextDecoder();if(!reader)return response({error:'Missing body'},400);
 for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>60000){await reader.cancel();return response({error:'内容过长，请缩短文字。'},413);}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();
 let body;try{body=JSON.parse(raw);}catch{return response({error:'Invalid JSON'},400);}
 if(action==='create'){
  const slug=typeof body?.slug==='string'?body.slug.trim():'',title=typeof body?.title==='string'?body.title.trim():'';
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>60||!title||title.length>200||bases.includes(slug))return response({error:'请填写产品名称及不重复的英文网址名称（小写字母、数字和连字符）。'},400);
  const baseRow=typeof body.baseSlug==='string'?await db.prepare('SELECT draft FROM product_content WHERE slug=?').bind(body.baseSlug).first():null;
  const original=baseRow?JSON.parse(baseRow.draft):seedFor(body.baseSlug),entry=entryFor(original);
  if(!entry||entry.category==='home')return response({error:'请选择有效的产品模板。'},400);
  const p=structuredClone(original);p.templateSlug=p.templateSlug||p.slug;p.slug=slug;p.title=title;p.featured=false;p.placement=entry.category==='journeys'?'itineraries':'collection';
  const created=await db.prepare('INSERT INTO product_content (slug,draft,revision,updated_by,updated_at) VALUES (?,?,1,?,?) ON CONFLICT(slug) DO NOTHING RETURNING revision').bind(slug,JSON.stringify(p),user.email,Date.now()).first();
  return created?response({slug,revision:created.revision},201):response({error:'该网址名称已使用，请换一个。'},409);
 }
 if(!Number.isInteger(body?.revision)||body.revision<0)return response({error:'请刷新后重试。'},400);
 const slug=action==='save'?body.product?.slug:(body.slug||'baiyun'),row=typeof slug==='string'?await db.prepare('SELECT * FROM product_content WHERE slug=?').bind(slug).first():null;
 const stored=row?JSON.parse(row.draft):seedFor(slug);if(!entryFor(stored))return response({error:'产品不存在。'},404);
 if(action==='delete'){
  if(env.TEAM_PUBLISH!=='1')return response({error:'测试环境不能删除正式记录。'},403);
  if(bases.includes(slug))return response({error:'原有内置产品模板不能删除，可以选择下架。'},400);
  if(row?.published&&!row.is_hidden)return response({error:'请先下架产品，再删除记录。'},409);
  const deleted=await db.prepare('DELETE FROM product_content WHERE slug=? AND revision=? AND (published IS NULL OR is_hidden=1) RETURNING slug').bind(slug,body.revision).first();
  return deleted?response({deleted:true,slug}):response({error:'记录已更新，请重新载入后再删除。'},409);
 }
 if(action==='save'){
  if((stored.templateSlug||stored.slug)!==(body.product.templateSlug||body.product.slug))return response({error:'不能更改已有产品的模板，请新建产品。'},400);
  try{validateContent(body.product);}catch(e){return response({error:e.message},400);}
  const updated=body.revision===0?await db.prepare('INSERT INTO product_content (slug,draft,revision,updated_by,updated_at) VALUES (?,?,1,?,?) ON CONFLICT(slug) DO NOTHING RETURNING revision').bind(slug,JSON.stringify(body.product),user.email,Date.now()).first():await db.prepare('UPDATE product_content SET draft=?,revision=revision+1,updated_by=?,updated_at=? WHERE slug=? AND revision=? RETURNING revision').bind(JSON.stringify(body.product),user.email,Date.now(),slug,body.revision).first();
  return updated?response(updated):response({error:'内容已在其他窗口更新，请先保留修改，再重新载入产品。'},409);
 }
 if(['publish','unpublish'].includes(action)){
  if(env.TEAM_PUBLISH!=='1')return response({error:'测试环境不能发布或下架正式内容。'},403);
  if(action==='unpublish'&&slug==='homepage')return response({error:'首页不能下架。'},400);
  let result;
  if(action==='publish')result=await db.prepare('UPDATE product_content SET published=draft,published_at=?,updated_by=?,is_hidden=0,revision=revision+1 WHERE slug=? AND revision=? RETURNING revision,published_at').bind(Date.now(),user.email,slug,body.revision).first();
  else result=body.revision===0?await db.prepare('INSERT INTO product_content (slug,draft,revision,updated_by,updated_at,is_hidden) VALUES (?,?,1,?,?,1) ON CONFLICT(slug) DO NOTHING RETURNING revision').bind(slug,JSON.stringify(stored),user.email,Date.now()).first():await db.prepare('UPDATE product_content SET is_hidden=1,updated_by=?,updated_at=?,revision=revision+1 WHERE slug=? AND revision=? RETURNING revision').bind(user.email,Date.now(),slug,body.revision).first();
  return result?response({...result,url:pathFor(stored)}):response({error:'请先保存草稿；内容可能已在其他窗口更新。'},409);
 }
 return response({error:'Not found'},404);
}
