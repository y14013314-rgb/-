import template from './train-template.mjs';
import { renderTrain } from './render-train.mjs';
export async function published(context,collection=false) {
  const {env,request}=context;
  const fallback=await context.next();
  if(!env.TEAM_DB||!fallback.ok||request.method!=='GET')return fallback;
  let row;
  try { row=await env.TEAM_DB.prepare('SELECT published FROM product_content WHERE slug=?').bind('baiyun').first(); }
  catch { console.error('Published product lookup unavailable'); return fallback; }
  if(!row?.published)return fallback;
  const result=renderTrain(JSON.parse(row.published),template,env.SITE_URL||new URL(request.url).origin);
  const html=collection?(await fallback.text()).replace(/<article class="cruise-collection-card" id="baiyun">[\s\S]*?<\/article>/,()=>result.card):result.detail;
  const headers=new Headers(fallback.headers);
  headers.set('Content-Type','text/html; charset=utf-8');headers.set('Cache-Control','no-store');
  headers.delete('Content-Length');headers.delete('ETag');headers.delete('Content-Encoding');
  return new Response(html,{status:200,headers});
}
