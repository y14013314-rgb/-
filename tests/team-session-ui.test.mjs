import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('expired save reveals login and reauthentication preserves unsaved text',async()=>{
 const elements=new Map();
 const get=id=>{if(!elements.has(id))elements.set(id,{hidden:true,textContent:'',value:'',disabled:false,querySelectorAll:()=>[],scrollIntoView(){this.scrolled=true;}});return elements.get(id);};
 const context=vm.createContext({document:{getElementById:get,querySelectorAll:()=>[],querySelector:()=>({classList:{add(){}}})},window:{addEventListener(){}},fetch:async()=>({ok:false,status:401,json:async()=>({error:'请先登录。'})}),confirm:()=>true});
 vm.runInContext(readFileSync(new URL('../team/public/team.js',import.meta.url),'utf8')+'\n globalThis.ui={api,showUser,draw,fields,loadProduct,setDraft(){product={title:"Unsaved name"};dirty=true;},getDraft(){return product;}};',context);
 context.ui.setDraft();get('identity').textContent='owner@example.test';
 await assert.rejects(context.ui.api('save',{product:{title:'Unsaved name'},revision:2}),/未保存的修改仍保留/);
 assert.equal(get('send').hidden,false);assert.equal(get('session-title').textContent,'登录状态已失效');
 assert.equal(get('email').value,'owner@example.test');assert.equal(get('send').scrolled,true);
 context.ui.draw();assert.match(get('editor-tabs').innerHTML,/基本信息/);assert.match(get('fields').innerHTML,/Unsaved name/);assert.match(context.ui.fields({src:'/assets/photo.webp'},['image']),/<img/);assert.match(context.ui.fields({src:'/assets/photo.webp'},['image']),/选择或更换图片/);
 const draft=context.ui.getDraft();await context.ui.showUser({email:'owner@example.test',role:'editor'});
 assert.equal(context.ui.getDraft(),draft);assert.equal(draft.title,'Unsaved name');
 context.fetch=async()=>({ok:true,json:async()=>({product:{slug:'new-journey',title:'New journey',values:{field0:'Text'},sections:[]},placements:[{value:'itineraries',label:'推荐行程'},{value:'destinations',label:'目的地探索'}],fields:[{key:'field0',label:'Introduction',type:'text'}],url:'/journeys/new-journey/',revision:1,canPublish:true,canUnpublish:true})});
 await context.ui.loadProduct('new-journey');assert.equal(get('product-select').value,'new-journey');assert.equal(get('live-link').href,'/journeys/new-journey/');
 assert.match(context.ui.fields({placement:'destinations'}),/目的地探索/);assert.match(context.ui.fields({placement:'destinations'}),/value="destinations" selected/);
 assert.equal(get('send').hidden,true);assert.match(get('message').textContent,/未保存的修改已保留/);
});

test('lost save response is reconciled by reading the draft without repeating the write',async()=>{
 const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',querySelectorAll:()=>[]});return elements.get(id);};
 const context=vm.createContext({document:{getElementById:get},window:{addEventListener(){}},fetch:async()=>({ok:false,status:401,json:async()=>({})})});
 vm.runInContext(readFileSync(new URL('../team/public/team.js',import.meta.url),'utf8')+`
 globalThis.ui={saveDraft,setDraft(){product={slug:'123',title:'测试',placement:'destinations'};selectedSlug='123';revision=1;dirty=true;},state(){return {revision,dirty,product};}};`,context);
 context.ui.setDraft();const calls=[];context.fetch=async(url)=>{calls.push(url);if(url.endsWith('/save'))throw new TypeError('Failed to fetch');return {ok:true,json:async()=>({product:{slug:'123',title:'测试',placement:'destinations'},revision:2})};};
 await context.ui.saveDraft();assert.equal(context.ui.state().revision,2);assert.equal(context.ui.state().dirty,false);assert.equal(calls.filter(x=>x.endsWith('/save')).length,1);assert.match(get('message').textContent,/草稿已保存/);
 context.ui.setDraft();context.fetch=async(url)=>{if(url.endsWith('/save'))throw new TypeError('Failed to fetch');return {ok:true,json:async()=>({product:{slug:'123',title:'Older'},revision:1})};};
 await assert.rejects(context.ui.saveDraft(),/连接中断/);assert.equal(context.ui.state().dirty,true);assert.equal(context.ui.state().product.title,'测试');assert.equal(context.ui.state().revision,1);
 context.fetch=async()=>{throw new TypeError('Failed to fetch');};await assert.rejects(context.ui.saveDraft(),/请勿刷新/);assert.equal(context.ui.state().dirty,true);
});
