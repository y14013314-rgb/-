import {session,response,limit} from './auth.mjs';
export const maxVideoBytes=100000000;
export const videoUrl=s=>typeof s==='string'&&s.length<=1000&&(!s||(/^\/assets\/[^<>"'\\?#]+$/.test(s)&&!s.includes('..'))||/^https:\/\/[^<>"'\s\\]+$/.test(s));
const base64url=bytes=>btoa(String.fromCharCode(...bytes)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
const encode=value=>base64url(new TextEncoder().encode(JSON.stringify(value)));
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
