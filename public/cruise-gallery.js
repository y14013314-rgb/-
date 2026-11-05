'use strict';
(()=>{
const hero=document.querySelector('.cruise-hero');if(!hero)return;
const track=hero.querySelector('.cruise-hero-track'),slides=[...track.children],dots=[...hero.querySelectorAll('.cruise-hero-dots button')],status=hero.querySelector('.cruise-hero-status');
let current=0,frame=0;
function sync(){current=Math.max(0,Math.min(slides.length-1,Math.round(track.scrollLeft/track.clientWidth)));dots.forEach((dot,i)=>dot.setAttribute('aria-current',String(i===current)));status.textContent=`${current+1} / ${slides.length}`;}
function go(index){const next=(index+slides.length)%slides.length;track.scrollTo({left:next*track.clientWidth,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
hero.querySelector('.cruise-hero-prev').addEventListener('click',()=>go(current-1));
hero.querySelector('.cruise-hero-next').addEventListener('click',()=>go(current+1));
dots.forEach((dot,i)=>dot.addEventListener('click',()=>go(i)));
track.addEventListener('keydown',e=>{if(e.target!==track)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();go(current+(e.key==='ArrowRight'?1:-1));}});
track.addEventListener('scroll',()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(sync);},{passive:true});
new ResizeObserver(()=>{track.scrollTo({left:current*track.clientWidth,behavior:'instant'});sync();}).observe(track);
sync();
})();
