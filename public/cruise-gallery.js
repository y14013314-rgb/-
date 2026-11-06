'use strict';
(()=>{
const hero=document.querySelector('.cruise-hero');if(!hero)return;
const track=hero.querySelector('.cruise-hero-track'),dotBar=hero.querySelector('.cruise-hero-dots'),status=hero.querySelector('.cruise-hero-status'),credit=hero.querySelector('.cruise-photo-credit');
let cleanup=()=>{};
function mount(){
 cleanup();
 const slides=[...track.children],dots=[...dotBar.children],count=slides.length,events=new AbortController(),options={signal:events.signal};
 if(count<2)return;
 function copy(slide){const clone=slide.cloneNode(true);clone.setAttribute('aria-hidden','true');clone.inert=true;clone.querySelectorAll('img').forEach(img=>img.loading='lazy');return clone;}
 track.prepend(copy(slides[count-1]));track.append(copy(slides[0]));
 let current=0,frame=0,settleTimer;
 const wrap=i=>(i%count+count)%count;
 function sync(){if(!track.clientWidth)return;current=wrap(Math.round(track.scrollLeft/track.clientWidth)-1);dots.forEach((dot,i)=>dot.setAttribute('aria-current',String(i===current)));status.textContent=`${current+1} / ${count}`;credit.textContent=slides[current].dataset.credit||'Cruise brochure image';}
 function settle(){const position=Math.round(track.scrollLeft/track.clientWidth);if(position===0)track.scrollTo({left:count*track.clientWidth,behavior:'instant'});else if(position===count+1)track.scrollTo({left:track.clientWidth,behavior:'instant'});sync();}
 function move(physical){track.scrollTo({left:physical*track.clientWidth,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
 hero.querySelector('.cruise-hero-prev').addEventListener('click',()=>{settle();move(current);},options);
 hero.querySelector('.cruise-hero-next').addEventListener('click',()=>{settle();move(current+2);},options);
 dots.forEach((dot,i)=>dot.addEventListener('click',()=>move(i+1),options));
 track.addEventListener('keydown',e=>{if(e.target!==track)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();settle();move(current+(e.key==='ArrowRight'?2:0));}},options);
 track.addEventListener('scroll',()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(sync);clearTimeout(settleTimer);settleTimer=setTimeout(settle,180);},{...options,passive:true});
 track.addEventListener('scrollend',settle,options);
 const observer=new ResizeObserver(()=>{track.scrollTo({left:(current+1)*track.clientWidth,behavior:'instant'});sync();});observer.observe(track);
 track.scrollTo({left:track.clientWidth,behavior:'instant'});sync();
 cleanup=()=>{events.abort();observer.disconnect();cancelAnimationFrame(frame);clearTimeout(settleTimer);};
}
const data=document.getElementById('ship-gallery-data');
if(data){
 const galleries=JSON.parse(data.textContent),prototype=track.firstElementChild.cloneNode(true),picker=[...document.querySelectorAll('[data-gallery-ship]')],ship=document.getElementById('series-ship');let selected='Gold 3';
 function show(name){
  if(!galleries[name]||name===selected)return;
  cleanup();selected=name;
  const items=galleries[name];
  track.replaceChildren(...items.map((item,i)=>{const slide=prototype.cloneNode(true);slide.dataset.credit=item.credit;slide.setAttribute('aria-label',`${i+1} of ${items.length}`);const img=slide.querySelector('img');img.src=item.src;img.alt=item.title;img.loading=i?'lazy':'eager';img.removeAttribute('fetchpriority');const heading=slide.querySelector('h1,h2'),replacement=document.createElement(i?'h2':'h1');replacement.textContent=item.title;heading.replaceWith(replacement);return slide;}));
  dotBar.replaceChildren(...items.map((item,i)=>{const dot=document.createElement('button');dot.type='button';dot.setAttribute('aria-label',`Image ${i+1}: ${item.title}`);return dot;}));
  picker.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.galleryShip===name)));
  document.getElementById('ship-gallery-note').textContent=['Gold 2','Gold 5'].includes(name)?`${name} · Destination scenery and labelled AI illustrations. Vessel and cabin photographs are not included in the supplied materials.`:`${name} · Ship and destination images from the supplied brochure. Facilities vary by cabin and sailing.`;
  mount();
 }
 picker.forEach(b=>b.addEventListener('click',()=>{const name=b.dataset.galleryShip;show(name);if(ship&&ship.value!==name){ship.value=name;ship.dispatchEvent(new Event('change',{bubbles:true}));}}));
 ship?.addEventListener('change',()=>show(ship.value));
}
mount();
})();
