import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
const decode=s=>s.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[0-9a-f]+);/gi,e=>{const map={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '};if(map[e])return map[e];const n=e.startsWith('&#x')?parseInt(e.slice(3),16):parseInt(e.slice(2),10);return Number.isFinite(n)?String.fromCodePoint(n):e;});
export function buildCatalog(root){
 const result={},pageCategories=['destinations','signature-experiences','experiences','wildlife'];
 for(const category of ['silk-road-luxury-trains','yangtze-river-cruises','journeys','home',...pageCategories])for(const slug of category==='home'?['homepage']:readdirSync(join(root,'public',category))){
  if(slug==='index.html'||slug==='baiyun'||(!['home','journeys',...pageCategories].includes(category)&&!['chengdu','jinxiu-tianfu','jinxiu-dongfang','gold-cruises','yangtze-miracle','century-legend','yangzi-explorer'].includes(slug)))continue;
  const source=readFileSync(category==='home'?join(root,'public/index.html'):join(root,'public',category,slug,'index.html'),'utf8'),fields=[],values={};
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
   if(['home','journeys',...pageCategories].includes(category))body=body.replace(/<(h[1-6]|p)(\s[^>]*)?>([\s\S]*?)<\/\1>/g,(all,tag,attrs='',inner)=>{
    if(!inner.includes('<'))return all;
    const edited=inner.replace(/(^|>)([^<>]+)(?=<|$)/g,(all,prefix,text)=>text.trim()&&!text.includes('{{CMS_')?prefix+field(text,tag.startsWith('h')?'页面标题文字':'页面说明文字'):all);
    return `<${tag}${attrs}>${edited}</${tag}>`;
   });
   if(category==='destinations'){
    body=body.replace(/<(span|b|small|a)(\s[^>]*)?>([^<>]+)<\/\1>/g,(all,tag,attrs='',text)=>text.trim()&&!text.includes('{{CMS_')?`<${tag}${attrs}>${field(text,'页面文字 · '+decode(text))}</${tag}>`:all);
    const names={'film-title':'视频标题','film-credit':'视频来源说明','film-source':'视频来源网页','film-frame':'视频嵌入地址','quote-journey':'询价行程名称','quote-destinations':'询价目的地','quote-days':'询价天数'};
    body=body.replace(/\bdata-(film-title|film-credit|film-source|film-frame|quote-journey|quote-destinations|quote-days)="([^"]*)"/g,(_,name,value)=>`data-${name}="${field(value,names[name],['film-source','film-frame'].includes(name)?'url':name==='quote-days'?'days':'text')}"`);
   }
   return open+body+close;
  });
  const id=pageCategories.includes(category)?(category==='destinations'?'destination':category)+'-'+slug:slug;
  const localName=category==='destinations'?{beijing:'北京',shanghai:'上海',xian:'西安',guilin:'桂林',zhangjiajie:'张家界',yunnan:'云南',xinjiang:'新疆',chengdu:'成都',chongqing:'重庆',tibet:'西藏','inner-mongolia':'内蒙古'}[slug]:{'living-china':'生活中国','silk-road':'丝绸之路',xuanzang:'玄奘主题','chengdu-pandas':'成都熊猫','chongqing-night-tour':'重庆城市体验','sanjiangyuan-snow-leopard':'三江源野生动物'}[slug];
  result[id]={path:category==='home'?'/':`/${category}/${slug}/`,label:category==='home'?'首页':title,category,localName,fields,template,product:{slug:id,title,values}};
 }
 return result;
}
