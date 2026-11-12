import {catalog,renderCatalogProduct} from './catalog-product.mjs';
export async function onCatalogPage(context){
 const fallback=await context.next(),slug=context.params.slug;
 if(!catalog[slug]||!context.env.TEAM_DB||context.request.method!=='GET'||!fallback.ok)return fallback;
 let row;try{row=await context.env.TEAM_DB.prepare('SELECT published FROM product_content WHERE slug=?').bind(slug).first();}catch{return fallback;}
 if(!row?.published)return fallback;
 const html=renderCatalogProduct(JSON.parse(row.published),context.env.SITE_URL||new URL(context.request.url).origin),headers=new Headers(fallback.headers);
 headers.set('Content-Type','text/html; charset=utf-8');headers.set('Cache-Control','no-store');headers.delete('Content-Length');headers.delete('Content-Encoding');headers.delete('ETag');
 return new Response(html,{headers});
}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function updateCards(html,rows){
 for(const row of rows){const e=catalog[row.slug];if(!e||!row.published)continue;const p=JSON.parse(row.published),image=e.fields.find(f=>f.type==='image');
  html=html.replace(/<article\b[^>]*>[\s\S]*?<\/article>/g,card=>{
   if(!card.includes('href="'+e.path+'"'))return card;
   if(p.title!==e.product.title)card=card.replace(/<(h2|h3)([^>]*)>([\s\S]*?)<\/\1>/,(_,tag,attrs,inner)=>{const a=inner.match(/^\s*(<a\b[^>]*>)[\s\S]*?<\/a>\s*$/);return `<${tag}${attrs}>${a?a[1]:''}${escape(p.title)}${a?'</a>':''}</${tag}>`;});
   if(image&&p.values[image.key]!==e.product.values[image.key])card=card.replace(/<img\b[^>]*>/,tag=>tag.replace(/\bsrc="[^"]*"/,()=>`src="${escape(p.values[image.key])}"`).replace(/\s(?:srcset|sizes)="[^"]*"/g,''));
   return card;
  });
 }
 return html;
}
export async function catalogCollection(context,base){
 const fallback=base||await context.next();if(!context.env.TEAM_DB||!fallback.ok||context.request.method!=='GET')return fallback;
 let rows;try{rows=(await context.env.TEAM_DB.prepare('SELECT slug,published FROM product_content WHERE published IS NOT NULL').all()).results;}catch{return fallback;}
 if(!rows.some(r=>catalog[r.slug]))return fallback;
 const html=updateCards(await fallback.text(),rows),headers=new Headers(fallback.headers);headers.set('Cache-Control','no-store');headers.delete('Content-Length');headers.delete('Content-Encoding');headers.delete('ETag');
 return new Response(html,{headers});
}
