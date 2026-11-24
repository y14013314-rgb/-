import {session,response,limit} from './auth.mjs';
export function youtubeEmbedUrl(value){
 let url;try{url=new URL(value);}catch{return '';}
 if(url.protocol!=='https:')return '';
 const host=url.hostname.replace(/^www\./,'');
 const id=host==='youtu.be'?url.pathname.slice(1):['youtube.com','m.youtube.com','youtube-nocookie.com'].includes(host)?(url.pathname==='/watch'?url.searchParams.get('v'):url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)\/?$/)?.[1]):'';
 return /^[\w-]{11}$/.test(id||'')?'https://www.youtube.com/embed/'+id:'';
}
export function videoFrameUrl(value){
 const youtube=youtubeEmbedUrl(value);if(youtube)return youtube;
 let url;try{url=new URL(value);}catch{return '';}
 const valid=url.protocol==='https:'&&((url.hostname==='v.qq.com'&&url.pathname==='/txp/iframe/player.html')||(url.hostname==='v-hls.chinadaily.com'&&url.pathname==='/player/player.html'));
 return valid?url.href:'';
}
export function renderVideo(value,poster=''){
 const frame=videoFrameUrl(value);
 const escaped=String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const image=String(poster).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return !value?'':frame?'<iframe title="Product video" src="'+frame+'" style="width:100%;aspect-ratio:16/9;border:0" allow="fullscreen; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>':'<video controls playsinline preload="metadata"'+(poster?' poster="'+image+'"':'')+'><source src="'+escaped+'" type="video/mp4"></video>';
}
export const maxVideoBytes=99000000;
export const videoUrl=s=>typeof s==='string'&&s.length<=1000&&(!s||(/^\/assets\/[^<>"'\\?#]+$/.test(s)&&!s.includes('..'))||/^https:\/\/[^<>"'\s\\]+$/.test(s));
const base64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
const encode=value=>base64url(new TextEncoder().encode(JSON.stringify(value)));
export async function videoUpload({request,env}){
 if(!env.TEAM_DB)return response({error:'后台尚未启用。'},503);
 const user=await session(request,env);if(!user)return response({error:'登录状态已失效，请重新登录后上传。'},401);
 if(request.method!=='POST')return response({error:'Method not allowed'},405);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return response({error:'Invalid origin'},403);
 const contentType=request.headers.get('Content-Type')||'';
 if(!/^multipart\/form-data;\s*boundary=/i.test(contentType)||!request.body)return response({error:'请选择 MP4 视频文件。'},415);
 // Leave room for multipart fields below the edge's 100 MB request limit.
 const maxRequestBytes=100000000;
 if(Number(request.headers.get('Content-Length'))>maxRequestBytes)return response({error:'视频过大，请选择 99 MB 以内的 MP4。'},413);
 const now=Date.now();
 if(!await limit(env.TEAM_DB,`video-relay:${user.email}:${Math.floor(now/3600000)}`,30,now))return response({error:'视频上传操作过于频繁，请稍后再试。'},429);
 let received=0,tooLarge=false;
 const body=request.body.pipeThrough(new TransformStream({transform(chunk,controller){
  received+=chunk.byteLength;if(received>maxRequestBytes){tooLarge=true;throw new Error('Video request too large');}controller.enqueue(chunk);
 }}));
 try{
  const upstream=await fetch('https://upload.imagekit.io/api/v2/files/upload',{method:'POST',headers:{'Content-Type':contentType},body,redirect:'manual',signal:AbortSignal.timeout(600000)});
  if(!upstream.ok){
   console.warn(JSON.stringify({event:'video-upload-rejected',status:upstream.status,requestId:upstream.headers.get('x-ik-requestid')}));
   await upstream.body?.cancel();
   return response({error:upstream.status===413?'视频过大，请选择 99 MB 以内的 MP4。':`视频存储服务拒绝了上传（HTTP ${upstream.status}）。当前修改已保留，请将此提示反馈给管理员。`},upstream.status===413?413:502);
  }
  const result=await upstream.json();
  if(typeof result.url!=='string'||!result.url.startsWith('https://ik.imagekit.io/negxem1l9/')||/[<>"'\s\\]/.test(result.url))throw new Error('Invalid upload response');
  return response({url:result.url});
 }catch(error){
  console.warn(JSON.stringify({event:'video-upload-interrupted',type:error.name,received}));
  return response({error:tooLarge?'视频过大，请选择 99 MB 以内的 MP4。':'官网与视频存储服务的连接中断或超时，上传结果未确认。当前修改已保留，请将此提示反馈给管理员，暂勿重复上传。'},tooLarge?413:502);
 }
}
export async function videoAuth({request,env}){
 if(!env.TEAM_DB)return response({error:'后台尚未启用。'},503);
 const user=await session(request,env);if(!user)return response({error:'请先登录。'},401);
 if(request.method!=='POST')return response({error:'Method not allowed'},405);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return response({error:'Invalid origin'},403);
 if(!env.IMAGEKIT_PRIVATE_KEY)return response({error:'视频上传尚未配置，请联系管理员。'},503);
 const now=Date.now();
 if(!await limit(env.TEAM_DB,`video:${user.email}:${Math.floor(now/3600000)}`,30,now))return response({error:'视频上传操作过于频繁，请稍后再试。'},429);
 const parameters={fileName:crypto.randomUUID()+'.mp4',folder:'/sukha-videos',useUniqueFileName:'true',overwriteFile:'false',checks:'"file.mime" IN ["video/mp4"] AND "file.size" > 0 AND "file.size" <= '+maxVideoBytes};
 const iat=Math.floor(now/1000),payload={...parameters,iat,exp:iat+600};
 const unsigned=encode({alg:'HS256',typ:'JWT',kid:'public_AwTSuxst7OTsYoBXsqHLDtLKIP4='})+'.'+encode(payload);
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.IMAGEKIT_PRIVATE_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(unsigned));
 return response({token:unsigned+'.'+base64url(new Uint8Array(signature)),parameters});
}
