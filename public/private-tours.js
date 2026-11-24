'use strict';
{
 const menu=document.querySelector('.private-menu');
 if(menu){document.addEventListener('click',event=>{if(!menu.contains(event.target))menu.open=false;});document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.open){menu.open=false;menu.querySelector('summary').focus();}});}
}

const regionPanel = document.getElementById('by-region');
if (regionPanel) {
 const links=[...regionPanel.querySelectorAll('.pt-pills a')];
 const cards=regionPanel.querySelectorAll('[data-region]');
 function showSelection(url){
  const region=new URL(url).searchParams.get('region');
  const selected=links.find(link=>new URL(link.href).searchParams.get('region')===region)||links[0];
  const filter=new URL(selected.href).searchParams.get('region');
  for(const link of links){if(link===selected)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');}
  let visible=0;
  for(const card of cards){card.hidden=Boolean(filter&&card.dataset.region!==filter);if(!card.hidden)visible++;}
  regionPanel.querySelector('[data-region-empty]').hidden=visible>0;
  const track=regionPanel.querySelector('.pt-track');
  if(track){track.scrollLeft=0;track.dispatchEvent(new Event('scroll'));}
 }
 regionPanel.addEventListener('click', event => {
  const link = event.target.closest('.pt-pills a');
  if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  if(link.href!==location.href)history.pushState(null,'',link.href);
  showSelection(link.href);
 });
 window.addEventListener('popstate', () => showSelection(location.href));
}

const journeyResults=document.querySelector('#journeys:has(a[data-journey-filter])');
document.querySelectorAll('.pt-film-player video[poster]').forEach(video=>{
 const sync=()=>video.classList.toggle('is-playing',video.currentTime>0);
 for(const event of ['play','pause','ended'])video.addEventListener(event,sync);
 sync();
});
if(journeyResults){
 const key=url=>url.pathname+url.search;
 const cache=new Map([[key(location),journeyResults.cloneNode(true)]]);
 let pending;
 async function selectCollection(url,clicked){
  pending?.abort();const request=new AbortController();pending=request;
  try{
   let section=cache.get(key(url));
   if(!section){
    const response=await fetch(url,{signal:request.signal});if(!response.ok)throw new Error('Journey list unavailable');
    section=new DOMParser().parseFromString(await response.text(),'text/html').getElementById('journeys');
    if(!section)throw new Error('Missing journey list');cache.set(key(url),section);
   }
   if(request.signal.aborted)return;
   if(clicked&&url.href!==location.href)history.pushState(null,'',url.href);
   journeyResults.replaceChildren(...section.cloneNode(true).childNodes);
   journeyResults.querySelectorAll('.pt-slider').forEach(mountSlider);
   if(clicked){journeyResults.focus({preventScroll:true});journeyResults.scrollIntoView({behavior:'instant',block:'start'});}
  }catch(error){if(!request.signal.aborted)location.assign(url.href);}
 }
 document.addEventListener('click',event=>{
  const link=event.target.closest('[data-journey-filter] a,a[data-journey-filter]');
  if(!link||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();selectCollection(new URL(link.href),true);
 });
 window.addEventListener('popstate',()=>selectCollection(new URL(location.href),false));
}
function mountSlider(slider){
 const track=slider.querySelector('.pt-track'),controls=slider.querySelector('.pt-controls');
 const [previous,next]=controls.children;
 function update(){
  const overflow=track.scrollWidth-track.clientWidth;
  controls.hidden=overflow<2;
  previous.disabled=track.scrollLeft<2;
  next.disabled=track.scrollLeft>=overflow-2;
 }
 function step(direction){
  const card=track.querySelector('.pt-card:not([hidden])');
  if(card)track.scrollBy({left:direction*(card.getBoundingClientRect().width+parseFloat(getComputedStyle(track).columnGap)),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 }
 previous.onclick=()=>step(-1);
 next.onclick=()=>step(1);
 track.addEventListener('scroll',update,{passive:true});
 new ResizeObserver(update).observe(track);
 update();
}
document.querySelectorAll('.pt-slider').forEach(mountSlider);

async function enableCardEditing(){
 const flag='sukha-edit-cards';
 if(new URLSearchParams(location.search).get('edit-cards')!=='1'&&!sessionStorage.getItem(flag))return;
 const response=await fetch('/api/team/private-layout',{credentials:'same-origin'});
 if(!response.ok){sessionStorage.removeItem(flag);return;}
 const {layout,tours}=await response.json();
 sessionStorage.setItem(flag,'1');
 const owners=new Map(Object.values(tours).map(item=>[item.href,item.id]));
 for(const [type,section] of [['destinations','destinations'],['styles','travel-styles']]){
  for(const item of layout[type])owners.set(`/private-china-tours/${section}/${item.id}/`,`${type}:${item.id}`);
 }
 const exit=document.createElement('button');exit.type='button';exit.className='pt-exit-editor';exit.textContent='退出卡片编辑';
 exit.onclick=()=>{sessionStorage.removeItem(flag);const url=new URL(location.href);url.searchParams.delete('edit-cards');location.replace(url);};
 document.body.append(exit);
 function attach(){
  for(const link of document.querySelectorAll('main a[href]')){
   const url=new URL(link.href,location.href);
   if(url.origin!==location.origin)continue;
   const collection=url.pathname==='/private-china-tours/signature-journeys/'&&url.searchParams.get('collection');
   const key=collection?`collections:${collection}`:owners.get(url.pathname);
   if(!key)continue;
   const card=link.closest('article')||link;
   if(card.dataset.linkEditor||card===link&&!link.querySelector('img')&&!link.matches('[class*="card"]'))continue;
   card.dataset.linkEditor='1';
   const edit=document.createElement('a');edit.className='pt-edit-product';edit.textContent='＋／－ 关联产品';
   edit.href='/team/card-products.html?card='+encodeURIComponent(key);
   if(card===link){const wrapper=document.createElement('div');wrapper.className='pt-edit-wrap';link.before(wrapper);wrapper.append(link,edit);}else card.append(edit);
  }
 }
 attach();
 const results=document.querySelector('#journeys');if(results)new MutationObserver(attach).observe(results,{childList:true});
}
enableCardEditing().catch(()=>{});
