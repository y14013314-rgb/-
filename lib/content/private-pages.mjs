import {privateState} from './private-layout.mjs';
import {base,regions,facets} from './private-seed.mjs';
import {shell,sections,inquiry,escape} from './private-shell.mjs';
import {photoStrip} from './gallery.mjs';
import {withAnalytics} from './analytics.mjs';
import {session} from './auth.mjs';
import {pageDefaults,dayRows,routeSection,daySection,filmSection,pageEnding} from './private-editorial.mjs';
const grid=items=>items.length?`<div class="pt-grid">${items.join('')}</div>`:'';
function rail(cards,label){
 if(!cards.length)return '';
 return `<div class="pt-slider"><div class="pt-controls" hidden><button type="button" aria-label="Previous ${escape(label)}">←</button><button type="button" aria-label="Next ${escape(label)}">→</button></div><div class="pt-track" tabindex="0" role="region" aria-label="${escape(label)}">${cards.join('')}</div></div>`;
}
const block=(title,content)=>content?`<section><h2>${escape(title)}</h2>${content}</section>`:'';
function destinationStory(story){
 if(!story||!Object.values(story).some(value=>value.trim()))return '';
 const text=(tag,value,cls='')=>value.trim()?`<${tag}${cls}>${escape(value)}</${tag}>`:'';
 return `<section class="pt-story"><div>${text('p',story.eyebrow,' class="eyebrow"')}${text('h2',story.title)}</div><div>${text('p',story.body)}<div class="pt-story-tags">${text('span',story.tag1)}${text('span',story.tag2)}</div></div></section>`;
}
const image=(src,alt,hero=false)=>src?`<img class="${hero?'pt-hero':'pt-cover'}" src="${escape(src)}" alt="${escape(alt)}"${hero?'':' loading="lazy"'}>`:'';
function card(item,attributes=''){return `<article class="pt-card"${attributes}><a href="${escape(item.href)}">${image(item.image,'')}<strong>${escape(item.title)}</strong>${item.days||item.summary?`<small>${escape(item.days?item.days+' days':item.summary)}</small>`:''}</a></article>`;}
export function privatePage(state,url){
 const {layout,tours}=state,[section,id,...extra]=url.pathname.slice(base.length).split('/').filter(Boolean);
 if(!Object.hasOwn(sections,section)||extra.length)return null;
 const path=base+section+'/',isDest=section==='destinations',isStyle=section==='travel-styles';
 const preview=url.searchParams.has('layout-preview'),suffix=preview?'?layout-preview=1':'';
 const overview=layout.overviews[section];
 const tourGrid=ids=>rail(ids.filter(key=>Object.hasOwn(tours,key)).map(key=>card({...tours[key],href:tours[key].href+'?via='+encodeURIComponent(url.pathname)})),'journeys');
 const render=(title,intro,body,copy={...pageDefaults,...overview.editorial})=>withAnalytics(pageEnding(shell(title,intro,url.origin+url.pathname,body),copy,title));
 const page=(title,intro,body)=>render(title,intro,`<div class="pt-index"><p class="eyebrow"><a href="/">SUKHA</a> / PRIVATE TOURS / <a href="${path}${suffix}">${sections[section]}</a></p><h1>${escape(title)}</h1><p class="lede">${escape(intro)}</p></div>${body}`);
 const records=isDest?layout.destinations:layout.styles;
 const guideGrid=ids=>rail(ids.map(key=>records.find(item=>item.id===key)).filter(Boolean).map(item=>card({...item,href:path+item.id+'/'+suffix})),sections[section]);
 if(id){
  const item=(isDest||isStyle)&&records.find(item=>item.id===id);if(!item)return null;
  const area=isDest?item.title:'';
  const original=isDest&&state.originals?.[id];
  const destinationInfo=isDest?block('Top Experiences',grid(item.experiences.map(exp=>`<article class="pt-card">${image(exp.image,'')}<strong>${escape(exp.title)}</strong></article>`))):'';
  const custom=item.hero||{};
  const story=custom.storyTitle??(isDest?'Why visit '+item.title+'?':'The Story');
  const extras=(item.extraPhotos||[]).map(image=>({image,title:item.title}));
  const photos=[item,...extras].filter((entry,index,all)=>entry?.image&&all.findIndex(other=>other?.image===entry.image)===index).slice(0,10).map(entry=>({src:entry.image,alt:entry.title}));
  const back=custom.back??'← All '+sections[section].toLowerCase(),button=custom.button??'Explore the story ↓';
  const hero=`${back?`<div class="pt-back"><a href="${path}${suffix}">${escape(back)}</a></div>`:''}<div class="pt-banner">${photoStrip(photos)}<div class="pt-caption"><p class="eyebrow">${escape(custom.eyebrow??'Private Tours / '+sections[section])}</p><h1>${escape(item.title)}</h1><p>${escape(custom.subtitle??(isDest?item.region:'Travel Style'))}</p>${button?`<a class="pt-story-link" href="#story">${escape(button)}</a>`:''}</div></div>`;
  const copy={...pageDefaults,...(isDest?state.guidePlans?.[id]:{}),...item.editorial};
  const intro=`<section id="story" class="pt-visit"><div><h2>${escape(story)}</h2><p>${escape(item.intro)}</p></div>${isDest&&item.season?`<aside><h3>Best Time to Visit</h3><p>${escape(item.season)}</p>${inquiry(item.title,area)}</aside>`:''}</section>`;
  const prose=isDest&&id!=='beijing'&&!dayRows(item.story?.body).length?destinationStory(item.story):'';
  return render(item.title+(isDest?' Travel Guide':''),item.intro,hero+filmSection(copy,item.image)+intro+destinationInfo+prose+routeSection(copy)+daySection(copy)+block(isDest?'Recommended Tours':'Recommended Journeys',tourGrid(item.tours)+(original?`<p><a href="${escape(original)}">Explore our local itinerary for ${escape(item.title)} →</a></p>`:'')),copy);
 }
 if(isDest){
  const destinationGroup=(key,title,limit)=>{
   const ids=layout[key],more=key==='deep'?guideGrid(ids.slice(limit)):'';
   const disclosure=more?`<details class="pt-more"><summary><span class="pt-show">Show More</span><span class="pt-hide">Show Less</span></summary>${more}</details>`:'';
   return `<section id="${key}"><h2>${escape(title)}</h2>${guideGrid(ids.slice(0,limit))||'<p>No destinations listed yet.</p>'}${disclosure}</section>`;
  };
  const region=url.searchParams.get('region'),valid=regions.includes(region);
  const pills=['All China',...regions].map(label=>{
   const params=new URLSearchParams(suffix);if(label!=='All China')params.set('region',label);
   return `<a ${label===(valid?region:'All China')?'aria-current="true"':''} href="${path}${params.size?'?'+escape(params):''}#by-region">${label}</a>`;
  }).join('');
  const places=[...layout.popular,...layout.deep,...layout.other].map(key=>records.find(item=>item.id===key)).filter(Boolean);
  const cards=rail(places.map(item=>card({...item,href:path+item.id+'/'+suffix},` data-region="${escape(item.region)}"${valid&&item.region!==region?' hidden':''}`)),'destinations by region');
  const regional=`<section id="by-region"><h2>${escape(overview.region)}</h2><div class="pt-pills">${pills}</div>${cards}<p data-region-empty${places.some(item=>!valid||item.region===region)?' hidden':''}>No destinations in this region yet.</p></section>`;
  return page(overview.title,overview.intro,destinationGroup('popular',overview.popular,6)+destinationGroup('deep',overview.deep,3)+regional);
 }
 if(isStyle){
  const cards=layout.themes.slice(0,6).map(key=>records.find(item=>item.id===key)).filter(Boolean)
   .map(item=>card({...item,href:path+item.id+'/'+suffix}));
  return page(overview.title,overview.intro,block(overview.themes,`<div class="pt-track pt-theme-grid">${cards.join('')}</div>`));
 }
 const groups=layout.series.map(key=>layout.collections.find(item=>item.id===key)).filter(Boolean),selected=groups.find(item=>item.id===url.searchParams.get('collection'));
 const matched=[...new Set((selected?[selected]:groups).flatMap(item=>item.tours))].filter(key=>Object.entries(facets).every(([facet,choices])=>!choices.includes(url.searchParams.get(facet))||layout.tags[key]?.[facet]?.includes(url.searchParams.get(facet))));
 return page(overview.title,overview.intro,block(overview.collections,rail(groups.map(item=>card({...item,href:path+'?collection='+item.id+(preview?'&layout-preview=1':'')+'#journeys'},' data-journey-filter')),'collections'))+`<section id="journeys" tabindex="-1"><h2>${escape(overview.journeys)}</h2>${tourGrid(matched)||'<p>No matches. Explore all journeys or ask us to design a private journey.</p>'}<a data-journey-filter href="${path}${suffix}#journeys">View all journeys</a></section>`);
}
export async function privateRequest({request,env}){
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
 const url=new URL(request.url),preview=url.searchParams.has('layout-preview');
 if(preview&&(!env.TEAM_DB||!await session(request,env)))return new Response('Sign in to preview this draft.',{status:401,headers:{'Cache-Control':'no-store'}});
 if(!url.pathname.endsWith('/')){url.pathname+='/';return Response.redirect(url.href,301);}
 const html=privatePage(await privateState(env.TEAM_DB,preview),url);
 return new Response(request.method==='HEAD'?null:html||'Page not found',{status:html?200:404,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',...(preview?{'X-Robots-Tag':'noindex, nofollow'}:{})}});
}
