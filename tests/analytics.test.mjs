import {test} from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
import {withAnalytics} from '../lib/content/analytics.mjs';
const source=readFileSync(new URL('../public/analytics.js',import.meta.url),'utf8');
function setup({consent,host='sukhatrip.com',path='/journeys/classic-china/',query='?email=private@example.test#secret',session=new Map()}={}){
 const map=new Map();if(consent)map.set('sukha-analytics-consent-v1',JSON.stringify({choice:consent,expires:Date.now()+60000}));
 const listeners={},created=[],cookies=[],buttons=['accepted','rejected'].map(choice=>({dataset:{analyticsChoice:choice},focus(){}}));let panel,settings,reloads=0;
 const storage=m=>({getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)});
 const doc={referrer:'https://referrer.test/secret?email=private@example.test',get cookie(){return '_ga=abc; _ga_VTMK0R2B1W=xyz; __Host-sukha-team=keep';},set cookie(v){cookies.push(v);},head:{append:e=>created.push(e)},body:{append(a,b){if(!panel){panel=a;settings=b;}}},createElement(type){return {type,style:{},setAttribute(){},querySelectorAll:()=>buttons,querySelector:()=>buttons[0],focus(){}};},addEventListener:(n,f)=>listeners[n]=f};
 const location={hostname:host,origin:'https://'+host,pathname:path,search:query,href:'https://'+host+path+query,reload(){reloads++;}};
 const window={addEventListener:(n,f)=>listeners[n]=f};const context=vm.createContext({document:doc,window,location,localStorage:storage(map),sessionStorage:storage(session),URL,URLSearchParams,Date,Set});vm.runInContext(source,context);
 return {context,created,buttons,cookies,map,listeners,session,get panel(){return panel;},get reloads(){return reloads;},calls:()=>Array.from(window.dataLayer||[],x=>Array.from(x)),events:()=>Array.from(window.dataLayer||[],x=>Array.from(x)).filter(x=>x[0]==='event')};
}
test('no external tag until explicit consent; refusal works; acceptance sends one clean page and item event',()=>{
 const ui=setup();assert.equal(ui.created.length,0);ui.buttons[1].onclick();assert.equal(ui.created.length,0);assert.equal(ui.panel.hidden,true);
 ui.buttons[0].onclick();ui.buttons[0].onclick();assert.equal(ui.created.length,1);assert.equal(ui.events().filter(x=>x[1]==='page_view').length,1);assert.equal(ui.events().filter(x=>x[1]==='view_item').length,1);
 const serialized=JSON.stringify(ui.calls());assert(!serialized.includes('private@example'));assert(!serialized.includes('secret'));assert(serialized.includes('https://sukhatrip.com/journeys/classic-china/'));assert(serialized.includes('https://referrer.test/'));
 assert.equal(ui.calls().find(x=>x[0]==='config')[2].send_page_view,false);
});
test('success-only lead counts once across callbacks and session reload; contacts do not expose URLs',()=>{
 const ui=setup({consent:'accepted'}),result={saved:true,reference:'INQ-12345678-1234-1234-1234-123456789ABC',name:'Secret Name',email:'secret@example.test',summary:'Secret summary'};
 ui.context.window.SukhaAnalytics.lead({...result,saved:false});assert.equal(ui.events().filter(x=>x[1]==='generate_lead').length,0);
 ui.context.window.SukhaAnalytics.lead(result);ui.context.window.SukhaAnalytics.lead(result);assert.equal(ui.events().filter(x=>x[1]==='generate_lead').length,1);
 const again=setup({consent:'accepted',session:ui.session});again.context.window.SukhaAnalytics.lead(result);assert.equal(again.events().filter(x=>x[1]==='generate_lead').length,0);
 ui.listeners.click({target:{closest:()=>({href:'https://wa.me/12345?text=Secret%20summary'})}});const payload=JSON.stringify(ui.events());assert(payload.includes('whatsapp'));assert(!payload.includes('12345'));assert(!payload.includes('Secret'));assert(!payload.includes('INQ-'));
});
test('withdrawal disables analytics, removes only GA cookies and reloads; preview/admin never start',()=>{
 const ui=setup({consent:'accepted'});ui.buttons[1].onclick();assert.equal(ui.context.window['ga-disable-G-VTMK0R2B1W'],true);assert.equal(ui.reloads,1);assert(ui.cookies.length>0);assert(ui.cookies.every(c=>c.startsWith('_ga')));const count=ui.events().length;ui.listeners.click({target:{closest:()=>({href:'mailto:secret@example.test'})}});assert.equal(ui.events().length,count);
 for(const options of [{host:'preview.pages.dev'},{path:'/team/'},{path:'/api/team/preview'},{query:'?team-preview=classic-china'}])assert.equal(setup({consent:'accepted',...options}).created.length,0);
 assert.equal(setup({consent:'rejected'}).created.length,0);
});
test('declined historical leads are not emitted when consent is granted later; injection stays single',()=>{
 const ui=setup(),v={saved:true,reference:'INQ-12345678-1234-1234-1234-123456789ABC'};ui.context.window.SukhaAnalytics.lead(v);ui.buttons[0].onclick();ui.context.window.SukhaAnalytics.lead(v);assert.equal(ui.events().filter(x=>x[1]==='generate_lead').length,0);
 const html='<head></head><body></body>';assert.equal(withAnalytics(withAnalytics(html)).split('src="/analytics.js?v=ga4-20261113"').length-1,1);
 const upgraded=withAnalytics('<head><script src="/home-v1.js"></script><script src="/pages-inquiry.js"></script></head>');assert(upgraded.includes('/home-v1.js?v=ga4-20261113'));assert(upgraded.includes('/pages-inquiry.js?v=ga4-20261113'));
 const reinjected=withAnalytics(upgraded);assert.equal(reinjected,upgraded);
});

test('debug link marks events and renders local diagnostics without sending the query',()=>{
 const ui=setup({consent:'accepted',query:'?analytics_debug=1'});assert(ui.events().every(e=>e[2].debug_mode===true));assert(!JSON.stringify(ui.events()).includes('analytics_debug'));
 ui.context.window.SukhaAnalytics.lead({saved:true,reference:'INQ-12345678-1234-1234-1234-123456789ABC'});assert.equal(ui.events().filter(e=>e[1]==='generate_lead').length,1);
});
