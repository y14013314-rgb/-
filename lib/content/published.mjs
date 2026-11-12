import {renderTrain} from './render-train.mjs';
import template from './train-template.mjs';
import {onCatalogPage,htmlResponse} from './catalog-published.mjs';
export async function published(context,collection=false){
 if(!collection)return onCatalogPage(context,'baiyun');
 const fallback=await context.next();if(new URL(context.request.url).searchParams.get('team-preview')==='baiyun')return fallback;if(!context.env.TEAM_DB||!fallback.ok||context.request.method!=='GET')return fallback;
 let row;try{row=await context.env.TEAM_DB.prepare('SELECT * FROM product_content WHERE slug=?').bind('baiyun').first();}catch{return fallback;}
 if(!row?.published&&!row?.is_hidden)return fallback;
 const card=row.is_hidden?'':renderTrain(JSON.parse(row.published),template,context.env.SITE_URL||new URL(context.request.url).origin).card;
 return htmlResponse((await fallback.text()).replace(/<article class="cruise-collection-card" id="baiyun">[\s\S]*?<\/article>/,()=>card),fallback);
}
