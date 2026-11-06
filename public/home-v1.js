'use strict';
(()=>{
if(!document.body.classList.contains('home-v1'))return;
// Public official samples for this local first draft; replace each section's key as SUKHA films become available.
const films={
 songjiang:{title:'Take a closer look at Songjiang',src:'https://www.meet-in-shanghai.net/en/uploads/2026/11/01/2116725615700135937.mp4',page:'https://www.meet-in-shanghai.net/en/video/',credit:'Official Shanghai tourism sample · Shanghai Municipal Administration of Culture and Tourism. A sample destination film, not SUKHA footage or a film of the product shown.'},
 rural:{title:'A one-day rural getaway in Songjiang',src:'https://www.meet-in-shanghai.net/en/uploads/2026/10/27/2114906646202744833.mp4',page:'https://www.meet-in-shanghai.net/en/video/follow-alex-and-discover-a-oneday-rural-getaway-in-songjiang-635752',credit:'Official Shanghai tourism sample · Shanghai Municipal Administration of Culture and Tourism. A sample destination film, not SUKHA footage or a film of the product shown.'}
};
const dialog=document.querySelector('.home-video-dialog'),video=dialog.querySelector('video'),title=document.getElementById('home-video-title'),source=document.getElementById('home-video-source'),status=document.getElementById('home-video-status');let trigger;
document.querySelectorAll('[data-home-film]').forEach(button=>button.addEventListener('click',()=>{
 const film=films[button.dataset.homeFilm];if(!film)return;trigger=button;title.textContent=film.title;source.href=film.page;document.getElementById('home-video-credit').textContent=film.credit;status.textContent='Loading the official sample film…';video.src=film.src;dialog.showModal();document.body.classList.add('home-video-open');video.load();video.play().catch(()=>{status.textContent='Press play to watch. If playback is unavailable, open the official source below.';});
}));
video.addEventListener('playing',()=>{status.textContent='';});video.addEventListener('error',()=>{status.textContent='This external film is unavailable here. You can watch it on the official tourism website below.';});
dialog.querySelector('.home-video-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();});
dialog.addEventListener('close',()=>{video.pause();video.removeAttribute('src');video.load();status.textContent='';document.body.classList.remove('home-video-open');trigger?.focus();});
if('IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
 const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('home-visible');observer.unobserve(entry.target);}}),{threshold:.08});
 document.body.classList.add('home-motion');document.querySelectorAll('.home-reveal').forEach(el=>observer.observe(el));
}
})();
