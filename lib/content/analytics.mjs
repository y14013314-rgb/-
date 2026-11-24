import {withPrivateMenu,escape} from './private-shell.mjs';
import {withSearch} from './search-ui.mjs';
import {withCruiseInquiry} from './cruise-inquiry.mjs';
import {pageDefaults,routeSection,daySection,filmSection,pageEnding} from './private-editorial.mjs';
import {decodeCopy} from './editable-copy.mjs';
export function withAnalytics(html,product={}){
 if(html.includes('class="tour-photos"')&&!html.includes('/tour-photos.js'))html=html.replace('</head>','<link rel="stylesheet" href="/tour-photos.css"><script defer src="/tour-photos.js"></script></head>');
 html=withSearch(withCruiseInquiry(html));
 if(/rel="canonical" href="[^"]*\/journeys\//.test(html)){
  const intro=/(<main\b[^>]*>)(?:<section class="page-intro wrap">)?(<p class="eyebrow">[\s\S]*?<\/p><h1>[\s\S]*?<\/h1><p class="lede">[\s\S]*?<\/p>)(?:<\/section>)?/;
  const figure=/<figure class="(?:wrap )?editorial-figure">[\s\S]*?<\/figure>/;
  const gallery=/<div class="tour-photos"[^>]*><div class="tour-photo-track"[^>]*>[\s\S]*?<\/figure><\/div>(?:<div class="tour-photo-nav"[^>]*>[\s\S]*?<\/div>)?<\/div>(?:<button class="product-film-play"[\s\S]*?<\/button>)?/;
  const hero=new RegExp(`${intro.source}(${figure.source}|<div class="wrap">${gallery.source}</div>|${gallery.source})`);
  const editorial={...pageDefaults,...product.privateEditorial};
  const back=product.heroBack??'← All signature journeys',button=product.heroButton??'Explore this journey ↓';
  html=html.replace(hero,(_,main,heroCopy,media)=>{const poster=media.match(/<img\b[^>]*\bsrc="([^"]+)"/)?.[1]||'';return `${main}${back?`<div class="pt-back"><a href="/private-china-tours/signature-journeys/">${escape(back)}</a></div>`:''}<div class="pt-banner">${media}<div class="pt-caption">${heroCopy}${button?`<a class="pt-story-link" href="#journey-overview">${escape(button)}</a>`:''}</div></div><div id="journey-overview"></div>${filmSection(editorial,poster)}`;});
  if(!html.includes('class="final-cta pt-ending"')){
   if(html.includes('<main class="pt"')){
    const route=/<section><h2>([^<]*)<\/h2><p>([^<]+(?: · [^<]+)+)<\/p><\/section>(?=<section><h2>)/g;
    const candidates=[...html.matchAll(route)],last=candidates.at(-1);
    if(last){const routeCopy={...editorial,route:product.privateEditorial?.route??decodeCopy(last[2]).split(' · ').join('\n')};html=html.replace(last[0],()=>routeSection(routeCopy));}
    if(editorial.days){html=html.replace(/(<section class="pt-route">[\s\S]*?<\/section>)<section><h2>[^<]*<\/h2><p>[^<]*?<\/p><\/section>/,(_,routeHtml)=>routeHtml+daySection(editorial));}
   }
   html=pageEnding(html,editorial,product.title||decodeCopy(html.match(/<h1>([^<]+)/)?.[1]||'Private journey'));
  }
 }
 if(html.includes('id="home-quick-inquiry"')){
  const cover=html.match(/data-slide="0"[^>]*>\s*<img\b[^>]*\bsrc="([^"]+)"/)?.[1];
  if(cover)html=html.replace(/(<link rel="preload" as="image" href=")[^"]+/,(_,prefix)=>prefix+cover);
 }
 if(html.includes('src="/quote-builder.js"')&&!html.includes('src="/pages-inquiry.js'))html=html.replace('</head>','<script defer src="/pages-inquiry.js"></script></head>');
 if(html.includes('id="navigation"'))html=withPrivateMenu(html);
 html=html.replace('src="/private-tours.js"','src="/private-tours.js?v=film-cover-1"').replace(/href="\/private-tours\.css(?:\?[^"]*)?"/g,'href="/private-tours.css?v=film-button-2"').replace('src="/tour-photos.js"','src="/tour-photos.js?v=hero-photos-3"');
 html=html.replace(/src="\/quote-builder\.js(?:\?[^"\s]*)?"/g,'src="/quote-builder.js?v=inquiry-email-1"');
 html=html.replace(/src="\/(home-v1|pages-inquiry|analytics)\.js(?:\?[^"\s]*)?"/g,(_,name)=>'src="/'+name+'.js?v='+(name==='analytics'?'ga4-20261113':'inquiry-confirm-1')+'"');
 html=html.replace(/href="\/quote-builder\.css(?:\?[^"\s]*)?"/g,'href="/quote-builder.css?v=inquiry-confirm-1"');
 if(html.includes('id="cruise-inquiry"'))html=html.replace('/quote-builder.js?v=inquiry-email-1','/quote-builder.js?v=cruise-form-1').replace('/pages-inquiry.js?v=inquiry-confirm-1','/pages-inquiry.js?v=cruise-form-1');
 if(html.includes('method="dialog" data-type="rail"'))html=html.replace('/pages-inquiry.js?v=cruise-form-1','/pages-inquiry.js?v=rail-1');
 html=html.replace(/(src="\/(?:quote-builder|pages-inquiry)\.js)\?[^"]+"/g,'$1?v=inquiry-layout-1"').replace(/(href="\/quote-builder\.css)\?[^"]+"/g,'$1?v=inquiry-layout-1"');
 if(/src="\/analytics\.js(?:\?[^"\s]*)?"/.test(html))return html;
 return html.replace('</head>','<link rel="stylesheet" href="/analytics.css"><script src="/analytics.js?v=ga4-20261113" defer></script></head>');
}
