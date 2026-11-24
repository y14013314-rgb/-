'use strict';
(()=>{
 const form=document.getElementById('cruise-inquiry');if(!form)return;
 const ship=document.getElementById('cruise-ship'),title=document.title.replace(/\s*\|\s*SUKHA\s*$/i,'');
 const rail=form.dataset.type==='rail';
 if(!rail)ship.textContent=document.querySelector('[data-gallery-ship][aria-pressed="true"]')?.dataset.galleryShip||title;
 document.querySelectorAll('[data-gallery-ship]').forEach(picker=>picker.addEventListener('click',()=>{ship.textContent=picker.dataset.galleryShip;}));
 const buttons=[...document.querySelectorAll('[data-explorer-route],[data-series-route]')].map(button=>{const card=button.closest('article');return {button,label:button.textContent,name:card.querySelector('h3').textContent,route:card.querySelector('.explorer-stops').textContent,duration:card.querySelector('.eyebrow').textContent};});
 let route=buttons[0];
 function choose(next){route=next;document.getElementById('cruise-voyage').textContent=route?[route.name,route.duration].filter(Boolean).join(' · '):'';for(const item of buttons){const active=item===route;item.button.setAttribute('aria-pressed',String(active));item.button.textContent=active?'Selected ✓':item.label;}}
 for(const item of buttons)item.button.addEventListener('click',()=>{choose(item);form.parentElement.scrollIntoView({block:'start'});});choose(route);
 form.addEventListener('submit',event=>{event.preventDefault();const fields=new FormData(form),value=key=>String(fields.get(key)||'').trim();
  const page=rail?new URL(document.querySelector('link[rel="canonical"]').href):location;
  const summary=[`${rail?'Train':'Ship'}: ${ship.textContent}`,...(route?[`Voyage: ${route.name}`,`Route: ${route.route}`,`Duration: ${route.duration}`]:[]),`Preferred departure: ${value('departure')||'Flexible'}`,`Cabin: ${value('cabin')||'Not specified'}`,`Extension: ${value('extension')||'Not specified'}`,`Adults: ${value('adults')}`,`Children: ${value('children')}`,`Children’s ages: ${value('ages')||'Not specified'}`,`Name: ${value('name')}`,`Reply email: ${value('email')}`,`${rail?'Train':'Cruise'} page: ${page.origin}${page.pathname}`].join('\n');
  form.dispatchEvent(new CustomEvent('cruise-review',{detail:{summary,name:value('name'),email:value('email').toLowerCase(),consent:fields.has('consent'),type:rail?'rail':'cruise'}}));
 });
})();
