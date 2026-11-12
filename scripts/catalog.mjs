import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const decode=s=>s.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[0-9a-f]+);/gi,e=>{const map={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '};if(map[e])return map[e];const n=e.startsWith('&#x')?parseInt(e.slice(3),16):parseInt(e.slice(2),10);return Number.isFinite(n)?String.fromCodePoint(n):e;});
export function buildCatalog(root){
 const result={};
 for(const category of ['silk-road-luxury-trains','yangtze-river-cruises'])for(const slug of readdirSync(join(root,'public',category))){
  if(slug==='baiyun'||!['chengdu','jinxiu-tianfu','jinxiu-dongfang','gold-cruises','yangtze-miracle','century-legend','yangzi-explorer'].includes(slug))continue;
  const source=readFileSync(join(root,'public',category,slug,'index.html'),'utf8'),fields=[],values={};
  const field=(value,label,type='text')=>{const key='field'+fields.length;fields.push({key,label,type});values[key]=decode(value);return '{{CMS_'+key+'}}';};
  const title=decode(source.match(/<title>(.*?)<\/title>/s)[1].replace(/\s*\|.*$/,''));
  let template=source.replace(/(<main\b[^>]*>)([\s\S]*?)(<\/main>)/,(all,open,body,close)=>{
   let section='页面内容';
   body=body.replace(/<(h[1-6]|p|li|figcaption)(\s[^>]*)?>([^<>]+)<\/\1>/g,(whole,tag,attrs='',text)=>{
    if(!text.trim())return whole;
    if(tag.startsWith('h'))section=decode(text.trim());
    return `<${tag}${attrs}>${field(text,tag.startsWith('h')?'标题 · '+section:section+' · 文字')}</${tag}>`;
   });
   body=body.replace(/<img\b[^>]*>/g,tag=>tag.replace(/\b(src|alt)="([^"]*)"/g,(all,attr,value)=>`${attr}="${field(value,'图片 '+(attr==='src'?'地址':'说明'),attr==='src'?'image':'text')}"`));
   return open+body+close;
  });
  result[slug]={path:`/${category}/${slug}/`,label:title,category,fields,template,product:{slug,title,values}};
 }
 return result;
}
