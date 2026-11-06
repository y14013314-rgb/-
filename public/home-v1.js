'use strict';
(()=>{
 if(!document.body.classList.contains('home-v1'))return;
 const hero=document.querySelector('.home-hero'),slides=[...hero.querySelectorAll('[data-slide]')],dots=[...hero.querySelectorAll('[data-slide-to]')],pause=hero.querySelector('[data-slide-pause]');
 const motion=matchMedia('(prefers-reduced-motion: reduce)');let index=0,paused=motion.matches,timer,revision=0;
 const updatePause=()=>{pause.textContent=paused?'▶':'Ⅱ';pause.setAttribute('aria-label',paused?'Play slideshow':'Pause slideshow');};
 const stop=()=>{paused=true;clearTimeout(timer);updatePause();};
 const schedule=()=>{clearTimeout(timer);if(!paused&&!document.hidden)timer=setTimeout(()=>show((index+1)%slides.length),7000);};
 async function show(next,announce=false){
  const turn=++revision,img=slides[next].querySelector('img');
  if(img.dataset.src){img.srcset=img.dataset.srcset;img.src=img.dataset.src;delete img.dataset.src;try{await img.decode();}catch{}}
  if(turn!==revision)return;
  index=next;slides.forEach((slide,i)=>{slide.classList.toggle('is-active',i===index);slide.setAttribute('aria-hidden',String(i!==index));slide.inert=i!==index;dots[i].setAttribute('aria-pressed',String(i===index));});
  if(announce)document.querySelector('#home-slide-status').textContent=`Slide ${index+1} of ${slides.length}`;
  schedule();
 }
 const manual=next=>{stop();show((next+slides.length)%slides.length,true);};
 hero.querySelector('[data-slide-prev]').addEventListener('click',()=>manual(index-1));hero.querySelector('[data-slide-next]').addEventListener('click',()=>manual(index+1));
 dots.forEach((dot,i)=>dot.addEventListener('click',()=>manual(i)));
 pause.addEventListener('click',()=>{paused=!paused;updatePause();schedule();});
 hero.addEventListener('pointerenter',()=>clearTimeout(timer));hero.addEventListener('pointerleave',schedule);
 hero.addEventListener('focusin',event=>{if(event.target!==pause)stop();});hero.addEventListener('pointerdown',event=>{if(!pause.contains(event.target))stop();});
 hero.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();manual(index+(event.key==='ArrowRight'?1:-1));}});
 motion.addEventListener('change',event=>{if(event.matches)stop();});document.addEventListener('visibilitychange',schedule);updatePause();schedule();
 const form=document.querySelector('#home-quick-inquiry'),review=document.querySelector('#home-inquiry-review'),summary=document.querySelector('#home-request-text');
 const fields=[...form.querySelectorAll('[required]')];
 function validate(field){
  let message='';if(!field.validity.valid){message=field.type==='checkbox'?'Please agree to the Privacy Policy before continuing.':field.type==='email'?(field.value?'Enter a valid email address.':'Please enter your email address.'):'Please choose a travel interest.';}
  document.querySelector('#'+field.id+'-error').textContent=message;field.setAttribute('aria-invalid',String(Boolean(message)));return !message;
 }
 fields.forEach(field=>{field.addEventListener('input',()=>{if(field.hasAttribute('aria-invalid'))validate(field);});});
 form.addEventListener('submit',event=>{
  event.preventDefault();const valid=fields.map(validate);if(valid.includes(false)){document.querySelector('#home-form-status').textContent='Please check the highlighted fields.';fields[valid.indexOf(false)].focus();return;}
  if(!window.SukhaInquiry){document.querySelector('#home-form-status').textContent='We could not prepare your request. Please contact Devin using the WhatsApp link beside this form.';return;}
  const lines=['SUKHA — Custom journey enquiry'];for(const [label,value] of new FormData(form)){if(value.trim())lines.push(label+': '+value.trim());}lines.push('Please prepare a personalised quotation.');summary.value=lines.join('\n');
  document.querySelector('#home-send-whatsapp').href=window.SukhaInquiry.whatsappUrl(summary.value);form.hidden=true;review.hidden=false;document.querySelector('#home-review-heading').focus();
 });
 document.querySelector('#home-copy-request').addEventListener('click',async()=>{try{await window.SukhaInquiry.copy(summary.value);document.querySelector('#home-copy-status').textContent='Copied. Open WeChat, paste your request, then send it to Devin.';}catch{summary.focus();summary.select();document.querySelector('#home-copy-status').textContent='Copying is unavailable. Select and copy your request above, then paste and send it in WeChat.';}});
 document.querySelector('#home-edit-request').addEventListener('click',()=>{review.hidden=true;form.hidden=false;document.querySelector('#home-interest').focus();});
 document.querySelectorAll('[data-home-inquiry]').forEach(link=>link.addEventListener('click',()=>{document.querySelector('#navigation').classList.remove('open');document.querySelector('#menu-toggle').setAttribute('aria-expanded','false');}));
})();
