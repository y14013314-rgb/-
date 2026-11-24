import {withAnalytics} from './analytics.mjs';
import {pageDefaults,validEditorial as validPrivateEditorial} from './private-editorial.mjs';
import catalog,{collectionTemplates,cards} from './catalog-seed.mjs';
import seed from './train-seed.mjs';
import trainTemplate from './train-template.mjs';
import {renderTrain} from './render-train.mjs';
import {railDetail} from './rail-detail.mjs';
import {railInquiryCopy} from './cruise-inquiry.mjs';
import {priceLabel,validateProduct} from './product.mjs';
import {videoUrl,youtubeEmbedUrl,renderVideo} from './video.mjs';
import {editableGallery,validateUnifiedGallery,renderUnifiedGallery} from './gallery.mjs';
import {signatures} from './private-seed.mjs';
import {journeyEditor,validateJourney,renderJourney} from './journey-days.mjs';
import {collections,collectionCategory,isEditorialCategory,collectionCopy,detailCopy,breadcrumb,breadcrumbTitle,cardDefaults,planDefaults,planFieldKeys,renderPlan,validateEditorial} from './editorial.mjs';
export {catalog};
export const isContentPage=p=>['destinations','signature-experiences','experiences','wildlife'].includes(entryFor(p)?.category);
export const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function entryFor(p){
 const base=typeof p==='string'?p:(p?.templateSlug||p?.slug),category=collectionCategory(base);
 if(category){const collection=collections[category];return {path:`/${category}/`,category:'collection',label:collection.label,template:collectionTemplates[category],product:{slug:base,title:collection.label,backLabel:collection.back}};}
 return base==='baiyun'?{path:'/silk-road-luxury-trains/baiyun/',category:'silk-road-luxury-trains',label:'Baiyun 白云号',product:seed}:catalog[base];
}
export const contentPrefix=category=>(category==='destinations'?'destination':category)+'-';
export function pathFor(p){const e=entryFor(p);if(e.category==='home'||e.category==='collection')return e.path;const name=isContentPage(p)?p.slug.slice(contentPrefix(e.category).length):p.slug;return `/${e.category}/${name}/`;}
export const cardTemplateFor=p=>cards[p.templateSlug||p.slug];
export function editorCard(p){
 const entry=entryFor(p),card=cardDefaults(cardTemplateFor(p));
 if(card){
  if(p.title!==entry.product.title||p.templateSlug)card.title=p.title;
  if(coverFor(p)!==coverFor(entry.product)||p.templateSlug)card.photo=coverFor(p);
  if(p.image)Object.assign(card,{eyebrow:p.localTitle,duration:`${p.days} days · ${p.year}`,description:p.description,route:p.route.join(' · '),priceNote:priceLabel(p.price),credit:p.galleryUnified?p.gallery[0].credit:p.image.credit,alt:p.galleryUnified?p.gallery[0].alt:p.image.alt});
 }
 return card;
}
export function editorDefaults(p,origin){
 const entry=entryFor(p),category=entry.category;
 if(category==='journeys'){const signature=signatures.some(row=>row[0]===entry.product.slug);return {journeyHero:true,signature,privateEditorial:{...pageDefaults,route:signature?(p.values.field6||'').split(' · ').join('\n'):''},galleryLimit:10,dayKeys:journeyEditor(p,entry)?.dayKeys};}
 if(category==='collection')return {pageFields:collectionCopy(entry.template).fields,collection:true};
 if(!isEditorialCategory(category))return {};
 const pageFields=detailCopy(entry.template||trainTemplate).fields;
 const original={...p,plan:undefined,introPhoto:undefined,pageCopy:category==='yangtze-river-cruises'?p.pageCopy:undefined};
 const rail=category==='silk-road-luxury-trains';
 const detail=renderContent(original,origin),crumb=breadcrumbTitle(detail);
 return {pageFields,card:editorCard(p),breadcrumbTitle:crumb===p.title?'':crumb,plan:planDefaults(detail,category),rail,planFields:rail&&entry.template?planFieldKeys(entry.template):[],...(rail?{inquiryCopy:railInquiryCopy}:{})};
}
export function coverFor(p){const e=entryFor(p);return (p.galleryUnified&&p.gallery?.[0]?.src)||p.image?.src||p.values?.[e?.fields?.find(f=>f.type==='image')?.key]||'';}
const supportsUnifiedGallery=entry=>['journeys','silk-road-luxury-trains','yangtze-river-cruises'].includes(entry?.category);
export function galleryFor(p){
 const entry=entryFor(p);if(!supportsUnifiedGallery(entry))return null;
 const photos=editableGallery(p,entry.template||trainTemplate);
 if(entry.category==='journeys'&&!p.galleryUnified){const cover=photos.find(item=>item.sourceIndex===0);if(cover)return [cover,...photos.filter(item=>item!==cover)];}
 return photos;
}
export function validateCatalogProduct(p){
 if(p.filmCopy!==undefined){
  const copy=p.filmCopy;
  if(!copy||['buttonText','caption','dialogTitle','filmCredit'].some(key=>typeof copy[key]!=='string'||copy[key].length>500)||!copy.buttonText.trim()||!copy.dialogTitle.trim())throw new Error('请填写视频按钮文字和弹窗标题，每项最多 500 个字符。');
 }
 if(p.videoUrl!==undefined&&!videoUrl(p.videoUrl))throw new Error('请填写有效的视频地址。');
 const entry=entryFor(p);if(!entry||!p.values||typeof p.title!=='string'||!p.title.trim()||p.title.length>200||typeof p.values!=='object')throw new Error('产品或标题不正确。');
 if(p.sections!==undefined&&(!Array.isArray(p.sections)||p.sections.length>100||!p.sections.every(s=>s&&typeof s.title==='string'&&s.title.trim()&&s.title.length<=200&&typeof s.description==='string'&&s.description.trim()&&s.description.length<=5000)))throw new Error('请填写补充行程的标题和内容。');
 if(!p.galleryUnified&&p.gallery!==undefined&&(!Array.isArray(p.gallery)||p.gallery.length>30||!p.gallery.every(item=>item&&typeof item==='object'&&typeof item.src==='string'&&item.src&&item.src.length<=1000&&typeof item.alt==='string'&&(supportsUnifiedGallery(entry)||item.alt)&&item.alt.length<=300&&typeof item.credit==='string'&&item.credit.length<=1000)))throw new Error('请完善新增图片信息（图片地址、说明和来源）。');
 const signature=entry.category==='journeys'&&signatures.some(row=>row[0]===entry.product.slug);
 const keys=Object.keys(p.values).filter(key=>!signature||!['field9','field10'].includes(key));
 if(keys.length!==entry.fields.length)throw new Error('产品字段已变化，请重新载入产品。');
 for(const f of entry.fields){const v=p.values[f.key];if(typeof v!=='string'||v.length>5000)throw new Error(f.label+'：文字过长或格式错误。');
  if(f.type==='url'&&!/^https:\/\/[^<>"'\s]+$/.test(v))throw new Error(f.label+'：请填写有效的 HTTPS 地址。');
  if(f.type==='days'&&!/^(?:[1-9]\d?|100)$/.test(v))throw new Error('询价天数：请填写 1 到 100 的整数。');
  if(f.type==='image'&&!(/^\/assets\/[^<>"'\\?#]+$/.test(v)&&!v.includes('..')||/^\/media\/[a-f0-9-]{36}\.webp$/.test(v)||/^https:\/\/[^<>"'\s]+$/.test(v)))throw new Error(f.label+'：请上传图片或填写有效的素材地址。');
 }
 if(!p.galleryUnified&&Array.isArray(p.gallery))for(const item of p.gallery){if(!(/^\/assets\/[^<>"'\\?#]+$/.test(item.src)&&!item.src.includes('..')||/^\/media\/[a-f0-9-]{36}\.webp$/.test(item.src)||/^https:\/\/[^<>"'\s]+$/.test(item.src)))throw new Error('新增图片：请上传图片或填写有效的素材地址。');}
 return p;
}
export function placementOptions(p){
 const category=entryFor(p)?.category;if(!category||category==='home'||category==='collection'||isContentPage(p))return [];
 return [...(catalog[p.slug]||p.slug==='baiyun'?[{value:'original',label:'保留原有位置'}]:[]),...(category==='journeys'?[{value:'destinations',label:'目的地探索 · Explore by destination'},{value:'itineraries',label:'推荐行程 · Suggested private itineraries'},{value:'experiences',label:'特色体验 · Signature experiences'}]:[{value:'collection',label:category==='silk-road-luxury-trains'?'列车主列表':'游轮主列表'}]),{value:'more',label:'更多推荐 · More journeys to discover'}];
}
export function placementFor(p){return p.placement||(catalog[p.slug]||p.slug==='baiyun'?'original':'more');}
export function validateContent(p){
 if(!validPrivateEditorial(p.privateEditorial))throw new Error('请检查页面文案、视频链接和每日行程编号。');
 const entry=entryFor(p);if(!entry)throw new Error('产品模板不存在。');
 if(p.railMedia!==undefined||p.railPhotos!==undefined){
  if(entry.category!=='silk-road-luxury-trains'||!['video','gallery'].includes(p.railMedia))throw new Error('请选择列车宣传视频或图集。');
  if(p.railMedia==='gallery'||p.railPhotos?.length)validateUnifiedGallery(p.railPhotos,0);
 }
 if(p.inquiryCopy!==undefined){
  if(entry.category!=='silk-road-luxury-trains'||!p.inquiryCopy||Object.keys(railInquiryCopy).some(key=>typeof p.inquiryCopy[key]!=='string'||!p.inquiryCopy[key].trim()||p.inquiryCopy[key].length>500))throw new Error('请完整填写列车询价表单文案，每项最多 500 个字符。');
 }
 if(p.journey!==undefined){if(!journeyEditor(p,entry))throw new Error('此模板没有每日行程列表。');validateJourney(p.journey);}
 if(entry.category==='collection'){
  if(p.templateSlug||typeof p.backLabel!=='string'||!p.backLabel.trim()||p.backLabel.length>200)throw new Error('请填写返回栏目文字。');
  validateEditorial(p,entry.category,collectionCopy(entry.template).fields,null);return p;
 }
 if(p.placement!==undefined&&!placementOptions(p).some(o=>o.value===p.placement))throw new Error('请选择有效的发布位置。');
 if(p.featured!==undefined&&typeof p.featured!=='boolean')throw new Error('首页推荐状态无效。');
 if(p.galleryUnified!==undefined){
  if(p.galleryUnified!==true||!supportsUnifiedGallery(entry))throw new Error('此页面不支持产品图库。');
  validateUnifiedGallery(p.gallery,entry.fields?.filter(f=>f.type==='image').length??1,entry.category==='journeys'?10:50);
 }
 if(entry.category==='journeys'&&!p.galleryUnified&&p.gallery?.length&&Array.isArray(p.gallery)&&p.gallery.every(item=>typeof item?.src==='string')&&galleryFor(p).length>10)throw new Error('行程图库最多 10 张，含封面。');
 for(const key of ['heroBack','heroButton'])if(p[key]!==undefined&&(entry.category!=='journeys'||typeof p[key]!=='string'||p[key].length>250))throw new Error('首屏按钮文案最多 250 个字符。');
 if(p.signatureTag!==undefined&&(entry.category!=='journeys'||typeof p.signatureTag!=='string'||p.signatureTag.length>100))throw new Error('行程标签最多 100 个字符。');
 if(['pageCopy','cardCopy','introPhoto','breadcrumbTitle','plan'].some(key=>p[key]!==undefined))validateEditorial(p,entry.category,isEditorialCategory(entry.category)?detailCopy(entry.template||trainTemplate).fields:[],cardDefaults(cardTemplateFor(p)));
 return (p.templateSlug||p.slug)==='baiyun'?validateProduct(p):validateCatalogProduct(p);
}
export function renderCatalogProduct(p,origin){
 const e=entryFor(p),template=p.pageCopy?detailCopy(e.template,p.pageCopy).html:e.template;let base=template.replace(/<img\b[^>]*>/g,tag=>{const key=tag.match(/src="\{\{CMS_(field\d+)\}\}"/)?.[1];return key&&p.values[key]!==e.product.values[key]?tag.replace(/\s(?:srcset|sizes)="[^"]*"/g,''):tag;});let html=base.replace(/\{\{CMS_(field\d+)\}\}/g,(_,key)=>escape(p.values[key]));
 html=html.replace(/<title>[\s\S]*?<\/title>/,()=>'<title>'+escape(p.title)+' | SUKHA</title>');
 if(p.templateSlug){
  const description=html.match(/<p class="(?:lede|hero-subtitle|cruise-slide-description)"[^>]*>([^<>]+)<\/p>/)?.[1]||`Explore ${escape(p.title)} with SUKHA. Discover the itinerary and request a tailored quote.`;
  html=html.replace(/(<meta (?:name="description"|property="og:description") content=")[^"]*"/g,(_,prefix)=>prefix+description+'"')
   .replace(/(<meta property="og:title" content=")[^"]*"/,(_,prefix)=>prefix+escape(p.title)+'"');
 }
 if(p.videoUrl!==undefined){
  const video=renderVideo(p.videoUrl),frame=youtubeEmbedUrl(p.videoUrl),filmButton=/<button\b[^>]*\bdata-film-title="[^"]*"[^>]*>/;
  if(filmButton.test(html))html=html.replace(/<button\b[^>]*\bdata-film-title="[^"]*"[^>]*>[\s\S]*?<\/button>/,tag=>p.videoUrl?tag.replace(/\sdata-film-(src|frame|source)="[^"]*"/g,'').replace('>',()=>` data-film-${frame?'frame':'src'}="${escape(frame||p.videoUrl)}" data-film-source="${escape(p.videoUrl)}">`):'');
  else html=/<video\b[\s\S]*?<\/video>/.test(html)?html.replace(/<video\b[\s\S]*?<\/video>/,()=>video):html.replace('</main>',()=>video?'<section class="wrap section">'+video+'</section></main>':'</main>');
 }
 if(p.title!==e.product.title&&e.category!=='home')html=html.replace(/<h1([^>]*)>[\s\S]*?<\/h1>/,(_,attrs)=>'<h1'+attrs+'>'+escape(p.title)+'</h1>');
 if(p.filmCopy){
  const {buttonText,caption,dialogTitle,filmCredit}=p.filmCopy;
  html=html.replace(/<button\b[^>]*\bdata-film-title="[^"]*"[^>]*>[\s\S]*?<\/button>/,button=>button
   .replace(/aria-label="[^"]*"/,()=>`aria-label="${escape(buttonText)}"`)
   .replace(/data-film-title="[^"]*"/,()=>`data-film-title="${escape(dialogTitle)}"`)
   .replace(/data-film-credit="[^"]*"/,()=>`data-film-credit="${escape(filmCredit)}"`)
   .replace(/<b>[\s\S]*?<\/b>/,()=>`<b>${escape(buttonText)}${caption?`<small>${escape(caption)}</small>`:''}</b>`));
 }
 const schedule=journeyEditor(p,e);if(schedule){html=renderJourney(html,schedule.journey,p.title);p={...p,sections:schedule.sections};}
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
 if(e.category==='journeys'&&!p.galleryUnified&&p.gallery?.length){
  p={...p,galleryUnified:true,gallery:galleryFor(p).slice(0,10)};
 }
 if(!p.galleryUnified&&p.gallery?.length){
  html=html.replace('</main>',()=>'<section class="wrap section"><div class="section-head"><div><p class="eyebrow">PHOTO GALLERY</p><h2>More moments from this journey.</h2></div></div><div class="info-grid three">'+p.gallery.map(item=>'<figure class="editorial-figure"><img class="editorial-photo" src="'+escape(item.src)+'" alt="'+escape(item.alt)+'" loading="lazy"><figcaption>'+escape(item.credit)+'</figcaption></figure>').join('')+'</div></section></main>');
 }
 return withAnalytics(renderUnifiedGallery(html,p,origin,e.category==='journeys').replaceAll(e.path,pathFor(p)).replaceAll('https://sukha-travel-20261103.racinglight1.chatgpt.site',origin),p);
}
export function renderContent(p,origin,back){
 const entry=entryFor(p);
 if(entry.category==='collection')return withAnalytics(collectionCopy(entry.template,p.pageCopy).html.replaceAll('https://sukha-travel-20261103.racinglight1.chatgpt.site',origin));
 const html=(p.templateSlug||p.slug)==='baiyun'?renderTrain(p,trainTemplate,origin).detail:renderCatalogProduct(p,origin);
 if(!isEditorialCategory(entry.category))return html;
 const title=p.breadcrumbTitle===undefined?undefined:p.breadcrumbTitle||p.title;
 const detail=renderPlan(breadcrumb(html,{back,title}),p);
 return entry.category==='silk-road-luxury-trains'?railDetail(detail,p):detail;
}
export async function publishedBackLabel(db,category){
 if(!isEditorialCategory(category))return undefined;
 const row=await db.prepare('SELECT published FROM product_content WHERE slug=?').bind(collections[category].slug).first();
 return row?.published?JSON.parse(row.published).backLabel:undefined;
}
