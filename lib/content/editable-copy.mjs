export const escapeCopy=value=>String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
export const decodeCopy=value=>value.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39|#\d+|#x[0-9a-f]+);/gi,entity=>{
 const named={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '};
 if(named[entity])return named[entity];
 const number=entity.startsWith('&#x')?parseInt(entity.slice(3),16):parseInt(entity.slice(2),10);
 return Number.isFinite(number)?String.fromCodePoint(number):entity;
});
export function mapVisibleText(html,replace){
 return html.replace(/<!--[\s\S]*?-->|<(script|style|svg)\b[^>]*>[\s\S]*?<\/\1>|<[^>]+>|[^<]+/gi,part=>{
  if(part.startsWith('<'))return part;
  return part.split(/(\{\{[^}]+\}\})/).map(text=>text.includes('{{')||!/\p{L}/u.test(decodeCopy(text))?text:replace(text)).join('');
 });
}
export function editableCopy(html){
 const fields=[],values={};
 const field=(text,label)=>{
  const key='text'+fields.length,value=decodeCopy(text);
  fields.push({key,label:label||'页面文字 · '+value.trim().slice(0,65)});
  values[key]=value;
  return '{{COPY_'+key+'}}';
 };
 const template=html.replace(/(<body\b[^>]*>)([\s\S]*?)(<\/body>)/i,(_,open,body,close)=>{
  body=mapVisibleText(body,text=>field(text));
  body=body.replace(/\b(data-credit|data-film-title|data-film-credit|placeholder|aria-label)="([^"]*)"/g,(all,name,value)=>value.includes('{{')||!value.trim()?all:`${name}="${field(value,({'data-credit':'轮播图片来源说明','data-film-title':'视频标题','data-film-credit':'视频来源说明',placeholder:'输入框提示','aria-label':'辅助说明'})[name])}"`);
  return open+body+close;
 });
 return {template,fields,values};
}
export function renderCopy(template,values,defaults){
 return template.replace(/\{\{COPY_(text\d+)\}\}/g,(_,key)=>escapeCopy(values?.[key]??defaults[key]));
}
export function validateCopy(values,defaults){
 if(values===undefined)return;
 if(!values||typeof values!=='object'||Array.isArray(values)||Object.entries(values).some(([key,value])=>!Object.hasOwn(defaults,key)||typeof value!=='string'||value.length>5000))throw new Error('页面文字格式不正确或过长，请重新载入后检查。');
}
