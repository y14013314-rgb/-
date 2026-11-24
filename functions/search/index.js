import seed from '../../lib/content/search-seed.mjs';
import {entryFor,pathFor,renderContent} from '../../lib/content/catalog-product.mjs';
import {stateFromRows} from '../../lib/content/private-layout.mjs';
import {privatePage} from '../../lib/content/private-pages.mjs';
import {base} from '../../lib/content/private-seed.mjs';
import {escape,sections,shell} from '../../lib/content/private-shell.mjs';
import {withAnalytics} from '../../lib/content/analytics.mjs';
import {indexPage,pageScope,scopeLabels,searchForm} from '../../lib/content/search-ui.mjs';

const normalize=value=>value.toLowerCase().normalize('NFKD').replace(/\p{M}/gu,'').replace(/[’']/g,'');
const productTypes={journeys:'Private Journey','silk-road-luxury-trains':'Train Journey','yangtze-river-cruises':'River Cruise',destinations:'Destination',experiences:'Experience','signature-experiences':'Signature Experience',wildlife:'Wildlife Experience','travel-styles':'Travel Style'};
function productType(path){
 const [,area,section,id]=path.split('/');
 return area==='private-china-tours'?(id?productTypes[section]:''):(section?productTypes[area]:'');
}
export function findPages(query,scope,rows,origin){
 const terms=normalize(query).trim().split(/\s+/).filter(Boolean);if(!terms.length)return [];
 const accepts=path=>scope==='all'||pageScope(path)===scope||(scope==='private-china-tours'&&['signature-journeys','destinations','travel-styles'].includes(pageScope(path)));
 const pages=new Map(seed.filter(page=>accepts(page.path)).map(page=>[page.path,page]));
 for(const row of rows){
  if(row.slug==='@private-tours-layout')continue;
  const product=row.published?JSON.parse(row.published):entryFor(row.slug)?.product;
  if(!product||!entryFor(product))continue;
  const path=pathFor(product);if(!accepts(path))continue;
  if(row.is_hidden)pages.delete(path);
  else if(row.published)pages.set(path,indexPage(path,renderContent(product,origin)));
 }
 if(['all','private-china-tours',...Object.keys(sections)].includes(scope)){
  const state=stateFromRows(rows),layout=state.layout;
  for(const section of Object.keys(sections)){
   const path=base+section+'/';if(!accepts(path))continue;
   const ids=section==='destinations'?layout.destinations.map(item=>item.id):section==='travel-styles'?layout.styles.map(item=>item.id):[];
   for(const id of ['',...ids]){const href=path+(id?id+'/':'');pages.set(href,indexPage(href,privatePage(state,new URL(href,origin))));}
  }
 }
 const matches=[];
 for(const {path,title,body,image} of pages.values()){
  const heading=normalize(title),content=normalize(body);
  if(!terms.every(term=>heading.includes(term)||content.includes(term)))continue;
  matches.push({path,title,image,type:productType(path),score:terms.filter(term=>heading.includes(term)).length});
 }
 return matches.sort((left,right)=>right.score-left.score||left.title.localeCompare(right.title));
}
export async function onRequest({request,env}){
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
 const url=new URL(request.url),scope=url.searchParams.get('scope')||'all',query=(url.searchParams.get('q')||'').trim().slice(0,160);
 if(!Object.hasOwn(scopeLabels,scope))return new Response('Unknown search section',{status:400});
 const rows=query&&env.TEAM_DB?(await env.TEAM_DB.prepare('SELECT slug,published,is_hidden FROM product_content WHERE published IS NOT NULL OR is_hidden=1').all()).results:[];
 const matches=findPages(query,scope,rows,url.origin);
 const products=matches.filter(item=>item.type),pages=matches.filter(item=>!item.type);
 const cards=products.length?`<div class="pt-grid search-cards">${products.map(item=>`<article class="pt-card"><a href="${escape(item.path)}">${item.image?`<img class="pt-cover" src="${escape(item.image)}" alt="" loading="lazy">`:''}<small>${escape(item.type)}</small><strong>${escape(item.title)}</strong></a></article>`).join('')}</div>`:'';
 const other=pages.length?`<details class="search-pages"${products.length?'':' open'}><summary>Website pages (${pages.length})</summary><ul>${pages.map(item=>`<li><a href="${escape(item.path)}">${escape(item.title)}</a></li>`).join('')}</ul></details>`:'';
 const result=query?`<p>${matches.length} ${matches.length===1?'result':'results'} for “${escape(query)}” in ${escape(scopeLabels[scope])}.</p>`+(cards+other||'<p>Try another keyword or a shorter phrase.</p>'):'';
 const html=shell('Search results','Search '+scopeLabels[scope],url.origin+'/search/',`<div class="search-results"><h1>Search results</h1>${searchForm(scope,query)}${result}</div>`).replace('</head>','<link rel="stylesheet" href="/site-search.css"></head>');
 return new Response(request.method==='HEAD'?null:withAnalytics(html),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, follow'}});
}
