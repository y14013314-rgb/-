import catalog from './catalog-seed.mjs';
export {catalog};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function validateCatalogProduct(p){
 const entry=catalog[p?.slug];if(!entry||typeof p.title!=='string'||!p.title.trim()||p.title.length>200||!p.values||typeof p.values!=='object')throw new Error('产品或标题不正确。');
 if(Object.keys(p.values).length!==entry.fields.length)throw new Error('产品字段已变化，请重新载入产品。');
 for(const f of entry.fields){const v=p.values[f.key];if(typeof v!=='string'||v.length>5000)throw new Error(f.label+'：文字过长或格式错误。');
  if(f.type==='image'&&!(/^\/assets\/[^<>"'\\?#]+$/.test(v)&&!v.includes('..')||/^\/media\/[a-f0-9-]{36}\.webp$/.test(v)||/^https:\/\/[^<>"'\s]+$/.test(v)))throw new Error(f.label+'：请上传图片或填写有效的素材地址。');
 }
 return p;
}
export function renderCatalogProduct(p,origin){
 const e=catalog[p.slug];let base=e.template.replace(/<img\b[^>]*>/g,tag=>{const key=tag.match(/src="\{\{CMS_(field\d+)\}\}"/)?.[1];return key&&p.values[key]!==e.product.values[key]?tag.replace(/\s(?:srcset|sizes)="[^"]*"/g,''):tag;});let html=base.replace(/\{\{CMS_(field\d+)\}\}/g,(_,key)=>esc(p.values[key]));
 html=html.replace(/<title>[\s\S]*?<\/title>/,()=>'<title>'+esc(p.title)+' | SUKHA</title>');
 if(p.title!==e.product.title)html=html.replace(/<h1([^>]*)>[\s\S]*?<\/h1>/,(_,attrs)=>'<h1'+attrs+'>'+esc(p.title)+'</h1>');
 return html.replaceAll('https://sukha-travel-20261103.racinglight1.chatgpt.site',origin);
}
