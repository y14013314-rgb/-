import {session,response} from './auth.mjs';
export async function onMembers({request,env}) {
  if(!env.TEAM_DB)return response({error:'后台尚未启用。'},503);
  const user=await session(request,env);
  if(!user)return response({error:'请先登录。'},401);
  if(user.role!=='admin')return response({error:'只有管理员可以管理成员。'},403);
  if(request.method==='GET'){
    const result=await env.TEAM_DB.prepare('SELECT email,active FROM team_members ORDER BY email').all();
    return response({members:result.results});
  }
  if(request.method!=='POST')return response({error:'Method not allowed'},405);
  if(request.headers.get('Origin')!==new URL(request.url).origin)return response({error:'Invalid origin'},403);
  if(request.headers.get('Content-Type')?.split(';')[0]!=='application/json')return response({error:'JSON required'},415);
  const reader=request.body?.getReader();if(!reader)return response({error:'Missing body'},400);
  const chunks=[];let size=0;for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>1024){await reader.cancel();return response({error:'Request too large'},413);}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{return response({error:'Invalid JSON'},400);}
  const email=typeof body?.email==='string'?body.email.trim().toLowerCase():'';
  if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof body?.active!=='boolean')return response({error:'请输入有效邮箱。'},400);
  if(email===env.TEAM_ADMIN_EMAIL)return response({error:'不能在此修改管理员账号。'},400);
  await env.TEAM_DB.batch([
    env.TEAM_DB.prepare('INSERT INTO team_members (email,active,updated_at) VALUES (?,?,?) ON CONFLICT(email) DO UPDATE SET active=excluded.active,updated_at=excluded.updated_at').bind(email,body.active?1:0,Date.now()),
    env.TEAM_DB.prepare('DELETE FROM login_sessions WHERE email=?').bind(email),
    env.TEAM_DB.prepare('DELETE FROM login_codes WHERE email=?').bind(email),
  ]);
  return response({ok:true});
}
