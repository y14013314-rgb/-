import {session,response} from './auth.mjs';
import {catalog,isContentPage,entryFor,pathFor,coverFor,placementFor,renderContent,escape,cardTemplateFor,editorCard,publishedBackLabel} from './catalog-product.mjs';
import {breadcrumb,collectionCopy,collectionCategory,collections,isEditorialCategory,renderCard} from './editorial.mjs';
import {journeyEditor} from './journey-days.mjs';
import {withCardProducts} from './card-products.mjs';
export function htmlResponse(html,original,head=false){const headers=new Headers(original?.headers);headers.set('Content-Type','text/html; charset=utf-8');headers.set('Cache-Control','no-store');for(const h of ['Content-Length','Content-Encoding','ETag'])headers.delete(h);return new Response(head?null:html,{headers});}
export async function onCatalogPage(context,forcedSlug){
 const slug=forcedSlug||context.params?.slug;
 const response=await catalogDetail(context,forcedSlug);
 if(!slug||!/^\/(?:journeys|destinations|experiences|wildlife|signature-experiences|silk-road-luxury-trains|yangtze-river-cruises)\/[a-z0-9-]+\/?$/.test(new URL(context.request.url).pathname))return response;
 return withCardProducts(context,response,slug);
}
async function catalogDetail(context,forcedSlug){
 const fallback=await context.next(),slug=forcedSlug||context.params?.slug;
 if(!context.env.TEAM_DB||!['GET','HEAD'].includes(context.request.method))return fallback;
 let row;try{row=await context.env.TEAM_DB.prepare('SELECT * FROM product_content WHERE slug=?').bind(slug).first();}catch{return fallback;}
 if(row?.is_hidden)return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Journey unavailable | SUKHA</title><link rel="stylesheet" href="/style.css"><main class="wrap section"><h1>This journey is currently unavailable.</h1><p>Contact SUKHA to discuss an alternative journey.</p><a class="button" href="/#request-quote">Contact us ↗</a></main></html>',{status:404,headers:{'Cache-Control':'no-store','Content-Type':'text/html; charset=utf-8'}});
 if(!row?.published){
  const category=entryFor(slug)?.category;
  if(!isEditorialCategory(category)||!fallback.ok)return fallback;
  const back=await publishedBackLabel(context.env.TEAM_DB,category);
  return back===undefined?fallback:htmlResponse(breadcrumb(await fallback.text(),{back}),fallback,context.request.method==='HEAD');
 }
 const p=JSON.parse(row.published);const pathname=new URL(context.request.url).pathname;if(!entryFor(p)||![pathFor(p),pathFor(p).replace(/\/$/,'')].includes(pathname))return fallback;
 if(pathFor(p)!==pathname)return Response.redirect(new URL(pathFor(p),context.request.url).href,301);
 const back=await publishedBackLabel(context.env.TEAM_DB,entryFor(p).category);
 return htmlResponse(renderContent(p,context.env.SITE_URL||new URL(context.request.url).origin,back),fallback,context.request.method==='HEAD');
}
export function updateCards(html,rows,isHome=false){
 for(const row of rows){let p;try{p=JSON.parse(row.published||row.draft);}catch{continue;}const e=entryFor(p);if(!e||['home','collection'].includes(e.category))continue;const path=pathFor(p),seed=e.product;
  const update=card=>{
   if(!card.includes('href="'+path+'"'))return card;
   if(row.is_hidden)return '';
   if(!row.published)return card;
   if(isHome?p.featured===false:placementFor(p)!=='original')return '';
   if(card.includes('class="journey-card"')){const journey=journeyEditor(p,e)?.journey;if(journey){const count=journey.itinerary.length;card=card.replace(/data-days="\d+"/,`data-days="${count}"`).replace(/<p class="eyebrow">\d+ DAYS[^<]*<\/p>/,()=>`<p class="eyebrow">${count} DAYS${journey.themeLabel?' · '+escape(journey.themeLabel.toUpperCase()):''}</p>`).replace(/(<\/h3>)<p>[^<]*<\/p>/,(_,heading)=>heading+'<p>'+escape(journey.route.join(' · '))+'</p>');}}
   if(p.title!==seed.title)card=card.replace(/<(h2|h3)([^>]*)>([\s\S]*?)<\/\1>/,(_,tag,attrs,inner)=>{const a=inner.match(/^\s*(<a\b[^>]*>)[\s\S]*?<\/a>\s*$/);return `<${tag}${attrs}>${a?a[1]:''}${escape(p.title)}${a?'</a>':''}</${tag}>`;});
   if(coverFor(p)!==coverFor(seed))card=card.replace(/<img\b[^>]*>/,tag=>tag.replace(/\bsrc="[^"]*"/,()=>`src="${escape(coverFor(p))}"`).replace(/\s(?:srcset|sizes)="[^"]*"/g,''));
   return !isHome&&card.startsWith('<article class="cruise-collection-card"')?renderCard(card,p.cardCopy):card;
  };
  html=html.replace(/<article\b[^>]*>[\s\S]*?<\/article>/g,update).replace(/<a\b[^>]*class="[^"]*\btheme-card\b[^"]*"[^>]*>[\s\S]*?<\/a>/g,update);
 }
 return html;
}
export async function catalogCollection(context,base){
 const fallback=base||await context.next();if(!context.env.TEAM_DB||!fallback.ok||context.request.method!=='GET')return fallback;
 let rows;try{rows=(await context.env.TEAM_DB.prepare('SELECT * FROM product_content').all()).results;}catch{return fallback;}
 if(!rows.length)return fallback;
 const url=new URL(context.request.url),pathname=url.pathname,previewSlug=url.searchParams.get('team-preview');
 let preview;
 if(previewSlug){
  if(!await session(context.request,context.env))return response({error:'请先登录后台，再打开栏目预览。'},401);
  const row=rows.find(r=>r.slug===previewSlug);if(!row)return response({error:'请先保存产品草稿。'},404);
  preview=JSON.parse(row.draft);
  const expected=collectionCategory(preview.slug)?pathFor(preview):(entryFor(preview)?.category==='journeys'||isContentPage(preview))?'/private-china-tours/':`/${entryFor(preview)?.category}/`;
  if(pathname!==expected)return response({error:'此产品不属于当前栏目。'},400);
  rows=rows.map(r=>r.slug===previewSlug?{...r,published:r.draft,is_hidden:0}:r);
 }
 const category={'/silk-road-luxury-trains/':'silk-road-luxury-trains','/yangtze-river-cruises/':'yangtze-river-cruises','/private-china-tours/':'journeys'}[pathname];
 let html=await fallback.text();
 if(isEditorialCategory(category)){
  const collection=rows.find(row=>row.slug===collections[category].slug);
  const overrides=collection?.published&&JSON.parse(collection.published).pageCopy;
  if(overrides){
   if(category==='yangtze-river-cruises'&&!html.includes('class="cruise-series-shortcuts"')){
    const original=entryFor(collections[category].slug).template.match(/<div class="cruise-series-shortcuts">[\s\S]*?<\/div>/)?.[0]||'';
    html=html.replace(/(<section class="page-intro wrap">[\s\S]*?)(<\/section>)/,(_,intro,end)=>intro+original+end);
   }
   html=collectionCopy(html,overrides).html;
  }
 }
 html=updateCards(html,rows,pathname==='/');
 const added=rows.filter(r=>r.published&&!r.is_hidden).map(r=>JSON.parse(r.published)).filter(p=>category?entryFor(p)?.category===category&&placementFor(p)!=='original':pathname==='/'&&p.featured);
 const more=[];
 for(const p of added){
  if(html.includes('href="'+pathFor(p)+'"'))continue;
  const position=pathname==='/'?'more':placementFor(p),card=collectionCard(p,position,isEditorialCategory(category));
  if(position==='more'){more.push(card);continue;}
  const sectionPattern=position==='collection'?/<section\b[^>]*class="[^"]*cruise-collection-list[^"]*"[^>]*>[\s\S]*?<\/section>/:new RegExp('<section\\b[^>]*id="'+position+'"[^>]*>[\\s\\S]*?<\\/section>');
  html=html.replace(sectionPattern,section=>position==='collection'?(isEditorialCategory(category)?section.replace('</section>',()=>card+'</section>'):section.includes('data-team-collection')?appendGrid(section,/data-team-collection/,card):section.replace('</section>',()=>'<div class="journey-grid" data-team-collection>'+card+'</div></section>')):appendGrid(section,position==='destinations'?/class="destination-grid"/:position==='itineraries'?/id="journey-results"/:/class="theme-grid"/,card));
 }
 if(more.length)html=html.replace('</main>',()=>`<section class="wrap section" id="more-journeys"><h2>More journeys to discover.</h2><div class="journey-grid">${more.join('')}</div></section></main>`);
 if(category==='yangtze-river-cruises')html=html.replace(/<div class="cruise-series-shortcuts">[\s\S]*?<\/div>/,'');
 if(preview){
  html=html.replaceAll('href="'+pathFor(preview)+'"','href="/api/team/preview?slug='+encodeURIComponent(preview.slug)+'"');
  html=html.replace(/<body\b[^>]*>/,tag=>tag+'<aside role="status" style="position:sticky;top:0;z-index:50;padding:16px 6%;background:#263d37;color:white;font:15px/1.6 Arial,sans-serif">草稿位置预览 · '+escape(preview.title)+' · 尚未发布这些修改。 <a style="color:white;text-decoration:underline" href="/team/">返回后台</a></aside>');
 }
 const result=htmlResponse(html,fallback);if(preview){result.headers.set('X-Robots-Tag','noindex, nofollow');result.headers.set('Cache-Control','private, no-store');result.headers.set('Referrer-Policy','same-origin');}return result;
}
function appendGrid(section,marker,card){
 const start=section.search(marker),open=section.indexOf('>',start);if(start<0)return section;
 let depth=1;const tags=/<div\b[^>]*>|<\/div>/g;tags.lastIndex=open+1;let match;
 while((match=tags.exec(section))){depth+=match[0].startsWith('</')?-1:1;if(!depth)return section.slice(0,match.index)+card+section.slice(match.index);}
 return section;
}
function collectionCard(p,position,editorial){
 const path=pathFor(p),title=escape(p.title),image=escape(coverFor(p));
 const template=editorial&&cardTemplateFor(p);
 if(template){
  const card=template.replace(/<article[^>]*>/,()=>`<article class="cruise-collection-card" id="${escape(p.slug)}">`).replace(/href="[^"]*"/g,()=>`href="${path}"`);
  return renderCard(card,{...(p.image?editorCard(p):{title:p.title}),...p.cardCopy,photo:p.cardCopy?.photo||coverFor(p)});
 }
 if(position==='destinations')return `<article><a class="destination-image-link" href="${path}"><img class="destination-photo" src="${image}" alt="${title}" loading="lazy"></a><h2><a href="${path}">${title}</a></h2><a class="text-link" href="${path}">Explore the journey ↗</a></article>`;
 if(position==='experiences')return `<a class="theme-card living" href="${path}"><img class="product-photo" src="${image}" alt="${title}" loading="lazy"><h3>${title}</h3><span class="text-link">Explore the journey ↗</span></a>`;
 return `<article class="journey-card"${position==='itineraries'?` data-days="${journeyEditor(p,entryFor(p))?.journey.itinerary.length||Number(p.days)||''}" data-category=""`:''}><a class="card-visual" href="${path}"><img src="${image}" alt="${title}" loading="lazy"></a><div class="card-copy"><h3><a href="${path}">${title}</a></h3><a class="text-link" href="${path}">Explore the journey ↗</a></div></article>`;
}
