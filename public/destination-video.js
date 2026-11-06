'use strict';
(()=>{
 const triggers=document.querySelectorAll('[data-film-title]');
 if(!triggers.length)return;
 const dialog=document.createElement('dialog');
 dialog.className='destination-film-dialog';
 dialog.setAttribute('aria-labelledby','destination-film-title');
 dialog.innerHTML='<button class="film-close" type="button" aria-label="Close film">×</button><h2 id="destination-film-title"></h2><video controls playsinline preload="none" hidden></video><iframe title="Official destination film" allow="fullscreen; picture-in-picture" allowfullscreen hidden></iframe><div class="film-external" hidden><p>This film plays on the publisher’s official website.</p><a target="_blank" rel="noopener noreferrer">Watch the official film ↗</a></div><p class="film-credit"></p><p class="film-credit"><a class="film-source" target="_blank" rel="noopener noreferrer">View the original official page ↗</a></p><p class="film-credit" role="status"></p>';
 document.body.append(dialog);
 const video=dialog.querySelector('video'),frame=dialog.querySelector('iframe'),external=dialog.querySelector('.film-external'),status=dialog.querySelector('[role="status"]');
 let trigger;
 triggers.forEach(button=>button.addEventListener('click',()=>{
  trigger=button;const d=button.dataset;
  dialog.querySelector('h2').textContent=d.filmTitle;
  frame.title=d.filmTitle;
  dialog.querySelector('.film-credit').textContent=d.filmCredit;
  dialog.querySelector('.film-source').href=d.filmSource;
  external.querySelector('a').href=d.filmSource;
  video.hidden=!d.filmSrc;frame.hidden=!d.filmFrame;external.hidden=Boolean(d.filmSrc||d.filmFrame);
  dialog.showModal();
  if(d.filmSrc){video.src=d.filmSrc;video.play().catch(()=>{status.textContent='Press play to start, or watch on the official website.';});}
  if(d.filmFrame)frame.src=d.filmFrame;
 }));
 video.addEventListener('error',()=>{status.textContent='The publisher’s stream is unavailable. Please use the official page below.';});
 dialog.querySelector('.film-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 dialog.addEventListener('close',()=>{video.pause();video.removeAttribute('src');video.load();frame.removeAttribute('src');status.textContent='';trigger?.focus();});
})();
