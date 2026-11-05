'use strict';
(()=>{
const hero=document.querySelector('.cruise-hero');if(!hero)return;
const track=hero.querySelector('.cruise-hero-track'),slides=[...track.children],dots=[...hero.querySelectorAll('.cruise-hero-dots button')],status=hero.querySelector('.cruise-hero-status'),credit=hero.querySelector('.cruise-photo-credit'),count=slides.length;
if(count<2)return;
// An offscreen copy at each end lets touch swipes continue through either edge.
function copy(slide){const clone=slide.cloneNode(true);clone.setAttribute('aria-hidden','true');clone.inert=true;clone.querySelectorAll('img').forEach(img=>img.loading='eager');return clone;}
track.prepend(copy(slides[count-1]));track.append(copy(slides[0]));
let current=0,frame=0,settleTimer;
const wrap=i=>(i%count+count)%count;
function sync(){if(!track.clientWidth)return;current=wrap(Math.round(track.scrollLeft/track.clientWidth)-1);dots.forEach((dot,i)=>dot.setAttribute('aria-current',String(i===current)));status.textContent=`${current+1} / ${count}`;credit.textContent=slides[current].dataset.credit||'Images from the Yangzi Explorer brochure';}
function settle(){const position=Math.round(track.scrollLeft/track.clientWidth);if(position===0)track.scrollTo({left:count*track.clientWidth,behavior:'instant'});else if(position===count+1)track.scrollTo({left:track.clientWidth,behavior:'instant'});sync();}
function move(physical){track.scrollTo({left:physical*track.clientWidth,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
hero.querySelector('.cruise-hero-prev').addEventListener('click',()=>{settle();move(current);});
hero.querySelector('.cruise-hero-next').addEventListener('click',()=>{settle();move(current+2);});
dots.forEach((dot,i)=>dot.addEventListener('click',()=>move(i+1)));
track.addEventListener('keydown',e=>{if(e.target!==track)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();settle();move(current+(e.key==='ArrowRight'?2:0));}});
track.addEventListener('scroll',()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(sync);clearTimeout(settleTimer);settleTimer=setTimeout(settle,180);},{passive:true});
track.addEventListener('scrollend',settle);
new ResizeObserver(()=>{track.scrollTo({left:(current+1)*track.clientWidth,behavior:'instant'});sync();}).observe(track);
track.scrollTo({left:track.clientWidth,behavior:'instant'});sync();
})();
