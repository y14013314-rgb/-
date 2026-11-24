import {decodeCopy,escapeCopy} from './editable-copy.mjs';

const dayRow=/<details><summary><span>DAY \d+<\/span> ([^<]+)<b>＋<\/b><\/summary><p>\{\{CMS_(field\d+)\}\}<\/p><\/details>/g;
const routeBlock=/<div class="route-overview" aria-label="Suggested route">([\s\S]*?)<\/div>/;
const tagBlock=/<div class="trip-tags">([\s\S]*?)<\/div>/;
const number=index=>String(index+1).padStart(2,'0');

export function journeyEditor(product,entry){
 if(entry?.category!=='journeys'||!entry.template.includes('class="route-overview"'))return null;
 const rows=[...entry.template.matchAll(dayRow)],dayKeys=rows.map(row=>row[2]);
 const sections=product.sections||[];
 if(product.journey)return {journey:product.journey,dayKeys,sections};
 const numbered=sections.map(item=>item.title.match(/^DAY\s+(\d+)\s*[-—–:·]\s*(.+)$/i));
 const days=numbered.filter(Boolean),useDays=days.length>0&&days.every((match,index)=>Number(match[1])===index+1);
 const tags=[...entry.template.match(tagBlock)[1].matchAll(/<span>(.*?)<\/span>/g)].map(match=>decodeCopy(match[1]));
 const headingKey=entry.template.match(/<h2>\{\{CMS_(field\d+)\}\}<\/h2><\/div><p><\/p><\/div><div class="route-overview"/)[1];
 const heading=product.values[headingKey];
 const route=heading!==entry.product.values[headingKey]&&/\s[·→]\s/.test(heading)?heading.split(/\s+[·→]\s+/):[...entry.template.match(routeBlock)[1].matchAll(/<\/b>([^<]+)<\/span>/g)].map(match=>decodeCopy(match[1]));
 const itinerary=useDays?sections.flatMap((item,index)=>numbered[index]?[{title:numbered[index][2],description:item.description}]:[]):rows.map(row=>({title:decodeCopy(row[1]),description:product.values[row[2]]}));
 return {dayKeys,journey:{durationLabel:tags[0].replace(/^\d+/,'{days}'),themeLabel:tags[1],styleLabel:tags[2],route,itinerary},sections:useDays?sections.filter((_,index)=>!numbered[index]):sections};
}

export function validateJourney(journey){
 const text=(value,max)=>typeof value==='string'&&value.length<=max;
 if(!journey||!['durationLabel','themeLabel','styleLabel'].every(key=>text(journey[key],200))||!Array.isArray(journey.route)||journey.route.length>100||!journey.route.every(stop=>text(stop,250)&&stop.trim()))throw new Error('请检查顶部标签与路线站点。');
 if(!Array.isArray(journey.itinerary)||!journey.itinerary.length||journey.itinerary.length>100||!journey.itinerary.every(day=>day&&text(day.title,200)&&day.title.trim()&&text(day.description,5000)&&day.description.trim()))throw new Error('请填写每日标题和正文，行程保留 1–100 天。');
}

export function renderJourney(html,journey,title){
 const {route,itinerary}=journey,count=itinerary.length;
 const tags=[journey.durationLabel.replaceAll('{days}',String(count)),journey.themeLabel,journey.styleLabel].filter(label=>label.trim());
 const cards=itinerary.map((day,index)=>`<details><summary><span>DAY ${number(index)}</span> ${escapeCopy(day.title)}<b>＋</b></summary><p>${escapeCopy(day.description).replace(/\r?\n/g,'<br>')}</p></details>`).join('');
 return html.replace(tagBlock,()=>`<div class="trip-tags">${tags.map(label=>`<span>${escapeCopy(label)}</span>`).join('')}</div>`)
 .replace(routeBlock,()=>`<div class="route-overview" aria-label="Suggested route">${route.map((stop,index)=>`<span><b>${number(index)}</b>${escapeCopy(stop)}</span>`).join('<i>→</i>')}</div>`)
 .replace(/(?:<details><summary><span>DAY \d+<\/span>[^<]*<b>＋<\/b><\/summary><p>[\s\S]*?<\/p><\/details>)+/,()=>cards)
 .replace(/data-quote-days="\d+"/g,()=>`data-quote-days="${count}"`).replace(/data-quote-destinations="[^"]*"/g,()=>`data-quote-destinations="${escapeCopy(route.join(' · '))}"`).replace(/data-quote-journey="[^"]*"/g,()=>`data-quote-journey="${escapeCopy(title)}"`);
}
