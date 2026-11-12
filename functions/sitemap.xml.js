import {entryFor,pathFor} from '../lib/content/catalog-product.mjs';
export async function onRequest(context){
 const fallback=await context.next();if(!context.env.TEAM_DB||context.request.method!=='GET'||!fallback.ok)return fallback;
 let rows;try{rows=(await context.env.TEAM_DB.prepare('SELECT * FROM product_content').all()).results;}catch{return fallback;}
 const origin=context.env.SITE_URL||new URL(context.request.url).origin;let xml=await fallback.text();
 for(const row of rows){const p=JSON.parse(row.published||row.draft);if(!entryFor(p)||p.slug==='homepage')continue;const url=origin+pathFor(p);
  if(row.is_hidden)xml=xml.replace(/<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/g,(all,loc)=>loc===url?'':all);
  else if(row.published&&!xml.includes('<loc>'+url+'</loc>'))xml=xml.replace('</urlset>','<url><loc>'+url+'</loc></url></urlset>');
 }
 return new Response(xml,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store'}});
}
