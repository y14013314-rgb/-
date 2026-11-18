const escape=value=>String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const decode=value=>value.replace(/&(amp|lt|gt|quot|#39);/g,(_,entity)=>({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'"}[entity]));
const slidesPattern=/<article\b[^>]*class="cruise-hero-slide"[^>]*>[\s\S]*?<\/article>/g;
function imageKey(src){
 try{
  const url=new URL(src,'https://sukhatrip.com');
  if(url.hostname==='www.sukhatrip.com')url.hostname='sukhatrip.com';
  url.hash='';return url.href;
 }catch{return src;}
}
export function editableGallery(product,template){
 if(product.galleryUnified)return product.gallery;
 const slides=template.match(slidesPattern)||[];
 const images=[...(template.match(/<main\b[\s\S]*?<\/main>/)?.[0]||'').matchAll(/<img\b[^>]*src="\{\{CMS_(field\d+)\}\}"[^>]*>/g)];
 const fixed=product.image?[{...product.image,sourceIndex:0}]:images.map((match,index)=>({src:product.values[match[1]],alt:product.values[match[0].match(/alt="\{\{CMS_(field\d+)\}\}"/)?.[1]]||'',credit:decode(slides[index]?.match(/data-credit="([^"]*)"/)?.[1]||''),sourceIndex:index}));
 const originals=new Map(fixed.filter(item=>item.src).map(item=>[imageKey(item.src),item])),merged=new Map();
 for(const item of [...(product.gallery||[]),...fixed]){
  if(!item.src)continue;
  const key=imageKey(item.src),original=originals.get(key);
  if(!merged.has(key))merged.set(key,{...(original||{}),src:item.src,alt:item.alt||original?.alt||'',credit:item.credit||original?.credit||''});
 }
 return [...merged.values()];
}
export function validateUnifiedGallery(gallery,sourceCount){
 const text=(value,max)=>typeof value==='string'&&value.length<=max;
 const image=value=>{
  if(!text(value,5000))return false;
  if((/^\/assets\/[^<>"'\\?#]+$/.test(value)&&!value.includes('..'))||/^\/media\/[a-f0-9-]{36}\.webp$/.test(value))return true;
  try{return /^https:\/\/[^<>"'\s]+$/.test(value)&&new URL(value).protocol==='https:';}catch{return false;}
 };
 if(!Array.isArray(gallery)||gallery.length<1||gallery.length>50)throw new Error('产品图片请保留 1 至 50 张，第一张用作封面。');
 for(const [index,item]of gallery.entries()){
  if(!item||!image(item.src)||!text(item.alt,5000)||!text(item.credit,1500)||(item.sourceIndex!==undefined&&(!Number.isInteger(item.sourceIndex)||item.sourceIndex<0||item.sourceIndex>=sourceCount)))throw new Error('第 '+(index+1)+' 张图片：请上传图片或填写有效地址，并检查图片说明。');
 }
}
function imageTag(item,index){
 return `<img src="${escape(item.src)}" alt="${escape(item.alt)}" ${index?'loading="lazy"':'fetchpriority="high"'} decoding="async">`;
}
export function renderUnifiedGallery(html,product,origin){
 if(!product.galleryUnified||!product.gallery?.length)return html;
 const gallery=product.gallery,slides=html.match(slidesPattern)||[],first=gallery[0];
 if(slides.length){
  const rendered=gallery.map((item,index)=>{
   const original=slides[item.sourceIndex];
   let slide=(index&&original?original:slides[0]).replace(/<img\b[^>]*>/,()=>imageTag(item,index))
    .replace(/\bdata-credit="[^"]*"/,()=>`data-credit="${escape(item.credit)}"`)
    .replace(/\baria-label="[^"]*"/,()=>`aria-label="${index+1} of ${gallery.length}"`);
   if(index)slide=slide.replace(/<h[12]([^>]*)>([\s\S]*?)<\/h[12]>/,(_,attrs,title)=>`<h2${attrs}>${!original&&item.alt?escape(item.alt):title}</h2>`);
   return slide;
  }).join('');
  html=html.replace('<section class="cruise-hero"','<section class="cruise-hero" data-custom-gallery')
   .replace(/(<div class="cruise-hero-track"[^>]*>)[\s\S]*?<\/article><\/div>/,(_,open)=>open+rendered+'</div>')
   .replace(/<div class="cruise-hero-dots"[^>]*>[\s\S]*?<\/div>/,()=>'<div class="cruise-hero-dots">'+gallery.map((_,index)=>`<button type="button" aria-label="Image ${index+1}" aria-current="${index===0}"></button>`).join('')+'</div>')
   .replace(/<div class="cruise-hero-controls"[^>]*>/,()=>`<div class="cruise-hero-controls"${gallery.length===1?' hidden':''}>`)
   .replace(/(<span class="cruise-hero-status"[^>]*>)[\s\S]*?<\/span>/,(_,open)=>open+`1 / ${gallery.length}</span>`)
   .replace(/<p class="cruise-photo-credit">[\s\S]*?<\/p>/,()=>'<p class="cruise-photo-credit">'+escape(first.credit)+'</p>')
   .replace(/<section class="wrap ship-gallery-picker"[\s\S]*?<\/section>/,'')
   .replace(/<script\b[^>]*id="ship-gallery-data"[^>]*>[\s\S]*?<\/script>/,'');
 }else{
  html=html.replace(/<figure\b[^>]*class="wrap editorial-figure"[^>]*>[\s\S]*?<\/figure>/,figure=>{
   const original=figure.match(/<img\b[^>]*>/)?.[0]||'';
   const sameSource=original.includes('src="'+escape(first.src)+'"');
   let result=figure.replace(/<img\b[^>]*>/,tag=>tag.replace(/\bsrc="[^"]*"/,()=>`src="${escape(first.src)}"`).replace(/\balt="[^"]*"/,()=>`alt="${escape(first.alt)}"`).replace(/\s(?:srcset|sizes)="[^"]*"/g,''));
   if(first.credit||!sameSource)result=result.replace(/<figcaption>[\s\S]*?<\/figcaption>/,()=>first.credit?'<figcaption>'+escape(first.credit)+'</figcaption>':'');
   const extra=gallery.slice(1).map((item,index)=>'<figure>'+imageTag(item,index+1)+(item.credit?'<figcaption>'+escape(item.credit)+'</figcaption>':'')+'</figure>').join('');
   return result+(extra?'<section class="wrap product-gallery" aria-label="Journey photographs">'+extra+'</section>':'');
  });
 }
 if(slides.length||gallery.length>1)html=html.replace('</head>','<link rel="stylesheet" href="/product-gallery.css"></head>');
 return html.replace(/(<meta property="og:image" content=")[^"]*"/,(_,open)=>open+escape(new URL(first.src,origin).href)+'"');
}
