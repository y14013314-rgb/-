import {escapeCopy as escape} from './editable-copy.mjs';
import {renderVideo,videoUrl} from './video.mjs';
import catalog from './catalog-seed.mjs';

export const pageDefaults={route:'',routeLabel:'The journey at a glance',routeNote:'',dayLabel:'Day by day',dayTitle:'Your journey, day by day.',days:'',videoTitle:'Watch the journey',videoUrl:'',ctaLabel:'A journey that is yours',ctaTitle:'Your China story\nstarts here.',ctaBody:'Tell us what inspires you. Let’s shape the journey around you.',ctaButton:'Start planning ↗'};
const footer=catalog['wildlife-sanjiangyuan-snow-leopard'].template.match(/<footer>[\s\S]*?<\/footer>/)[0];
export function dayRows(text=''){
 const headings=[...text.matchAll(/^Day\s+(\d+)\s*[·:–—-]\s*(.+)$/gim)];
 return headings.map((heading,index)=>({number:heading[1],title:heading[2].trim(),body:text.slice(heading.index+heading[0].length,headings[index+1]?.index??text.length).trim()}));
}
export function validEditorial(copy){
 if(copy===undefined)return true;
 if(!copy||typeof copy!=='object'||Array.isArray(copy))return false;
 return Object.entries(copy).every(([key,value])=>Object.hasOwn(pageDefaults,key)&&typeof value==='string'&&value.length<=(key==='days'?60000:key==='route'?4000:1500)&&(key!=='videoUrl'||videoUrl(value))&&(key!=='days'||!value.trim()||(/^Day\s+1\s*[·:–—-]/i.test(value.trim())&&dayRows(value.trim()).every((day,index)=>Number(day.number)===index+1&&day.body))));
}
export function guidePlanDefaults(item,product,entry){
 const story=item.story||{},numbered=dayRows(story.body);
 if(numbered.length&&/^Day\s+1\b/i.test(story.body.trim())){
  const guizhou=item.id==='guizhou'&&numbered.length===4&&numbered[0].title.includes('Baiyu')&&numbered[2].title.includes('Xijiang');
  return {days:story.body,dayLabel:story.eyebrow,dayTitle:story.title,route:guizhou?'Guiyang\nBaiyu Cave\nZhijin Cave\nXijiang Miao Village\nKaili South':numbered.map(day=>day.title).join('\n'),routeNote:[story.tag1,story.tag2].filter(Boolean).join(' · ')};
 }
 if(!product||!entry)return {};
 const list=entry.template.match(/<ol class="destination-days">([\s\S]*?)<\/ol>/)?.[1]||'';
 const days=[...list.matchAll(/<h3>\{\{CMS_(field\d+)\}\}<\/h3><p>\{\{CMS_(field\d+)\}\}<\/p>/g)].map(([,title,body])=>({title:product.values[title],body:product.values[body]}));
 for(const part of product.sections||[])days.push({title:part.title.replace(/^Day\s+\d+\s*[-·:–—]?\s*/i,''),body:part.description});
 return days.length?{days:days.map((day,index)=>`Day ${index+1} · ${day.title}\n${day.body}`).join('\n\n'),route:days.map(day=>day.title).join('\n')}:{};
}
export function routeSection(copy){
 const stops=copy.route.split('\n').map(stop=>stop.trim()).filter(Boolean);
 return stops.length?`<section class="pt-route"><div class="pt-route-inner"><p class="eyebrow">${escape(copy.routeLabel)}</p><h2>${stops.map(escape).join(' · ')}</h2><ol>${stops.map((stop,index)=>`<li><small>${String(index+1).padStart(2,'0')}</small>${escape(stop)}</li>`).join('')}</ol><p>${escape(copy.routeNote)}</p></div></section>`:'';
}
export function daySection(copy){
 const days=dayRows(copy.days);
 return days.length?`<section class="pt-days"><div><p class="eyebrow">${escape(copy.dayLabel)}</p><h2>${escape(copy.dayTitle)}</h2>${days.map(day=>`<details><summary><small>DAY ${String(day.number).padStart(2,'0')}</small>${escape(day.title)}</summary><p>${escape(day.body)}</p></details>`).join('')}</div></section>`:'';
}
export function filmSection(copy,poster=''){
 return copy.videoUrl?`<section class="pt-film"><h2>${escape(copy.videoTitle)}</h2><div class="pt-film-player">${renderVideo(copy.videoUrl,poster)}</div></section>`:'';
}
export function pageEnding(html,copy,title){
 const cta=`<section class="final-cta pt-ending"><p class="eyebrow">${escape(copy.ctaLabel)}</p><h2>${escape(copy.ctaTitle).replaceAll('\n','<br>')}</h2><p>${escape(copy.ctaBody)}</p><a class="button light" data-pages-inquiry data-quote-journey="${escape(title)}" href="/#request-quote">${escape(copy.ctaButton)}</a></section>`;
 return html.replace(/<section class="final-cta">[\s\S]*?<\/section>/,'').replace('</main>',()=>cta+'</main>').replace(/<footer class="pt-footer">[\s\S]*?<\/footer>/,()=>footer);
}
