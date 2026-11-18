import {withAnalytics} from './analytics.mjs';
import catalog from './catalog-seed.mjs';
import seed from './train-seed.mjs';
import trainTemplate from './train-template.mjs';
import {renderTrain} from './render-train.mjs';
import {validateProduct} from './product.mjs';
import {videoUrl,youtubeEmbedUrl,renderVideo} from './video.mjs';
import {defaultGallery,validateGallery,renderGallery} from './gallery.mjs';
export {catalog};
export const isContentPage=p=>['destinations','signature-experiences','experiences','wildlife'].includes(entryFor(p)?.category);
export const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function entryFor(p){const base=typeof p==='string'?p:(p?.templateSlug||p?.slug);return base==='baiyun'?{path:'/silk-road-luxury-trains/baiyun/',category:'silk-road-luxury-trains',label:'Baiyun 白云号',product:seed}:catalog[base];}
export function pathFor(p){const e=entryFor(p);return e.category==='home'?'/':isContentPage(p)?e.path:`/${e.category}/${p.slug}/`;}
export function coverFor(p){const e=entryFor(p);return p.gallery?.[0]?.src||p.image?.src||p.values?.[e?.fields?.find(f=>f.type==='image')?.key]||'';}
export function galleryFor(p){const entry=entryFor(p);return ['journeys','silk-road-luxury-trains','yangtze-river-cruises'].includes(entry?.category)?(p.gallery?.length?p.gallery:defaultGallery(p,entry.template||trainTemplate)):null;}
export function validateCatalogProduct(p){
 if(p.videoUrl!==undefined&&!videoUrl(p.videoUrl))throw new Error('请填写有效的视频地址。');
 const entry=entryFor(p);if(!entry||!p.values||typeof p.title!=='string'||!p.title.trim()||p.title.length>200||typeof p.values!=='object')throw new Error('产品或标题不正确。');
 if(p.gallery!==undefined){if(!galleryFor(p))throw new Error('此页面不支持产品图库。');validateGallery(p.gallery,entry.fields.filter(f=>f.type==='image').length);}
 if(p.sections!==undefined&&(!Array.isArray(p.sections)||p.sections.length>100||!p.sections.every(s=>s&&typeof s.title==='string'&&s.title.trim()&&s.title.length<=200&&typeof s.description==='string'&&s.description.trim()&&s.description.length<=5000)))throw new Error('请填写补充行程的标题和内容。');
 if(Object.keys(p.values).length!==entry.fields.length)throw new Error('产品字段已变化，请重新载入产品。');
 for(const f of entry.fields){const v=p.values[f.key];if(typeof v!=='string'||v.length>5000)throw new Error(f.label+'：文字过长或格式错误。');
  if(f.type==='url'&&!/^https:\/\/[^<>"'\s]+$/.test(v))throw new Error(f.label+'：请填写有效的 HTTPS 地址。');
  if(f.type==='days'&&!/^(?:[1-9]\d?|100)$/.test(v))throw new Error('询价天数：请填写 1 到 100 的整数。');
  if(f.type==='image'&&!(/^\/assets\/[^<>"'\\?#]+$/.test(v)&&!v.includes('..')||/^\/media\/[a-f0-9-]{36}\.webp$/.test(v)||/^https:\/\/[^<>"'\s]+$/.test(v)))throw new Error(f.label+'：请上传图片或填写有效的素材地址。');
 }
 return p;
}
export function placementOptions(p){
 const category=entryFor(p)?.category;if(!category||category==='home'||isContentPage(p))return [];
 return [...(catalog[p.slug]||p.slug==='baiyun'?[{value:'original',label:'保留原有位置'}]:[]),...(category==='journeys'?[{value:'destinations',label:'目的地探索 · Explore by destination'},{value:'itineraries',label:'推荐行程 · Suggested private itineraries'},{value:'experiences',label:'特色体验 · Signature experiences'}]:[{value:'collection',label:category==='silk-road-luxury-trains'?'列车主列表':'游轮主列表'}]),{value:'more',label:'更多推荐 · More journeys to discover'}];
}
export function placementFor(p){return p.placement||(catalog[p.slug]||p.slug==='baiyun'?'original':'more');}
export function validateContent(p){if(!entryFor(p))throw new Error('产品模板不存在。');if(p.placement!==undefined&&!placementOptions(p).some(o=>o.value===p.placement))throw new Error('请选择有效的发布位置。');if(p.featured!==undefined&&typeof p.featured!=='boolean')throw new Error('首页推荐状态无效。');return (p.templateSlug||p.slug)==='baiyun'?validateProduct(p):validateCatalogProduct(p);}
export function renderCatalogProduct(p,origin){
 const e=entryFor(p);let base=e.template.replace(/<img\b[^>]*>/g,tag=>{const key=tag.match(/src="\{\{CMS_(field\d+)\}\}"/)?.[1];return key&&p.values[key]!==e.product.values[key]?tag.replace(/\s(?:srcset|sizes)="[^"]*"/g,''):tag;});let html=base.replace(/\{\{CMS_(field\d+)\}\}/g,(_,key)=>escape(p.values[key]));
 html=html.replace(/<title>[\s\S]*?<\/title>/,()=>'<title>'+escape(p.title)+' | SUKHA</title>');
 if(p.videoUrl!==undefined){
  const video=renderVideo(p.videoUrl),frame=youtubeEmbedUrl(p.videoUrl),filmButton=/<button\b[^>]*\bdata-film-title="[^"]*"[^>]*>/;
  if(filmButton.test(html))html=html.replace(/<button\b[^>]*\bdata-film-title="[^"]*"[^>]*>[\s\S]*?<\/button>/,tag=>p.videoUrl?tag.replace(/\sdata-film-(src|frame|source)="[^"]*"/g,'').replace('>',()=>` data-film-${frame?'frame':'src'}="${escape(frame||p.videoUrl)}" data-film-source="${escape(p.videoUrl)}">`):'');
  else html=/<video\b[\s\S]*?<\/video>/.test(html)?html.replace(/<video\b[\s\S]*?<\/video>/,()=>video):html.replace('</main>',()=>video?'<section class="wrap section">'+video+'</section></main>':'</main>');
 }
 if(p.title!==e.product.title&&e.category!=='home')html=html.replace(/<h1([^>]*)>[\s\S]*?<\/h1>/,(_,attrs)=>'<h1'+attrs+'>'+escape(p.title)+'</h1>');
 if(p.sections?.length){
  const daysList=/(<ol class="destination-days">)([\s\S]*?)(<\/ol>)/;
  if(e.category==='destinations'&&daysList.test(html))html=html.replace(daysList,(_,open,days,close)=>{
   let day=Number([...days.matchAll(/<span>DAY\s+(\d+)<\/span>/gi)].at(-1)?.[1]||(days.match(/<li>/g)||[]).length);
   const added=p.sections.map(s=>{
    const numbered=s.title.match(/^DAY\s+(\d+)\b\s*(?:[-—–:]\s*)?(.*)$/i),title=numbered?numbered[2]:s.title;
    day=numbered?Number(numbered[1]):day+1;
    return '<li><span>DAY '+String(day).padStart(2,'0')+'</span><div>'+(title?'<h3>'+escape(title)+'</h3>':'')+'<p>'+escape(s.description).replace(/\n/g,'<br>')+'</p></div></li>';
   }).join('');
   return open+days+added+close;
  });
  else html=html.replace('</main>',()=>'<section class="wrap section">'+p.sections.map(s=>'<article class="article-section"><h2>'+escape(s.title)+'</h2><p>'+escape(s.description).replace(/\n/g,'<br>')+'</p></article>').join('')+'</section></main>');
 }
 return withAnalytics(renderGallery(html,p,origin).replaceAll(e.path,pathFor(p)).replaceAll('https://sukha-travel-20261103.racinglight1.chatgpt.site',origin));
}
export function renderContent(p,origin){return (p.templateSlug||p.slug)==='baiyun'?renderTrain(p,trainTemplate,origin).detail:renderCatalogProduct(p,origin);}
