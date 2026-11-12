import {catalog,entryFor,pathFor,coverFor,placementFor,renderContent,escape} from './catalog-product.mjs';
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
   if(row.is_hidden||(isHome&&p.featured===false)||(!isHome&&row.published&&placementFor(p)!=='original'))return '';
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
 const added=rows.filter(r=>r.published&&!r.is_hidden).map(r=>JSON.parse(r.published)).filter(p=>category?entryFor(p)?.category===category&&placementFor(p)!=='original':pathname==='/'&&p.featured);
 const more=[];
 for(const p of added){
  if(html.includes('href="'+pathFor(p)+'"'))continue;
  const position=pathname==='/'?'more':placementFor(p),card=collectionCard(p,position);
  if(position==='more'){more.push(card);continue;}
  const sectionPattern=position==='collection'?/<section\b[^>]*class="[^"]*cruise-collection-list[^"]*"[^>]*>[\s\S]*?<\/section>/:new RegExp('<section\\b[^>]*id="'+position+'"[^>]*>[\\s\\S]*?<\\/section>');
  html=html.replace(sectionPattern,section=>position==='collection'?(section.includes('data-team-collection')?appendGrid(section,/data-team-collection/,card):section.replace('</section>',()=>'<div class="journey-grid" data-team-collection>'+card+'</div></section>')):appendGrid(section,position==='destinations'?/class="destination-grid"/:position==='itineraries'?/id="journey-results"/:/class="theme-grid"/,card));
 }
 if(more.length)html=html.replace('</main>',()=>`<section class="wrap section"><h2>More journeys to discover.</h2><div class="journey-grid">${more.join('')}</div></section></main>`);
 return htmlResponse(html,fallback);
}
function appendGrid(section,marker,card){
 const start=section.search(marker),open=section.indexOf('>',start);if(start<0)return section;
 let depth=1;const tags=/<div\b[^>]*>|<\/div>/g;tags.lastIndex=open+1;let match;
 while((match=tags.exec(section))){depth+=match[0].startsWith('</')?-1:1;if(!depth)return section.slice(0,match.index)+card+section.slice(match.index);}
 return section;
}
function collectionCard(p,position){
 const path=pathFor(p),title=escape(p.title),image=escape(coverFor(p));
 if(position==='destinations')return `<article><a class="destination-image-link" href="${path}"><img class="destination-photo" src="${image}" alt="${title}" loading="lazy"></a><h2><a href="${path}">${title}</a></h2><a class="text-link" href="${path}">Explore the journey ↗</a></article>`;
 if(position==='experiences')return `<a class="theme-card living" href="${path}"><img class="product-photo" src="${image}" alt="${title}" loading="lazy"><h3>${title}</h3><span class="text-link">Explore the journey ↗</span></a>`;
 return `<article class="journey-card"${position==='itineraries'?` data-days="${Number(p.days)||''}" data-category=""`:''}><a class="card-visual" href="${path}"><img src="${image}" alt="${title}" loading="lazy"></a><div class="card-copy"><h3><a href="${path}">${title}</a></h3><a class="text-link" href="${path}">Explore the journey ↗</a></div></article>`;
}
