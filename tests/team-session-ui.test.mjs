import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('video upload updates only the draft, blocks concurrent editing and preserves it on failure',async()=>{
 const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',inert:false,querySelectorAll:()=>[]});return elements.get(id);};
 let failure='',sends=0;
 const context=vm.createContext({document:{getElementById:get},window:{addEventListener(){}},FormData,
  fetch:async url=>url.endsWith('video-auth')?{ok:true,json:async()=>({token:'signed',parameters:{fileName:'video.mp4'}})}:{ok:false,status:401,json:async()=>({})},
  XMLHttpRequest:class{
   constructor(){this.upload={};}open(method,url){assert.equal(url,'/api/team/video-upload');}
   send(form){sends++;assert.equal(get('workspace').inert,true);assert.equal(form.get('token'),'signed');if(failure==='network'){this.onerror();return;}if(failure==='timeout'){this.ontimeout();return;}this.status=failure==='provider'?502:failure==='session'?401:failure==='size'?413:200;this.responseText=failure==='provider'?JSON.stringify({error:'官网与视频存储服务的连接中断'}):failure==='size'?'<h1>Too large</h1>':JSON.stringify({url:'https://ik.imagekit.io/negxem1l9/upload.mp4'});this.onload();}
  }
 });
 vm.runInContext(readFileSync(new URL('../team/public/team.js',import.meta.url),'utf8')+`
 globalThis.ui={uploadVideo,setDraft(){product={slug:'classic-china',title:'Unsaved title',values:{},sections:[]};dirty=true;},state(){return {product,dirty};}};`,context);
 context.ui.setDraft();const file=new File(['video'],'clip.mp4',{type:'video/mp4'}),input={files:[file],dataset:{videoUpload:'["videoUrl"]'},value:'file'};
 await context.ui.uploadVideo(input);assert.equal(context.ui.state().product.videoUrl,'https://ik.imagekit.io/negxem1l9/upload.mp4');assert.equal(context.ui.state().dirty,true);assert.equal(get('workspace').inert,false);assert.match(get('message').textContent,/请保存草稿/);
 for(const [mode,message]of [['network',/电脑与官网.*结果未确认/],['timeout',/超过 10 分钟/],['provider',/官网与视频存储服务/],['size',/99 MB/]]){
  context.ui.setDraft();failure=mode;await context.ui.uploadVideo(input);assert.equal(context.ui.state().product.videoUrl,undefined);assert.equal(context.ui.state().product.title,'Unsaved title');assert.match(get('message').textContent,message);assert.equal(get('workspace').inert,false);
 }
 let loginPrompted=false;context.promptLogin=()=>{loginPrompted=true;};vm.runInContext('requireLogin=promptLogin;',context);
 failure='session';await context.ui.uploadVideo(input);assert(loginPrompted);assert.match(get('message').textContent,/重新登录/);
 input.files=[{name:'huge.mp4',type:'video/mp4',size:99000001}];await context.ui.uploadVideo(input);assert.equal(sends,6);assert.match(get('message').textContent,/99 MB/);
});
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
 get('preview-position').href='https://sukhatrip.com/private-china-tours/?team-preview=123#more-journeys';await context.ui.saveDraft();assert.match(get('preview-position').href,/#destinations$/);assert.equal(context.ui.state().revision,2);assert.equal(context.ui.state().dirty,false);assert.equal(calls.filter(x=>x.endsWith('/save')).length,1);assert.match(get('message').textContent,/草稿已保存/);
 context.ui.setDraft();context.fetch=async(url)=>{if(url.endsWith('/save'))throw new TypeError('Failed to fetch');return {ok:true,json:async()=>({product:{slug:'123',title:'Older'},revision:1})};};
 await assert.rejects(context.ui.saveDraft(),/连接中断/);assert.equal(context.ui.state().dirty,true);assert.equal(context.ui.state().product.title,'测试');assert.equal(context.ui.state().revision,1);
 context.fetch=async()=>{throw new TypeError('Failed to fetch');};await assert.rejects(context.ui.saveDraft(),/请勿刷新/);assert.equal(context.ui.state().dirty,true);
});

test('destination editor keeps its fixed preview anchor and supports Chinese search and category labels',async()=>{
 const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',querySelectorAll:()=>[]});return elements.get(id);};
 const context=vm.createContext({document:{getElementById:get,querySelectorAll:()=>[]},window:{addEventListener(){}},fetch:async()=>({ok:false,status:401,json:async()=>({})})});
 vm.runInContext(readFileSync(new URL('../team/public/team.js',import.meta.url),'utf8')+`\n globalThis.ui={loadProducts,loadProduct,saveDraft};`,context);
 context.fetch=async url=>({ok:true,json:async()=>url.endsWith('/products')?{templates:[],products:[{slug:'destination-tibet',label:'Tibet',localName:'西藏',category:'destinations'}]}:url.endsWith('/save')?{revision:1}:{product:{slug:'destination-tibet',title:'Tibet',values:{}},placements:[],fields:[],url:'/destinations/tibet/',collectionPreviewUrl:'/private-china-tours/?team-preview=destination-tibet#tibet',revision:0,canPublish:true}});
 await context.ui.loadProducts();assert.match(get('product-cards').innerHTML,/西藏/);assert.match(get('product-cards').innerHTML,/目的地/);assert.match(get('product-select').innerHTML,/西藏/);
 await context.ui.loadProduct('destination-tibet');assert(!get('fields').innerHTML.includes('发布位置'));await context.ui.saveDraft();assert(get('preview-position').href.endsWith('#tibet'));
});

test('video URL editing refreshes the preview without redrawing or losing the draft',()=>{
 const elements=new Map(),preview={innerHTML:''};
 const input={dataset:{path:'["videoUrl"]'},value:'https://www.youtube.com/watch?v=M7lc1UVf-VE',hasAttribute:name=>name==='data-video-link',closest:()=>({querySelector:()=>preview})};
 const get=id=>{if(!elements.has(id))elements.set(id,{querySelectorAll:selector=>id==='fields'&&selector==='[data-path]'?[input]:[]});return elements.get(id);};
 const context=vm.createContext({URL,document:{getElementById:get},window:{addEventListener(){}},fetch:async()=>({ok:false,status:401,json:async()=>({})})});
 vm.runInContext(readFileSync(new URL('../team/public/team.js',import.meta.url),'utf8')+'\nproduct={title:"Keep my edits",videoUrl:"https://example.test/old.mp4"};draw();globalThis.state=()=>({product,dirty});',context);
 input.onchange();assert.match(preview.innerHTML,/src="https:\/\/www.youtube.com\/embed\/M7lc1UVf-VE"/);assert(!preview.innerHTML.includes('<video'));assert.equal(context.state().product.videoUrl,input.value);assert.equal(context.state().product.title,'Keep my edits');assert.equal(context.state().dirty,true);
 input.value='https://example.test/new.mp4';input.onchange();assert.match(preview.innerHTML,/<video[^>]*src="https:\/\/example.test\/new.mp4"/);
});

test('private editorial products expose one video upload control',()=>{
 const source=readFileSync(new URL('../team/public/team.js',import.meta.url),'utf8');
 assert.match(source,/if\(!editorDefaults\.rail&&!editorDefaults\.privateEditorial\)groups\.media\.push\(fields\(\{videoUrl:/);
});
