import {inquiryForm} from './cruise-inquiry.mjs';
import {photoStrip} from './gallery.mjs';

export function railDetail(html,product){
 const title=product.title.replace(/[&<>]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[char]));
 const inquiry=`<section class="wrap section"><div class="explorer-config" aria-label="Train inquiry">${inquiryForm(true,title,product.inquiryCopy)}</div></section>`;
 html=html.replace(/(<section class="final-cta">[\s\S]*?<\/section>)/,(_,cta)=>inquiry+cta);
 let assets='<link rel="stylesheet" href="/cruise-inquiry.css"><script src="/cruise-inquiry.js?v=rail-1" defer></script>';
 if(!html.includes('href="/yangzi-explorer.css"'))assets='<link rel="stylesheet" href="/yangzi-explorer.css">'+assets;
 if(product.railMedia==='gallery'){
  const gallery=`<section class="wrap section rail-photos"><h2>Journey in pictures</h2>${photoStrip(product.railPhotos)}</section>`;
  html=html.replace(/<section class="wrap section rail-film">[\s\S]*?<\/section>/,()=>gallery);
  assets+='<link rel="stylesheet" href="/tour-photos.css"><script src="/tour-photos.js?v=manual-gallery-1" defer></script>';
 }
 return html.replace(/pages-inquiry\.js\?v=[\w-]+/g,'pages-inquiry.js?v=rail-1').replace('</head>',assets+'</head>');
}
