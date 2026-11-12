import catalog from './catalog-seed.mjs';
import seed from './train-seed.mjs';
import trainTemplate from './train-template.mjs';
import {renderTrain} from './render-train.mjs';
import {validateProduct} from './product.mjs';
import {videoUrl} from './video.mjs';
export {catalog};
export const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function entryFor(p){const base=typeof p==='string'?p:(p?.templateSlug||p?.slug);return base==='baiyun'?{path:'/silk-road-luxury-trains/baiyun/',category:'silk-road-luxury-trains',label:'Baiyun 白云号',product:seed}:catalog[base];}
export function pathFor(p){const e=entryFor(p);return e.category==='home'?'/':`/${e.category}/${p.slug}/`;}
export function coverFor(p){const e=entryFor(p);return p.image?.src||p.values?.[e?.fields?.find(f=>f.type==='image')?.key]||'';}
export function validateCatalogProduct(p){
 if(p.videoUrl!==undefined&&!videoUrl(p.videoUrl))throw new Error('请填写有效的视频地址。');
 const entry=entryFor(p);if(!entry||!p.values||typeof p.title!=='string'||!p.title.trim()||p.title.length>200||typeof p.values!=='object')throw new Error('产品或标题不正确。');
 if(p.sections!==undefined&&(!Array.isArray(p.sections)||p.sections.length>100||!p.sections.every(s=>s&&typeof s.title==='string'&&s.title.trim()&&s.title.length<=200&&typeof s.description==='string'&&s.description.trim()&&s.description.length<=5000)))throw new Error('请填写补充行程的标题和内容。');
 if(Object.keys(p.values).length!==entry.fields.length)throw new Error('产品字段已变化，请重新载入产品。');
 for(const f of entry.fields){const v=p.values[f.key];if(typeof v!=='string'||v.length>5000)throw new Error(f.label+'：文字过长或格式错误。');
  if(f.type==='image'&&!(/^\/assets\/[^<>"'\\?#]+$/.test(v)&&!v.includes('..')||/^\/media\/[a-f0-9-]{36}\.webp$/.test(v)||/^https:\/\/[^<>"'\s]+$/.test(v)))throw new Error(f.label+'：请上传图片或填写有效的素材地址。');
 }
 return p;
}
export function placementOptions(p){
 const category=entryFor(p)?.category;if(!category||category==='home')return [];
 return [...(catalog[p.slug]||p.slug==='baiyun'?[{value:'original',label:'保留原有位置'}]:[]),...(category==='journeys'?[{value:'destinations',label:'目的地探索 · Explore by destination'},{value:'itineraries',label:'推荐行程 · Suggested private itineraries'},{value:'experiences',label:'特色体验 · Signature experiences'}]:[{value:'collection',label:category==='silk-road-luxury-trains'?'列车主列表':'游轮主列表'}]),{value:'more',label:'更多推荐 · More journeys to discover'}];
}
export function placementFor(p){return p.placement||(catalog[p.slug]||p.slug==='baiyun'?'original':'more');}
export function validateContent(p){if(!entryFor(p))throw new Error('产品模板不存在。');if(p.placement!==undefined&&!placementOptions(p).some(o=>o.value===p.placement))throw new Error('请选择有效的发布位置。');if(p.featured!==undefined&&typeof p.featured!=='boolean')throw new Error('首页推荐状态无效。');return (p.templateSlug||p.slug)==='baiyun'?validateProduct(p):validateCatalogProduct(p);}
export function renderCatalogProduct(p,origin){
 const e=entryFor(p);let base=e.template.replace(/<img\b[^>]*>/g,tag=>{const key=tag.match(/src="\{\{CMS_(field\d+)\}\}"/)?.[1];return key&&p.values[key]!==e.product.values[key]?tag.replace(/\s(?:srcset|sizes)="[^"]*"/g,''):tag;});let html=base.replace(/\{\{CMS_(field\d+)\}\}/g,(_,key)=>escape(p.values[key]));
 html=html.replace(/<title>[\s\S]*?<\/title>/,()=>'<title>'+escape(p.title)+' | SUKHA</title>');
 if(p.videoUrl!==undefined){
  const video=p.videoUrl?'<video controls playsinline preload="none" style="width:100%;height:auto"><source src="'+escape(p.videoUrl)+'" type="video/mp4"></video>':'';
  html=/<video\b[\s\S]*?<\/video>/.test(html)?html.replace(/<video\b[\s\S]*?<\/video>/,()=>video):html.replace('</main>',()=>video?'<section class="wrap section">'+video+'</section></main>':'</main>');
 }
 if(p.title!==e.product.title&&e.category!=='home')html=html.replace(/<h1([^>]*)>[\s\S]*?<\/h1>/,(_,attrs)=>'<h1'+attrs+'>'+escape(p.title)+'</h1>');
 if(p.sections?.length)html=html.replace('</main>',()=>'<section class="wrap section">'+p.sections.map(s=>'<article class="article-section"><h2>'+escape(s.title)+'</h2><p>'+escape(s.description).replace(/\n/g,'<br>')+'</p></article>').join('')+'</section></main>');
 return html.replaceAll(e.path,pathFor(p)).replaceAll('https://sukha-travel-20261103.racinglight1.chatgpt.site',origin);
}
export function renderContent(p,origin){return (p.templateSlug||p.slug)==='baiyun'?renderTrain(p,trainTemplate,origin).detail:renderCatalogProduct(p,origin);}
