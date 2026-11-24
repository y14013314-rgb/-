import {privateState} from './private-layout.mjs';
import {session} from './auth.mjs';
import {escape} from './private-shell.mjs';

export async function withCardProducts(context,response,slug){
 const {request,env}=context;
 if(!response.ok||request.method!=='GET'||!env.TEAM_DB)return response;
 const preview=new URL(request.url).searchParams.has('card-preview');
 if(preview&&!await session(request,env))return new Response('Sign in to preview.',{status:401,headers:{'Cache-Control':'no-store'}});
 const column=preview?'draft':'published';
 const entry=await env.TEAM_DB.prepare(`SELECT json_extract(${column},?) AS ids FROM product_content WHERE slug=?`).bind(`$.cardProducts."${slug}"`,'@private-tours-layout').first();
 if(!entry?.ids)return response;
 const ids=JSON.parse(entry.ids);
 if(!ids.length)return response;
 const {tours}=await privateState(env.TEAM_DB);
 const cards=ids.filter(id=>id!==slug&&Object.hasOwn(tours,id)).map(id=>{
  const item=tours[id];
  return `<article class="pt-card"><a href="${escape(item.href)}">${item.image?`<img class="pt-cover" src="${escape(item.image)}" alt="" loading="lazy">`:''}<strong>${escape(item.title)}</strong></a></article>`;
 });
 if(!cards.length)return response;
 const block=`<section class="wrap section" aria-label="Related journeys"><h2>Related journeys</h2><div class="pt-grid">${cards.join('')}</div></section>`;
 const html=await response.text(),position=html.search(/<section class="final-cta\b|<\/main>/);
 const headers=new Headers(response.headers);
 for(const name of ['Content-Length','Content-Encoding','ETag'])headers.delete(name);
 headers.set('Cache-Control','no-store');
 if(preview)headers.set('X-Robots-Tag','noindex, nofollow');
 return new Response(position<0?html:html.slice(0,position)+block+html.slice(position),{headers,status:response.status});
}
