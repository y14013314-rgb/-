import {escape} from './private-shell.mjs';
import {decodeCopy} from './editable-copy.mjs';

export const scopeLabels={all:'all site content','private-china-tours':'Private Tours',destinations:'Destinations','travel-styles':'Travel Styles','signature-journeys':'Signature Journeys','silk-road-luxury-trains':'Train Journeys','yangtze-river-cruises':'River Cruises','travel-journal':'Travel Journal','our-story':'Our Story','booking-information':'Booking Information',privacy:'Privacy'};
export function pageScope(path){
 const [,area,section]=path.split('/');
 if(!area)return 'all';
 if(area==='private-china-tours')return section||area;
 if(area==='journeys')return 'signature-journeys';
 if(['experiences','signature-experiences','wildlife'].includes(area))return 'travel-styles';
 return area;
}
export function searchForm(scope,query=''){
 const label='Search '+scopeLabels[scope];
 return `<form class="site-search" role="search" action="/search/" method="get">${scope==='all'?'':`<input type="hidden" name="scope" value="${scope}">`}<input type="search" name="q" required maxlength="160" aria-label="${label}" placeholder="${label}" value="${escape(query)}"><button type="submit">Search</button></form>`;
}
export function withSearch(html){
 if(html.includes('class="site-search"')||html.includes('http-equiv="refresh"'))return html;
 const canonical=html.match(/rel="canonical" href="([^"]+)"/)?.[1];if(!canonical)return html;
 const scope=pageScope(new URL(canonical,'https://sukhatrip.com').pathname);if(!Object.hasOwn(scopeLabels,scope))return html;
 const form=searchForm(scope);
 html=scope==='all'?html.replace('<div class="home-container home-hero-bottom">',form+'<div class="home-container home-hero-bottom">'):html.replace('</header>','</header>'+form);
 return html.replace('</head>','<link rel="stylesheet" href="/site-search.css"></head>');
}
export function indexPage(path,html){
 const text=fragment=>decodeCopy(fragment.replace(/<(script|style|form|svg)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
 const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||'';
 const image=decodeCopy(main.match(/<img\b[^>]*?\ssrc="([^"]+)"/i)?.[1]||'');
 return {path,title:text(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||'').replace(/\s*\|\s*SUKHA.*$/i,''),body:text(main),image:/^(?:\/(?:assets|media)\/|https:\/\/)/.test(image)?image:''};
}
