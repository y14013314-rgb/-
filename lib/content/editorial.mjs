export const escape=value=>String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const decode=value=>value.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[\da-f]+);/gi,entity=>{
 const named={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':'\u00a0'};
 if(Object.hasOwn(named,entity))return named[entity];
 const code=entity[2]==='x'?parseInt(entity.slice(3),16):Number(entity.slice(2,-1));
 return Number.isInteger(code)&&code<=0x10ffff?String.fromCodePoint(code):entity;
});
const textOf=html=>decode((html||'').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,'')).trim();
const mainPattern=/(<main\b[^>]*>)([\s\S]*?)(<\/main>)/;
const breadcrumbPattern=/<div class="wrap cruise-breadcrumb">(<a\b[^>]*>)[\s\S]*?<\/a>(<span\b[^>]*>)[\s\S]*?<\/span><\/div>/;
const editionsPattern=/(<section class="ivory">(?:(?!<\/section>)[\s\S])*?)(<details\b[\s\S]*?)(<\/div><\/section>)/;
const itineraryPattern=/(<section\b[^>]*class="wrap section rail-itinerary"[^>]*>(?:(?!<\/section>)[\s\S])*?<ol\b[^>]*>)([\s\S]*?)(<\/ol>)/;
const voyagePattern=/<article class="explorer-route">[\s\S]*?<\/article>/g;
const shorePattern=/<details class="explorer-details"><summary>([^<]*)<\/summary><div class="info-grid three">([\s\S]*?)<\/div>([\s\S]*?)<\/details>/;
const cruiseBlocks={gallery:/<section class="cruise-hero"[^>]*>[\s\S]*?<\/section>/,film:/<section class="wrap section rail-film"[^>]*>[\s\S]*?<\/section>/,intro:/<section class="wrap section">(?:(?!<\/section>)[\s\S])*?<\/section>/,voyages:/<(h[23])>[^<]*<\/\1><div class="explorer-routes">[\s\S]*?<\/div>/,inquiry:/<(section|div) class="explorer-config"[^>]*><form id="cruise-inquiry"[\s\S]*?<\/form><\/\1>/,shore:shorePattern,fares:/<details class="explorer-details"><summary>[^<]*<\/summary>(?!<div class="info-grid three">)[\s\S]*?<\/details>/,cta:/<section class="final-cta">[\s\S]*?<\/section>/};
const explorerIntro=/(<section class="wrap section" id="yangzi-explorer">)([\s\S]*?)(?=<h3>[^<]*<\/h3><div class="explorer-routes">)/;
export const cardPattern=/<article class="cruise-collection-card"(?:\s[^>]*)?>[\s\S]*?<\/article>/g;
export const collections={
 'silk-road-luxury-trains':{slug:'train-collection-page',label:'列车栏目页',back:'← All Train Journeys'},
 'yangtze-river-cruises':{slug:'cruise-collection-page',label:'游轮栏目页',back:'← All cruise series'},
};
export const isEditorialCategory=category=>Object.hasOwn(collections,category);
export const collectionCategory=slug=>Object.keys(collections).find(category=>collections[category].slug===slug);

function copyNodes(html,overrides,skip){
 const fields=[];
 const rendered=html.replace(mainPattern,(_,open,body,close)=>open+body.replace(new RegExp(skip+'|<script\\b[\\s\\S]*?<\\/script>|<!--[\\s\\S]*?-->|<[^>]*>|\\{\\{[^}]*\\}\\}|[^<{]+|[<{]','g'),token=>{
  if(/^[<{]/.test(token)||!token.trim()||/^[＋+↓↑←→↗×☰·\s]+$/.test(token))return token;
  const [,left,value,right]=token.match(/^(\s*)([\s\S]*?)(\s*)$/),key='copy'+fields.length;
  fields.push({key,label:'原文 · '+decode(value).slice(0,64),value:decode(value)});
  return Object.hasOwn(overrides,key)?left+escape(overrides[key]).replaceAll('{','&#123;')+right:token;
 })+close);
 return {html:rendered,fields};
}
export function detailCopy(html,overrides={}){
 let editions='';
 const result=copyNodes(html.replace(editionsPattern,(_,open,items,close)=>{editions=items;return open+'{{EDITORIAL_EDITIONS}}'+close;}),overrides,breadcrumbPattern.source);
 result.html=result.html.replace('{{EDITORIAL_EDITIONS}}',()=>editions);
 return result;
}
export function collectionCopy(html,overrides={}){return copyNodes(html,overrides,cardPattern.source);}
export function breadcrumbTitle(html){return textOf(html.match(breadcrumbPattern)?.[0].match(/<span\b[^>]*>([\s\S]*?)<\/span>/)?.[1]);}
export function breadcrumb(html,{back,title}={}){
 if(back===undefined&&title===undefined)return html;
 return html.replace(breadcrumbPattern,whole=>whole.replace(/(<a\b[^>]*>)[\s\S]*?<\/a>/,(anchor,open)=>back===undefined?anchor:open+escape(back)+'</a>').replace(/(<span\b[^>]*>)[\s\S]*?<\/span>/,(label,open)=>title===undefined?label:open+escape(title)+'</span>'));
}

const cardSlots={eyebrow:/<p class="eyebrow">([\s\S]*?)<\/p>/,title:/<h2>([\s\S]*?)<\/h2>/,duration:/<p class="cruise-duration">([\s\S]*?)<\/p>/,button:/<a class="button"[^>]*>([\s\S]*?)<\/a>/,credit:/<span>([\s\S]*?)<\/span>/};
const cardParagraphs=/(<p class="cruise-duration">[\s\S]*?<\/p>)((?:\s*<p(?:\s[^>]*)?>[\s\S]*?<\/p>)*)/;
const paragraphs=html=>[...html.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g)].map(match=>textOf(match[1]));
export function cardDefaults(html){
 if(!html)return null;
 const values=Object.fromEntries(Object.entries(cardSlots).map(([key,pattern])=>[key,textOf(html.match(pattern)?.[1])]));
 const notes=paragraphs(html.match(cardParagraphs)?.[2]||'');
 const bullets=[...(html.match(/<ul>([\s\S]*?)<\/ul>/)?.[1]||'').matchAll(/<li>([\s\S]*?)<\/li>/g)].map(match=>textOf(match[1]));
 return {...values,description:notes[0]||'',route:bullets.length?bullets.join('\n'):notes[1]||'',...(notes.length>2?{priceNote:notes.slice(2).join('\n')}:{}),photo:decode(html.match(/<img\b[^>]*src="([^"]*)"/)?.[1]||''),alt:decode(html.match(/<img\b[^>]*alt="([^"]*)"/)?.[1]||'')};
}
export function renderCard(html,copy){
 if(!copy)return html;
 for(const [key,pattern]of Object.entries(cardSlots))if(Object.hasOwn(copy,key))html=html.replace(pattern,(whole,inside)=>whole.slice(0,whole.indexOf('>')+1)+escape(copy[key])+whole.slice(whole.lastIndexOf('</')));
 if(['description','route','priceNote'].some(key=>Object.hasOwn(copy,key))){
  const removeList=/^([\s\S]*?<p class="cruise-duration">[\s\S]*?<\/p>(?:\s*<p(?:\s[^>]*)?>[\s\S]*?<\/p>)*)\s*<ul>[\s\S]*?<\/ul>/;
  const hasList=removeList.test(html),defaults=cardDefaults(html),description=copy.description??defaults.description,route=copy.route??defaults.route;
  if(hasList)html=html.replace(removeList,'$1');
  html=html.replace(cardParagraphs,(_,duration)=>duration+paragraph(description)+(route?(hasList?'<ul>'+route.split('\n').filter(Boolean).map(line=>'<li>'+escape(line)+'</li>').join('')+'</ul>':paragraph(route)):'')+paragraph(copy.priceNote??defaults.priceNote));
 }
 return html.replace(/<img\b[^>]*>/,tag=>{
  if(copy.photo)tag=tag.replace(/\bsrc="[^"]*"/,()=>`src="${escape(copy.photo)}"`).replace(/\s(?:srcset|sizes)="[^"]*"/g,'');
  if(Object.hasOwn(copy,'alt'))tag=tag.replace(/\balt="[^"]*"/,()=>`alt="${escape(copy.alt)}"`);
  return tag;
 });
}

const emptyPhoto=()=>({src:'',alt:'',credit:''});
export function planFieldKeys(template){return [itineraryPattern,editionsPattern].flatMap(pattern=>[...(template.match(pattern)?.[2]||'').matchAll(/\{\{CMS_(field\d+)\}\}/g)].map(match=>match[1]));}
export function planDefaults(html,category){
 if(category==='silk-road-luxury-trains'){
  const days=html.match(itineraryPattern)?.[2]||'',versions=html.match(editionsPattern)?.[2]||'';
  return {
   itinerary:[...days.matchAll(/<li><h3>([\s\S]*?)<\/h3><p>([\s\S]*?)<\/p><\/li>/g)].map(match=>({title:textOf(match[1]),description:textOf(match[2]),photo:emptyPhoto()})),
   editions:[...versions.matchAll(/<details><summary>([\s\S]*?)<b>＋<\/b><\/summary>([\s\S]*?)<\/details>/g)].map(match=>({title:textOf(match[1]),description:paragraphs(match[2]).join('\n\n'),photo:emptyPhoto(),ownItinerary:false,days:'',route:'',itinerary:[]})),
  };
 }
 const shore=html.match(shorePattern);
 return {voyages:[...html.matchAll(voyagePattern)].map(([article])=>({id:article.match(/data-(?:explorer|series)-route="([^"]+)"/)?.[1],title:textOf(article.match(/<h3>([\s\S]*?)<\/h3>/)?.[1]),duration:textOf(article.match(/class="eyebrow">([^<]*)/)?.[1]),stops:textOf(article.match(/class="explorer-stops">([^<]*)/)?.[1]),description:paragraphs(article)[2]||'',button:textOf(article.match(/<button[^>]*>([\s\S]*?)<\/button>/)?.[1]),itinerary:[]})),shoreTitle:textOf(shore?.[1]),shoreNote:textOf(shore?.[3]),shore:[...(shore?.[2]||'').matchAll(/<article><h3>([\s\S]*?)<\/h3><p>([\s\S]*?)<\/p><\/article>/g)].map(match=>({title:textOf(match[1]),description:textOf(match[2])})),blocks:Object.fromEntries(Object.keys(cruiseBlocks).map(key=>[key,{visible:true,extra:''}]))};
}
const paragraph=value=>value?'<p>'+escape(value).replaceAll('\n','<br>')+'</p>':'';
function photoMarkup(photo){return photo?.src?`<figure class="product-inline-photo"><img src="${escape(photo.src)}" alt="${escape(photo.alt)}" loading="lazy" decoding="async">${photo.credit?'<figcaption>'+escape(photo.credit)+'</figcaption>':''}</figure>`:'';}
const dayMarkup=items=>items.map(item=>'<li><h3>'+escape(item.title)+'</h3>'+paragraph(item.description)+photoMarkup(item.photo)+'</li>').join('');
export function renderPlan(html,product){
 const plan=product.plan;
 if(product.introPhoto?.src)html=html.replace(/(<section\b[^>]*class="cruise-hero"[^>]*>[\s\S]*?<\/section>)/,(_,hero)=>hero+'<div class="wrap">'+photoMarkup(product.introPhoto)+'</div>');
 if(plan?.itinerary)html=html.replace(itineraryPattern,(_,open,old,close)=>open+dayMarkup(plan.itinerary)+close);
 if(plan?.editions)html=html.replace(editionsPattern,(_,open,old,close)=>open+plan.editions.map(edition=>'<details><summary>'+escape(edition.title)+'<b>＋</b></summary>'+paragraph(edition.description)+photoMarkup(edition.photo)+(edition.ownItinerary?paragraph([edition.days,edition.route].filter(Boolean).join(' · '))+'<ol>'+dayMarkup(edition.itinerary)+'</ol>':'')+'</details>').join('')+close);
 if(plan?.voyages){
  if(plan.voyages.every(item=>item.id)){
   const attribute=html.includes('data-explorer-route=')?'explorer':'series';
   html=html.replace(/(<div class="explorer-routes">)[\s\S]*?<\/div>/,(_,open)=>open+plan.voyages.map(item=>`<article class="explorer-route"><p class="eyebrow">${escape(item.duration)}</p><h3>${escape(item.title)}</h3><p class="explorer-stops">${escape(item.stops)}</p>${paragraph(item.description)}${item.itinerary.length?'<ol>'+dayMarkup(item.itinerary)+'</ol>':''}<button type="button" class="button" data-${attribute}-route="${escape(item.id)}" aria-pressed="false">${escape(item.button||'Choose this voyage ↗')}</button></article>`).join('')+'</div>');
  }else{let index=0;html=html.replace(voyagePattern,article=>{const voyage=plan.voyages[index++];return voyage?.itinerary.length?article.replace('</article>',()=>'<ol>'+dayMarkup(voyage.itinerary)+'</ol></article>'):article;});}
  if(plan.shore)html=html.replace(shorePattern,()=>`<details class="explorer-details"><summary>${escape(plan.shoreTitle)}</summary><div class="info-grid three">${plan.shore.map(item=>`<article><h3>${escape(item.title)}</h3>${paragraph(item.description)}</article>`).join('')}</div>${paragraph(plan.shoreNote)}</details>`);
  for(const [key,pattern] of Object.entries(cruiseBlocks)){
   const block=plan.blocks?.[key],off=block?.visible===false||(!plan.voyages.length&&key==='voyages');
   if(!off&&!block?.extra)continue;
   const extra=block?.extra?'<div class="wrap">'+paragraph(block.extra)+'</div>':'';
   if(key==='intro'&&explorerIntro.test(html))html=html.replace(explorerIntro,(_,open,body)=>open+(off?'':body+extra));
   else html=html.replace(pattern,whole=>off?'':whole+extra);
   if(key==='gallery'&&off)html=html.replace(/<section class="wrap ship-gallery-picker"[\s\S]*?<\/section>|<p class="wrap gallery-context">[\s\S]*?<\/p>/g,'');
   if(key==='voyages'&&off)html=html.replace(/(id="series-planner">)<p class="eyebrow">[^<]*<\/p>/,'$1');
   if(key==='inquiry'&&off)html=html.replace(/<button[^>]*data-(?:explorer|series)-route="[^"]+"[^>]*>[\s\S]*?<\/button>/g,'');
  }
  if(!html.includes('id="cruise-inquiry"'))html=html.replace(/<script src="\/yangzi-explorer\.js[^" ]*" defer><\/script>/,'');
 }
 if(html.includes('class="product-inline-photo"'))html=html.replace('</head>','<link rel="stylesheet" href="/editorial-content.css"></head>');
 return html;
}

const bounded=(value,limit)=>typeof value==='string'&&value.length<=limit;
const list=(value,limit,check)=>Array.isArray(value)&&value.length<=limit&&value.every(check);
function imagePath(value){
 if(!bounded(value,1000))return false;
 if(value===''||(/^\/assets\/[^<>"'\\?#]+$/.test(value)&&!value.includes('..'))||/^\/media\/[a-f0-9-]{36}\.webp$/.test(value))return true;
 try{return /^https:\/\/[^<>"'\s]+$/.test(value)&&new URL(value).protocol==='https:';}catch{return false;}
}
const photoValid=photo=>photo&&imagePath(photo.src)&&bounded(photo.alt,300)&&bounded(photo.credit,1000);
const daysValid=items=>list(items,100,item=>item&&bounded(item.title,300)&&item.title.trim()&&bounded(item.description,5000)&&photoValid(item.photo));
export function validateEditorial(product,category,fields,card){
 const copyValid=(values,keys)=>values&&typeof values==='object'&&!Array.isArray(values)&&Object.entries(values).every(([key,value])=>keys.includes(key)&&bounded(value,5000));
 if(product.pageCopy!==undefined&&!copyValid(product.pageCopy,fields.map(field=>field.key)))throw new Error('请检查页面文案。');
 if(product.breadcrumbTitle!==undefined&&(!isEditorialCategory(category)||!bounded(product.breadcrumbTitle,200)))throw new Error('请检查详情页顶部名称。');
 if(product.cardCopy!==undefined&&(!card||!copyValid(product.cardCopy,Object.keys(card))||(product.cardCopy.photo!==undefined&&!imagePath(product.cardCopy.photo))))throw new Error('请检查栏目卡片文字与图片地址。');
 if(product.introPhoto!==undefined&&(!isEditorialCategory(category)||!photoValid(product.introPhoto)))throw new Error('请检查介绍配图。');
 if(product.plan!==undefined){
  const plan=product.plan;
  const valid=category==='silk-road-luxury-trains'?plan&&daysValid(plan.itinerary)&&list(plan.editions,30,item=>item&&bounded(item.title,300)&&item.title.trim()&&bounded(item.description,5000)&&photoValid(item.photo)&&typeof item.ownItinerary==='boolean'&&bounded(item.days,100)&&bounded(item.route,1000)&&daysValid(item.itinerary)):
   category==='yangtze-river-cruises'&&plan&&list(plan.voyages,30,item=>item&&bounded(item.title,300)&&daysValid(item.itinerary)&&(item.id===undefined||(/^[a-z0-9-]{1,80}$/.test(item.id)&&[item.duration,item.stops,item.button,item.description].every(value=>bounded(value,5000)))))&&(!plan.voyages.some(item=>item.id!==undefined)||plan.voyages.every(item=>item.id)&&new Set(plan.voyages.map(item=>item.id)).size===plan.voyages.length)&&(plan.shore===undefined||bounded(plan.shoreTitle,300)&&bounded(plan.shoreNote,5000)&&list(plan.shore,100,item=>item&&bounded(item.title,300)&&bounded(item.description,5000)))&&(plan.blocks===undefined||plan.blocks&&Object.entries(plan.blocks).every(([key,item])=>Object.hasOwn(cruiseBlocks,key)&&item&&typeof item.visible==='boolean'&&bounded(item.extra,5000)));
  if(!valid)throw new Error('请填写路线版本和行程段的名称，并检查配图及文字长度。');
 }
}
