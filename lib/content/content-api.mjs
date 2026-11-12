import {catalog,validateCatalogProduct,renderCatalogProduct} from './catalog-product.mjs';
import seed from './train-seed.mjs';
import template from './train-template.mjs';
import { renderTrain } from './render-train.mjs';
import { validateProduct } from './product.mjs';
import { response, session } from './auth.mjs';
export async function onContent({request,env,params}) {
  if(!env.TEAM_DB) return response({error:'后台尚未启用。'},503);
  const user=await session(request,env);
  if(!user) return response({error:'请先登录。'},401);
  const action=params.action,db=env.TEAM_DB;
  if(request.method==='GET') {
    if(action==='products'){
      const rows=(await db.prepare('SELECT slug,draft,published_at FROM product_content').all()).results;
      const products=[{slug:'baiyun',label:'Baiyun 白云号',image:seed.image.src},...Object.entries(catalog).map(([slug,e])=>({slug,label:e.label,image:e.product.values[e.fields.find(f=>f.type==='image')?.key]}))];
      for(const p of products){const row=rows.find(r=>r.slug===p.slug);if(row){const draft=JSON.parse(row.draft);p.label=draft.title;p.image=p.slug==='baiyun'?draft.image.src:draft.values[catalog[p.slug].fields.find(f=>f.type==='image')?.key];p.publishedAt=row.published_at;}}
      return response({products});
    }
    const slug=new URL(request.url).searchParams.get('slug')||'baiyun';
    if(slug!=='baiyun'&&!catalog[slug])return response({error:'产品不存在。'},404);
    const entry=catalog[slug];
    const row=await db.prepare('SELECT * FROM product_content WHERE slug=?').bind(slug).first();
    if(action==='product') return response({product:row?JSON.parse(row.draft):(entry?entry.product:seed),fields:entry?.fields||null,videos:entry?[...entry.template.matchAll(/<source\b[^>]*src="([^"]*)"/g)].map(m=>m[1]):[],revision:row?.revision||0,publishedAt:row?.published_at||null,canPublish:env.TEAM_PUBLISH==='1',canUploadVideo:Boolean(env.MEDIA)});
    if(action==='preview') {
      const p=row?JSON.parse(row.draft):(entry?entry.product:seed),origin=env.SITE_URL||new URL(request.url).origin;
      const html=entry?renderCatalogProduct(p,origin):renderTrain(p,template,origin).detail;
      return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex','Content-Security-Policy':"frame-ancestors 'none'; base-uri 'none'",'X-Content-Type-Options':'nosniff'}});
    }
    return response({error:'Not found'},404);
  }
  if(request.method!=='POST') return response({error:'Method not allowed'},405);
  if(request.headers.get('Origin')!==new URL(request.url).origin) return response({error:'Invalid origin'},403);
  if(request.headers.get('Content-Type')?.split(';')[0]!=='application/json') return response({error:'JSON required'},415);
  const reader=request.body?.getReader();let raw='',size=0;
  if(!reader)return response({error:'Missing body'},400);
  const decoder=new TextDecoder();
  for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>60000){await reader.cancel();return response({error:'内容过长，请缩短文字。'},413);}raw+=decoder.decode(value,{stream:true});}
  raw+=decoder.decode();let body;
  try{body=JSON.parse(raw);}catch{return response({error:'Invalid JSON'},400);}
  if(!Number.isInteger(body?.revision)||body.revision<0)return response({error:'请刷新后重试。'},400);
  const slug=action==='save'?body.product?.slug:(body.slug||'baiyun');
  if(slug!=='baiyun'&&!catalog[slug])return response({error:'产品不存在。'},404);
  if(action==='save') {
    try{slug==='baiyun'?validateProduct(body.product):validateCatalogProduct(body.product);}catch(e){return response({error:e.message},400);}
    const updated=body.revision===0
      ? await db.prepare("INSERT INTO product_content (slug,draft,revision,updated_by,updated_at) VALUES (?,?,1,?,?) ON CONFLICT(slug) DO NOTHING RETURNING revision").bind(slug,JSON.stringify(body.product),user.email,Date.now()).first()
      : await db.prepare('UPDATE product_content SET draft=?,revision=revision+1,updated_by=?,updated_at=? WHERE slug=? AND revision=? RETURNING revision').bind(JSON.stringify(body.product),user.email,Date.now(),slug,body.revision).first();
    return updated?response(updated):response({error:'内容已在其他窗口更新，请刷新后再编辑。'},409);
  }
  if(action==='publish') {
    if(env.TEAM_PUBLISH!=='1')return response({error:'测试环境不能发布正式内容。'},403);
    const result=await db.prepare('UPDATE product_content SET published=draft,published_at=?,updated_by=?,revision=revision+1 WHERE slug=? AND revision=? RETURNING revision,published_at').bind(Date.now(),user.email,slug,body.revision).first();
    return result?response(result):response({error:'请先保存草稿；内容可能已在其他窗口更新。'},409);
  }
  return response({error:'Not found'},404);
}
