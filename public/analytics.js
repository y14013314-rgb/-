'use strict';
(()=>{
 const id='G-VTMK0R2B1W',key='sukha-analytics-consent-v1';
 if(!['sukhatrip.com','www.sukhatrip.com'].includes(location.hostname)||/^\/(team|api|admin|quote)(\/|$)/.test(location.pathname)||new URLSearchParams(location.search).has('team-preview'))return;
 let allowed=false,started=false,pageSent=false;const seen=new Set();
 const read=(storage,k)=>{try{return JSON.parse(globalThis[storage].getItem(k));}catch{return null;}};
 const write=(storage,k,v)=>{try{globalThis[storage].setItem(k,JSON.stringify(v));}catch{}};
 const safeLocation=location.origin+location.pathname;
 let referrer='';try{referrer=new URL(document.referrer).origin+'/';}catch{}
 const debug=new URLSearchParams(location.search).get('analytics_debug')==='1';
 const emit=(name,parameters={})=>{if(allowed&&started)window.gtag('event',name,{send_to:id,page_location:safeLocation,page_referrer:referrer,page_title:'SUKHA Travel',...(debug?{debug_mode:true}:{}),...parameters});};
 function start(){
  allowed=true;window['ga-disable-'+id]=false;
  if(!started){
   started=true;window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments);};
   window.gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
   window.gtag('consent','update',{analytics_storage:'granted'});
   window.gtag('js',new Date());
   window.gtag('config',id,{send_page_view:false,page_location:safeLocation,page_referrer:referrer,page_title:'SUKHA Travel',allow_google_signals:false,allow_ad_personalization_signals:false});
   const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+id;document.head.append(script);
  }
  if(!pageSent){pageSent=true;emit('page_view');
   const match=location.pathname.match(/^\/(journeys|silk-road-luxury-trains|yangtze-river-cruises)\/([a-z0-9-]{1,60})\/$/);
   if(match)emit('view_item',{items:[{item_id:match[2],item_category:match[1]}]});
  }
 }
 const panel=document.createElement('section');panel.id='analytics-consent';panel.setAttribute('aria-label','Optional analytics');
 panel.innerHTML='<div>May we use optional Google Analytics cookies to understand visits and enquiries? You can refuse and still use the website. <a href="/privacy/">Privacy Policy</a></div><div class="analytics-actions"><button type="button" data-analytics-choice="accepted">Accept analytics</button><button type="button" data-analytics-choice="rejected">Reject analytics</button></div>';
 const settings=document.createElement('button');settings.type='button';settings.id='analytics-settings';settings.textContent='Cookie settings';settings.setAttribute('aria-controls','analytics-consent');
 settings.onclick=()=>{panel.hidden=false;panel.querySelector('button').focus();};
 document.body.append(panel,settings);
 function reject(){
  const reload=started;allowed=false;window['ga-disable-'+id]=true;
  if(reload){
   for(const part of document.cookie.split(';')){const name=part.trim().split('=')[0];if(!/^_ga(?:_|$)/.test(name))continue;
    for(const domain of ['',location.hostname,'.'+location.hostname,'.sukhatrip.com'])document.cookie=name+'=; Max-Age=0; Path=/'+(domain?'; Domain='+domain:'')+'; Secure; SameSite=Lax';
   }
   location.reload();
  }
 }
 panel.querySelectorAll('[data-analytics-choice]').forEach(button=>button.onclick=()=>{
  const choice=button.dataset.analyticsChoice;write('localStorage',key,{choice,expires:Date.now()+180*86400000});panel.hidden=true;
  if(choice==='accepted')start();else reject();settings.focus();
 });
 const pref=read('localStorage',key);panel.hidden=Boolean(pref&&pref.expires>Date.now()&&['accepted','rejected'].includes(pref.choice));
 if(panel.hidden&&pref.choice==='accepted')start();
 window.addEventListener('storage',e=>{if(e.key!==key)return;const pref=read('localStorage',key);if(pref?.choice==='accepted'&&pref.expires>Date.now()){panel.hidden=true;start();}else{panel.hidden=false;reject();}});
 window.SukhaAnalytics={lead(result){
  if(result?.saved!==true||!/^INQ-[A-F0-9]{8}(?:-[A-F0-9]{4}){3}-[A-F0-9]{12}$/.test(result.reference))return;
  const stored=read('sessionStorage','sukha-analytics-leads');const saved=Array.isArray(stored)?stored:[];
  if(seen.has(result.reference)||saved.includes(result.reference))return;
  seen.add(result.reference);
  // Remember handling locally so a notification retry cannot count an old lead.
  write('sessionStorage','sukha-analytics-leads',[...saved,result.reference].slice(-100));
  emit('generate_lead');
 }};
 document.addEventListener('click',event=>{
  const a=event.target.closest('a');if(!a)return;let url;try{url=new URL(a.href,location.href);}catch{return;}
  const channel=url.protocol==='mailto:'?'email':url.hostname==='wa.me'?'whatsapp':['work.weixin.qq.com','weixin.qq.com'].includes(url.hostname)?'wechat':null;
  if(channel)emit('contact_click',{contact_channel:channel});
 });
})();
