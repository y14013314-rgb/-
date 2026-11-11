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
    const row=await db.prepare('SELECT * FROM product_content WHERE slug=?').bind('baiyun').first();
    if(action==='product') return response({product:row?JSON.parse(row.draft):seed,revision:row?.revision||0,publishedAt:row?.published_at||null,canPublish:env.TEAM_PUBLISH==='1'});
    if(action==='preview') {
      const html=renderTrain(row?JSON.parse(row.draft):seed,template,env.SITE_URL||new URL(request.url).origin).detail;
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
  if(action==='save') {
    try{validateProduct(body.product);}catch(e){return response({error:e.message},400);}
    const updated=body.revision===0
      ? await db.prepare("INSERT INTO product_content (slug,draft,revision,updated_by,updated_at) VALUES ('baiyun',?,1,?,?) ON CONFLICT(slug) DO NOTHING RETURNING revision").bind(JSON.stringify(body.product),user.email,Date.now()).first()
      : await db.prepare('UPDATE product_content SET draft=?,revision=revision+1,updated_by=?,updated_at=? WHERE slug=? AND revision=? RETURNING revision').bind(JSON.stringify(body.product),user.email,Date.now(),'baiyun',body.revision).first();
    return updated?response(updated):response({error:'内容已在其他窗口更新，请刷新后再编辑。'},409);
  }
  if(action==='publish') {
    if(env.TEAM_PUBLISH!=='1')return response({error:'测试环境不能发布正式内容。'},403);
    const result=await db.prepare('UPDATE product_content SET published=draft,published_at=?,updated_by=?,revision=revision+1 WHERE slug=? AND revision=? RETURNING revision,published_at').bind(Date.now(),user.email,'baiyun',body.revision).first();
    return result?response(result):response({error:'请先保存草稿；内容可能已在其他窗口更新。'},409);
  }
  return response({error:'Not found'},404);
}
