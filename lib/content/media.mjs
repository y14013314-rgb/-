import {session,response} from './auth.mjs';
export const maxImageBytes=512*1024;
export async function upload({request,env}) {
  if(!env.TEAM_DB)return response({error:'后台尚未启用。'},503);
  const user=await session(request,env);if(!user)return response({error:'请先登录。'},401);
  if(request.method!=='POST')return response({error:'Method not allowed'},405);
  if(request.headers.get('Origin')!==new URL(request.url).origin)return response({error:'Invalid origin'},403);
  if(request.headers.get('Content-Type')!=='image/webp')return response({error:'请通过后台选择图片上传。'},415);
  const reader=request.body?.getReader();if(!reader)return response({error:'Missing body'},400);
  let size=0;const chunks=[];
  for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>maxImageBytes){await reader.cancel();return response({error:'压缩后的图片仍超过 512 KB，请选择较小的图片。'},413);}chunks.push(value);}
  const data=new Uint8Array(size);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.length;}
  const ascii=(start,end)=>new TextDecoder().decode(data.slice(start,end));
  if(size<20||ascii(0,4)!=='RIFF'||ascii(8,12)!=='WEBP')return response({error:'图片格式无效。'},400);
  const id=crypto.randomUUID()+'.webp';
  const r=await env.TEAM_DB.prepare('INSERT INTO media (id,data,created_by,created_at) SELECT ?,?,?,? WHERE (SELECT count(*) FROM media)<400 RETURNING id').bind(id,data,user.email,Date.now()).first();
  return r?response({url:'/media/'+id}):response({error:'图片存储已满，请联系管理员整理素材。'},409);
}
export async function image({request,env,params}) {
  if(!env.TEAM_DB||!/^[a-f0-9-]{36}\.webp$/.test(params.id))return new Response('Not found',{status:404});
  if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405});
  const row=await env.TEAM_DB.prepare('SELECT data FROM media WHERE id=?').bind(params.id).first();
  if(!row)return new Response('Not found',{status:404});
  return new Response(request.method==='HEAD'?null:new Uint8Array(row.data),{headers:{'Content-Type':'image/webp','X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=31536000, immutable'}});
}
