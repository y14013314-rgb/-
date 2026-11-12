import {catalog,entryFor,pathFor,coverFor,renderContent,escape} from './catalog-product.mjs';
export function htmlResponse(html,original,head=false){const headers=new Headers(original?.headers);headers.set('Content-Type','text/html; charset=utf-8');headers.set('Cache-Control','no-store');for(const h of ['Content-Length','Content-Encoding','ETag'])headers.delete(h);return new Response(head?null:html,{headers});}
export async function onCatalogPage(context,forcedSlug){
 const fallback=await context.next(),slug=forcedSlug||context.params?.slug;
 if(!context.env.TEAM_DB||!['GET','HEAD'].includes(context.request.method))return fallback;
 let row;try{row=await context.env.TEAM_DB.prepare('SELECT * FROM product_content WHERE slug=?').bind(slug).first();}catch{return fallback;}
 if(row?.is_hidden)return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Journey unavailable | SUKHA</title><link rel="stylesheet" href="/style.css"><main class="wrap section"><h1>This journey is currently unavailable.</h1><p>Contact SUKHA to discuss an alternative journey.</p><a class="button" href="/#request-quote">Contact us ↗</a></main></html>',{status:404,headers:{'Cache-Control':'no-store','Content-Type':'text/html; charset=utf-8'}});
 if(!row?.published)return fallback;
 const p=JSON.parse(row.published);const pathname=new URL(context.request.url).pathname;if(!entryFor(p)||![pathFor(p),pathFor(p).replace(/\/$/,'')].includes(pathname))return fallback;
 if(pathFor(p)!==pathname)return Response.redirect(new URL(pathFor(p),context.request.url).href,301);
 return htmlResponse(renderContent(p,context.env.SITE_URL||new URL(context.request.url).origin),fallback,context.request.method==='HEAD');
}
export function updateCards(html,rows,isHome=false){
 for(const row of rows){let p;try{p=JSON.parse(row.published||row.draft);}catch{continue;}const e=entryFor(p);if(!e||e.category==='home')continue;const path=pathFor(p),seed=e.product;
  html=html.replace(/<article\b[^>]*>[\s\S]*?<\/article>/g,card=>{
   if(!card.includes('href="'+path+'"'))return card;
   if(row.is_hidden||(isHome&&p.featured===false))return '';
   if(!row.published)return card;
   if(p.title!==seed.title)card=card.replace(/<(h2|h3)([^>]*)>([\s\S]*?)<\/\1>/,(_,tag,attrs,inner)=>{const a=inner.match(/^\s*(<a\b[^>]*>)[\s\S]*?<\/a>\s*$/);return `<${tag}${attrs}>${a?a[1]:''}${escape(p.title)}${a?'</a>':''}</${tag}>`;});
   if(coverFor(p)!==coverFor(seed))card=card.replace(/<img\b[^>]*>/,tag=>tag.replace(/\bsrc="[^"]*"/,()=>`src="${escape(coverFor(p))}"`).replace(/\s(?:srcset|sizes)="[^"]*"/g,''));
   return card;
  });
 }
 return html;
}
export async function catalogCollection(context,base){
 const fallback=base||await context.next();if(!context.env.TEAM_DB||!fallback.ok||context.request.method!=='GET')return fallback;
 let rows;try{rows=(await context.env.TEAM_DB.prepare('SELECT * FROM product_content').all()).results;}catch{return fallback;}
 if(!rows.length)return fallback;
 const pathname=new URL(context.request.url).pathname;let html=updateCards(await fallback.text(),rows,pathname==='/');
 const category={'/silk-road-luxury-trains/':'silk-road-luxury-trains','/yangtze-river-cruises/':'yangtze-river-cruises','/private-china-tours/':'journeys'}[pathname];
 const added=rows.filter(r=>r.published&&!r.is_hidden&&(pathname==='/'||(!catalog[r.slug]&&r.slug!=='baiyun'))).map(r=>JSON.parse(r.published)).filter(p=>(category?entryFor(p)?.category===category:pathname==='/'&&p.featured));
 if((category||pathname==='/')&&added.length){const cards=added.filter(p=>!html.includes('href="'+pathFor(p)+'"')).map(p=>`<article class="journey-card"><a class="card-visual" href="${pathFor(p)}"><img src="${escape(coverFor(p))}" alt="${escape(p.title)}" loading="lazy"></a><div class="card-copy"><h3><a href="${pathFor(p)}">${escape(p.title)}</a></h3><a class="text-link" href="${pathFor(p)}">Explore the journey ↗</a></div></article>`).join('');if(cards)html=html.replace('</main>',()=>`<section class="wrap section"><h2>More journeys to discover.</h2><div class="journey-grid">${cards}</div></section></main>`);}
 return htmlResponse(html,fallback);
}
