const $=id=>document.getElementById(id);let challenge;
function requireLogin(){
 $('send').hidden=false;$('verify').hidden=true;$('code').value='';challenge=null;
 $('session-title').textContent='登录状态已失效';
 $('email').value=$('identity').textContent;
 $('send').scrollIntoView({block:'center',behavior:'smooth'});
}
async function api(action,body){let r,v;try{r=await fetch('/api/team/'+action,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});v=await r.json();}catch{
 const error=new Error('连接中断，未能确认操作结果。当前修改仍保留，请勿刷新页面，稍后再试。');error.connectionLost=true;throw error;
}if(!r.ok){
 if(r.status===401&&!['me','verify','request-code'].includes(action)){
  requireLogin();throw new Error('登录状态已失效，请在上方重新获取验证码。当前未保存的修改仍保留在本页面，重新登录后可继续保存，请勿刷新。');
 }
 throw new Error(v.error||'操作失败，请稍后再试。');
}return v;}
async function saveDraft(){
 try{const v=await api('save',{product,revision});revision=v.revision;}
 catch(error){
  if(!error.connectionLost)throw error;
  let saved;try{saved=await api('product?slug='+encodeURIComponent(selectedSlug));}catch{throw error;}
  if(JSON.stringify(saved.product)!==JSON.stringify(product))throw error;
  revision=saved.revision;
 }
 const link=$('preview-position');if(link.href&&product.placement!==undefined){const position=product.placement,anchor=['original','collection'].includes(position)?(link.href.includes('/private-china-tours/')?'itineraries':link.href.includes('/silk-road-luxury-trains/')?'train-collection':''):position==='more'?'more-journeys':position;link.href=link.href.split('#')[0]+'#'+(anchor||'');}
 dirty=false;$('message').textContent='草稿已保存。请预览，确认后再发布。';
}
async function showUser(user){
 $('send').hidden=true;$('verify').hidden=true;$('workspace').hidden=false;$('identity').textContent=user.email;
 $('session-title').textContent='登录成功';document.querySelector('main').classList.add('editing');
 if(product&&dirty){$('message').textContent='已重新登录，未保存的修改已保留。请点击保存草稿。';}
 else{$('message').textContent='';await loadProducts();await loadProduct();}
 $('inquiry-notifications').hidden=user.role!=='admin';
 if(user.role==='admin')await loadNotifications();
 if(user.role==='admin'){$('members').hidden=false;await loadMembers();}else{$('members').hidden=true;}
}
async function action(form,fn){const wasInert=Boolean(form.inert);form.inert=true;$('message').textContent='正在处理…';try{await fn();}catch(e){$('message').textContent=e.message;}finally{form.inert=wasInert;}}
$('send').onsubmit=e=>{e.preventDefault();action(e.target,async()=>{const v=await api('request-code',{email:$('email').value});challenge=v.challenge;$('send').hidden=true;$('verify').hidden=false;$('message').textContent='验证码邮件已提交发送，请检查收件箱和垃圾邮件。10 分钟内有效。';$('code').focus();});};
$('verify').onsubmit=e=>{e.preventDefault();action(e.target,async()=>showUser(await api('verify',{challenge,code:$('code').value})));};
$('back').onclick=()=>{challenge=null;$('code').value='';$('verify').hidden=true;$('send').hidden=false;$('message').textContent='';};
$('logout').onclick=()=>action($('workspace'),async()=>{await api('logout',{});location.reload();});

let product,revision,dirty=false,selectedSlug='baiyun',fieldSpecs=[],activeTab='basic',existingVideos=[],placementChoices=[],initialGallery=null;
let editorDefaults={};
let copyView='quick',copyViewChosen=false;
try{const saved=localStorage.getItem('teamCopyView');if(saved==='quick'||saved==='all')copyView=saved;}catch{}
const labels={sections:'补充行程与内容',gallery:'附加图片（可新增多张）',values:'页面内容（按页面顺序）',title:'英文名称 / 标题',localTitle:'中文名称',description:'英文介绍',year:'年份',days:'天数',route:'路线（每行一个地点）',image:'主图',src:'素材路径或 HTTPS 地址',alt:'图片说明',credit:'素材来源说明',film:'视频',poster:'视频封面图片',price:'价格',status:'展示方式',currency:'币种',amount:'金额',highlights:'产品亮点',editions:'路线版本',supplement:'附加费用',option:'费用选项说明',unit:'计价单位',source:'费用来源',itinerary:'行程',planningNote:'预订说明',accessNote:'出行限制说明',sources:'参考资料（每行一条）'};
const categoryNames={home:'首页',journeys:'私人行程','silk-road-luxury-trains':'列车','yangtze-river-cruises':'游轮',destinations:'目的地','signature-experiences':'主题体验',experiences:'城市体验',wildlife:'野生动物'};
categoryNames.collection='栏目页';
Object.assign(labels,{pageCopy:'页面文字',backLabel:'详情页顶部「返回栏目」文字',breadcrumbTitle:'详情页顶部显示名称（留空跟随产品名称）',introPhoto:'介绍配图（可选）',cardCopy:'栏目卡片',eyebrow:'小标题 / 中文标签',duration:'展示天数与年份',button:'按钮文字',photo:'配图',itinerary:'行程段',ownItinerary:'使用此版本自己的行程',days:'天数',voyages:'游轮航线',priceNote:'卡片价格文案'});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function youtubeEmbedUrl(value){
 let url;try{url=new URL(value);}catch{return '';}
 if(url.protocol!=='https:')return '';
 const host=url.hostname.replace(/^www\./,'');
 const id=host==='youtu.be'?url.pathname.slice(1):['youtube.com','m.youtube.com','youtube-nocookie.com'].includes(host)?(url.pathname==='/watch'?url.searchParams.get('v'):url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)\/?$/)?.[1]):'';
 return /^[\w-]{11}$/.test(id||'')?'https://www.youtube.com/embed/'+id:'';
}
function videoPreview(value){
 const frame=youtubeEmbedUrl(value);
 return !value?'':frame?`<iframe title="产品视频预览" src="${frame}" style="width:100%;aspect-ratio:16/9;border:0" allow="fullscreen; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`:`<video controls playsinline preload="metadata" src="${esc(value)}"></video>`;
}
function primaryImageFieldKey(){return fieldSpecs.find(f=>f.type==='image')?.key||'';}
function fields(value,path=[]){return Object.entries(value).filter(([k])=>!['slug','templateSlug','featured','sourceIndex'].includes(k)).map(([k,v])=>{
 const p=[...path,k],key=esc(JSON.stringify(p)),label=(path[0]==='pageCopy'?editorDefaults.pageFields?.find(f=>f.key===k)?.label:fieldSpecs.find(f=>f.key===k)?.label)||labels[k]||k;
 if(k==='placement')return `<label>发布位置<select data-path="${key}">${placementChoices.map(o=>`<option value="${esc(o.value)}" ${v===o.value?'selected':''}>${esc(o.label)}</option>`).join('')}</select><small>保存草稿并发布后，会移到所选栏目。产品详情网址保持不变。</small></label>`;
 if(typeof v==='boolean')return `<label class="check-label"><input type="checkbox" data-path="${key}" data-type="boolean" ${k==='ownItinerary'?'data-redraw':''} ${v?'checked':''}> ${esc(label)}</label>`;
 if(Array.isArray(v)){
  if(k==='route'||k==='sources')return `<label>${esc(label)}<textarea data-path="${key}" data-type="lines" rows="4">${esc(v.join('\n'))}</textarea></label>`;
  return `<fieldset><legend>${esc(label)}</legend>${v.map((x,i)=>`<fieldset><legend>第 ${i+1} 项</legend>${fields(x,[...p,i])}${k==='gallery'?`<p><button type="button" data-move="${esc(JSON.stringify([...p,i]))}" data-dir="up" ${i===0?'disabled':''}>上移</button> <button type="button" data-move="${esc(JSON.stringify([...p,i]))}" data-dir="down" ${i===v.length-1?'disabled':''}>下移</button> <button type="button" data-set-cover="${esc(JSON.stringify([...p,i]))}" ${!x?.src?'disabled':''}>设为封面</button></p>`:''}<button type="button" data-remove="${esc(JSON.stringify([...p,i]))}">删除此项</button></fieldset>`).join('')}<button type="button" data-add="${key}">添加一项</button></fieldset>`;
 }
 if(v&&typeof v==='object')return `<fieldset><legend>${esc(label)}</legend>${fields(v,p)}</fieldset>`;
 if(k==='status'&&path[0]==='price')return `<label>${esc(label)}<select data-path="${key}"><option value="on-request" ${v==='on-request'?'selected':''}>询价 · Price on request</option><option value="from" ${v==='from'?'selected':''}>每人起价 · From</option></select></label>`;
 const optionalImage=(k==='src'&&(path[0]==='introPhoto'||path[0]==='plan'))||(path[0]==='cardCopy'&&k==='photo');
 const isImage=optionalImage||(path[0]==='image'&&k==='src')||(path[0]==='film'&&k==='poster')||(path[0]==='gallery'&&k==='src')||fieldSpecs.find(f=>f.key===k)?.type==='image';
 if(isImage)return `<article class="media-card"><div class="media-frame"><img ${v?`src="${esc(v)}"`:'hidden'} alt="${esc(label)}" loading="lazy"></div><div class="media-copy"><strong>${esc(label)}</strong><label class="upload-button">选择或更换图片<input type="file" accept="image/jpeg,image/png,image/webp" data-upload="${key}"></label>${optionalImage&&v?` <button type="button" data-clear-image="${key}">${path[0]==='cardCopy'?'恢复默认图':'移除配图'}</button>`:''}<small>支持 JPG、PNG、WebP，自动压缩</small><details><summary>使用已有图片链接</summary><textarea aria-label="${esc(label)}链接" data-image-link data-path="${key}">${esc(v)}</textarea></details></div></article>`;
 if((path[0]==='film'&&k==='src')||k==='videoUrl')return `<article class="media-card"><div data-video-preview>${videoPreview(v)}</div><div class="media-copy"><strong>产品视频</strong><p>可上传 99 MB 以内的 MP4，或粘贴 YouTube 视频链接。修改后请保存草稿、预览并发布。</p><label class="upload-button">选择或更换视频<input type="file" accept="video/mp4,.mp4" data-video-upload="${key}"></label><details><summary>修改视频链接</summary><textarea aria-label="视频链接" data-video-link data-path="${key}">${esc(v)}</textarea></details></div></article>`;
 return `<label>${esc(label)}${typeof v==='number'?`<input type="number" step="any" data-path="${key}" data-type="number" value="${esc(v)}">`:`<textarea data-path="${key}" rows="${['description','planningNote','accessNote'].includes(k)?4:2}">${esc(v)}</textarea>`}</label>${(path[0]==='image'&&k==='src')||(path[0]==='film'&&k==='poster')||(path[0]==='gallery'&&k==='src')||fieldSpecs.find(f=>f.key===k)?.type==='image'?`<label>从电脑上传图片<input type="file" accept="image/jpeg,image/png,image/webp" data-upload="${key}"></label>`:''}`;
 }).join('');}
function at(path){
 if(path[0]==='gallery'&&initialGallery&&!product.galleryUnified){product.gallery=initialGallery.map(item=>({...item}));product.galleryUnified=true;}
 if(['cardCopy','pageCopy','introPhoto','plan'].includes(path[0])&&!product[path[0]])product[path[0]]=path[0]==='plan'?structuredClone(editorDefaults.plan):path[0]==='introPhoto'?blankPhoto():{};
 return path.reduce((x,k)=>x[k],product);
}
const blankPhoto=()=>({src:'',alt:'',credit:''});
const blankDay=()=>({title:'',description:'',photo:blankPhoto()});
const blankEdition=()=>({...blankDay(),ownItinerary:false,days:'',route:'',itinerary:[]});
function planList(items,path,caption,render){
 const key=esc(JSON.stringify(path));
 return `<fieldset class="plan-list"><legend>${caption} · ${items.length} 项</legend>${items.map((item,index)=>{
  const itemPath=[...path,index],target=esc(JSON.stringify(itemPath));
  return `<fieldset class="plan-item"><legend>第 ${index+1} 项</legend><div class="gallery-actions"><button type="button" data-move="${target}" data-dir="up" ${index===0?'disabled':''}>上移</button><button type="button" data-move="${target}" data-dir="down" ${index===items.length-1?'disabled':''}>下移</button><button type="button" data-remove="${target}">删除此项</button></div>${render(item,itemPath)}</fieldset>`;
 }).join('')}<button type="button" data-add="${key}">＋ 新增${caption}</button></fieldset>`;
}
function planEditor(plan){
 const days=(items,path)=>planList(items,path,'行程段',fields);
 if(plan.voyages)return plan.voyages.map((voyage,index)=>`<fieldset><legend>${esc(voyage.title)}</legend>${days(voyage.itinerary,['plan','voyages',index,'itinerary'])}</fieldset>`).join('');
 return `<p>每段可填写一天或一个日期范围，增删不会自动修改产品总天数。未设置独立行程的版本沿用下方的共用行程。</p>`+planList(plan.editions,['plan','editions'],'路线版本',(edition,path)=>fields({title:edition.title,description:edition.description,photo:edition.photo,ownItinerary:edition.ownItinerary},path)+(edition.ownItinerary?fields({days:edition.days,route:edition.route},path)+days(edition.itinerary,[...path,'itinerary']):''))+days(plan.itinerary,['plan','itinerary']);
}
function galleryFields(items){
 return `<section class="gallery-editor"><h3>产品图片 · ${items.length} 张</h3><button type="button" data-gallery-add ${items.length>=50?'disabled':''}>＋ 添加图片</button><div class="gallery-items">${items.map((item,index)=>`<fieldset><legend>第 ${index+1} 张${index===0?' · 封面':''}</legend><div class="gallery-actions"><button type="button" data-gallery-move="${index}" data-direction="-1" ${index===0?'disabled':''} aria-label="上移第 ${index+1} 张图片">上移</button><button type="button" data-gallery-move="${index}" data-direction="1" ${index===items.length-1?'disabled':''} aria-label="下移第 ${index+1} 张图片">下移</button><button type="button" data-gallery-remove="${index}" ${items.length===1?'disabled':''} aria-label="删除第 ${index+1} 张图片">删除图片</button></div>${fields(item,['gallery',index])}</fieldset>`).join('')}</div></section>`;
}
function classifyCopyField(spec){
 const text=(spec?.label||'').toLowerCase();
 if(/footer|wordmark|privacy|whatsapp|wechat|contact|©|copyright/.test(text))return 'footer';
 if(/navigation|nav|main navigation|private tours|train journeys|river cruises|about us/.test(text))return 'nav';
 if(/cta|request a quote|start planning|plan my trip|explore the journey/.test(text))return 'cta';
 return 'other';
}
function draw(){
 if(product.price&&!product.price.currency)product.price.currency='CNY';
 if(product.price&&product.price.amount===undefined)product.price.amount=0;
 const groups={basic:[],card:[],media:[],plan:[],content:[],price:[]};
 const gallery=product.galleryUnified?product.gallery:initialGallery;
 if(gallery)groups.media.push(galleryFields(gallery));
 if(editorDefaults.collection){
  groups.content.push(fields({backLabel:product.backLabel}));
 }else if(product.values){
  groups.basic.push(fields(placementChoices.length?{title:product.title,placement:product.placement}:{title:product.title}));
  const media={},text={},quick={nav:{},footer:{},cta:{}};
  for(const [key,value]of Object.entries(product.values)){
   const spec=fieldSpecs.find(f=>f.key===key);
   if(spec?.type==='image'){if(!gallery)media[key]=value;continue;}
   if(gallery&&spec?.label==='图片 说明')continue;
   if(editorDefaults.planFields?.includes(key))continue;
   text[key]=value;
   const group=classifyCopyField(spec);
   if(group!=='other')quick[group][key]=value;
  }
  groups.media.push(fields(media,['values']));groups.media.push(fields({videoUrl:product.videoUrl??existingVideos[0]??''}));
  if(!gallery)groups.media.push(fields({gallery:product.gallery||[]}));
  const quickBlocks=[];
  if(Object.keys(quick.nav).length)quickBlocks.push(`<fieldset><legend>快捷：导航文案</legend>${fields(quick.nav,['values'])}</fieldset>`);
  if(Object.keys(quick.footer).length)quickBlocks.push(`<fieldset><legend>快捷：页脚文案</legend>${fields(quick.footer,['values'])}</fieldset>`);
  if(Object.keys(quick.cta).length)quickBlocks.push(`<fieldset><legend>快捷：CTA 文案</legend>${fields(quick.cta,['values'])}</fieldset>`);
  {
   const all=editorDefaults.plan&&!copyViewChosen||copyView==='all';
   groups.content.push(`<div class="copy-view-toggle"><button type="button" data-copy-view="quick" aria-pressed="${!all}">快捷分组</button><button type="button" data-copy-view="all" aria-pressed="${Boolean(all)}">全部字段</button></div>`);
   groups.content.push(`<div data-copy-quick ${all?'hidden':''}>${quickBlocks.join('')||'<p>当前页面没有可识别的快捷文案分组。</p>'}</div>`);
   groups.content.push(`<div data-copy-all ${all?'':'hidden'}><fieldset><legend>完整：页面文字</legend>${fields(text,['values'])}</fieldset></div>`);
  }
  groups.content.push(fields({sections:product.sections||[]}));
 }else{
  for(const [key,value]of Object.entries(product)){if(['slug','templateSlug','featured','gallery','galleryUnified','cardCopy','pageCopy','breadcrumbTitle','plan','introPhoto'].includes(key)||(editorDefaults.rail&&['editions','itinerary'].includes(key))||(gallery&&key==='image'))continue;const group=['image','film'].includes(key)?'media':key==='price'?'price':['title','localTitle','description','year','days','route','placement'].includes(key)?'basic':'content';groups[group].push(fields({[key]:value}));}
 }
 if(editorDefaults.plan){
  groups.basic.push(fields({breadcrumbTitle:product.breadcrumbTitle??editorDefaults.breadcrumbTitle??''}));
  groups.plan.push(planEditor(product.plan||editorDefaults.plan));
  groups.content.unshift(fields({introPhoto:product.introPhoto||blankPhoto()}));
 }
 if(editorDefaults.card)groups.card.push('<p>这里只修改栏目列表。未单独选图时沿用当前默认图；更换不会影响详情图库。</p>'+fields({...editorDefaults.card,...product.cardCopy,photo:product.cardCopy?.photo||editorDefaults.card.photo},['cardCopy']));
 if(editorDefaults.pageFields?.length)groups.content.push('<fieldset><legend>页面标题、按钮与其他文字</legend>'+fields(Object.fromEntries(editorDefaults.pageFields.map(field=>[field.key,product.pageCopy?.[field.key]??field.value])),['pageCopy'])+'</fieldset>');
 const names={basic:'基本信息',card:'栏目卡片',media:'图片与视频',plan:'独立行程',content:editorDefaults.collection?'栏目文字':'行程与文字',price:'价格'};
 const available=Object.keys(groups).filter(k=>groups[k].join('').length);if(!available.includes(activeTab))activeTab=available[0];
 $('editor-tabs').innerHTML=available.map(k=>`<button type="button" data-tab="${k}" aria-pressed="${k===activeTab}">${names[k]}</button>`).join('');
 $('fields').innerHTML=available.map(k=>`<section class="editor-panel" data-panel="${k}" ${k===activeTab?'':'hidden'}>${k==='content'&&editorDefaults.pageFields?.length?'<label class="editor-search">查找文案<input type="search" data-copy-search placeholder="输入页面文字"></label>':''}${groups[k].join('')}</section>`).join('');
 $('editor-tabs').querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{activeTab=b.dataset.tab;$('fields').querySelectorAll('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==activeTab);$('editor-tabs').querySelectorAll('[data-tab]').forEach(t=>t.setAttribute('aria-pressed',String(t.dataset.tab===activeTab)));});
 $('fields').querySelectorAll('[data-path]').forEach(input=>{input.oninput=()=>{const p=JSON.parse(input.dataset.path),key=p.pop();at(p)[key]=input.dataset.type==='boolean'?input.checked:input.dataset.type==='number'?Number(input.value):input.dataset.type==='lines'?input.value.split('\n').filter(s=>s.trim()):input.value;if(editorDefaults.plan&&!p.length&&key==='title'&&product.breadcrumbTitle===undefined)product.breadcrumbTitle='';dirty=true;};input.onchange=()=>{input.oninput();if(input.hasAttribute('data-video-link'))input.closest('.media-card').querySelector('[data-video-preview]').innerHTML=videoPreview(input.value);if(input.hasAttribute('data-image-link')){const img=input.closest('.media-card').querySelector('img');img.hidden=!input.value;if(input.value)img.src=input.value;else img.removeAttribute('src');}if(input.hasAttribute('data-redraw'))draw();};});
 $('fields').querySelectorAll('[data-copy-search]').forEach(input=>input.oninput=()=>{const query=input.value.trim().toLowerCase();input.closest('section').querySelectorAll('textarea').forEach(text=>{const label=text.closest('label');if(label)label.hidden=!(label.textContent+' '+text.value).toLowerCase().includes(query);});});
 $('fields').querySelectorAll('[data-clear-image]').forEach(button=>button.onclick=()=>{const path=JSON.parse(button.dataset.clearImage),key=path.pop();at(path)[key]='';dirty=true;draw();});
 $('fields').querySelectorAll('[data-video-upload]').forEach(input=>input.onchange=()=>uploadVideo(input));
 $('fields').querySelectorAll('[data-upload]').forEach(input=>input.onchange=()=>uploadImage(input));
 $('fields').querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{if(!confirm('删除这条内容？保存并发布后才影响官网。'))return;const p=JSON.parse(b.dataset.remove),i=p.pop();at(p).splice(i,1);dirty=true;draw();});
 $('fields').querySelectorAll('[data-move]').forEach(button=>button.onclick=()=>{const p=JSON.parse(button.dataset.move),i=p.pop(),arr=at(p),target=button.dataset.dir==='up'?i-1:i+1;if(!Array.isArray(arr)||target<0||target>=arr.length)return;[arr[i],arr[target]]=[arr[target],arr[i]];dirty=true;draw();});
 $('fields').querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{const path=JSON.parse(b.dataset.add),key=path.at(-1);let items=at(path);if(!Array.isArray(items))items=at(path.slice(0,-1))[key]=[];items.push(path[0]==='plan'?(key==='editions'?blankEdition():blankDay()):key==='gallery'?blankPhoto():{title:'',description:''});dirty=true;draw();});
 $('fields').querySelectorAll('[data-set-cover]').forEach(button=>button.onclick=()=>{const p=JSON.parse(button.dataset.setCover),i=p.pop(),arr=at(p),item=Array.isArray(arr)?arr[i]:null,key=primaryImageFieldKey();if(!item?.src||!key||!product.values)return;product.values[key]=item.src;dirty=true;$('message').textContent='已设为封面图，请保存草稿并发布。';draw();});
 $('fields').querySelectorAll('[data-copy-view]').forEach(button=>button.onclick=()=>{copyView=button.dataset.copyView;copyViewChosen=true;try{localStorage.setItem('teamCopyView',copyView);}catch{}draw();});
 $('fields').querySelectorAll('[data-gallery-add]').forEach(button=>button.onclick=()=>{const items=at(['gallery']);if(items.length>=50)return;items.push({src:'',alt:'',credit:''});dirty=true;draw();$('fields').querySelector('.gallery-items > fieldset:last-child')?.scrollIntoView({block:'center'});});
 $('fields').querySelectorAll('[data-gallery-remove]').forEach(button=>button.onclick=()=>{if(gallery.length<=1||!confirm('删除这张产品图片？保存并发布后才影响官网。'))return;at(['gallery']).splice(Number(button.dataset.galleryRemove),1);dirty=true;draw();});
 $('fields').querySelectorAll('[data-gallery-move]').forEach(button=>button.onclick=()=>{const items=at(['gallery']),index=Number(button.dataset.galleryMove),target=index+Number(button.dataset.direction);if(target<0||target>=items.length)return;[items[index],items[target]]=[items[target],items[index]];dirty=true;draw();});
}
async function loadProduct(slug=selectedSlug){const v=await api('product?slug='+encodeURIComponent(slug));selectedSlug=slug;$('product-select').value=slug;product=v.product;editorDefaults=v.editor||{};initialGallery=v.gallery||null;placementChoices=v.placements||[];fieldSpecs=v.fields||[];existingVideos=v.videos||[];revision=v.revision;dirty=false;draw();$('live-link').href=v.url;$('delete-product').hidden=!v.canDelete;$('delete-product').disabled=!v.canPublish||Boolean(v.publishedAt&&!v.hidden);$('unpublish').hidden=!v.canUnpublish;$('unpublish').disabled=!v.canPublish||v.hidden;$('preview').href='/api/team/preview?slug='+encodeURIComponent(selectedSlug);$('preview').textContent=editorDefaults.collection?'预览栏目页 ↗':'预览产品详情 ↗';$('preview-position').hidden=!v.collectionPreviewUrl;$('preview-position').href=v.collectionPreviewUrl||'#';$('publish').disabled=!v.canPublish;document.querySelectorAll('[data-product]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.product===selectedSlug)));$('publication').textContent=v.hidden?'已下架；保存后重新发布即可上架。':v.publishedAt?'最近发布：'+new Date(v.publishedAt).toLocaleString('zh-CN'):'尚未通过后台发布，官网仍使用原内容。';}
$('editor').onsubmit=e=>{e.preventDefault();action(e.target,saveDraft);};
$('preview').onclick=e=>{if(dirty){e.preventDefault();$('message').textContent='请先保存草稿，再打开预览。';}};
$('preview-position').onclick=$('preview').onclick;
$('publish').onclick=()=>{if(dirty){$('message').textContent='请先保存草稿并预览。';return;}if(!confirm('确认将当前所选产品的已保存草稿发布到正式官网？'))return;action($('editor'),async()=>{const v=await api('publish',{revision,slug:selectedSlug});revision=v.revision;$('publication').textContent='最近发布：'+new Date(v.published_at).toLocaleString('zh-CN');$('message').textContent='已发布。可点击“查看官网”核对。';$('unpublish').disabled=selectedSlug==='homepage';$('delete-product').disabled=true;await loadProducts();});};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});

async function loadMembers(){const v=await api('members');$('member-list').innerHTML=v.members.map(m=>`<p>${esc(m.email)} · ${m.active?'已授权':'已停用'} <button type="button" data-member="${esc(m.email)}" data-active="${m.active?'0':'1'}">${m.active?'停用':'恢复'}</button></p>`).join('')||'<p>尚未添加同事。</p>';$('member-list').querySelectorAll('[data-member]').forEach(b=>b.onclick=()=>{if(!confirm(b.dataset.active==='0'?'停用后该同事将无法继续访问后台，确定？':'恢复该同事的编辑权限？'))return;action($('members'),async()=>{await api('members',{email:b.dataset.member,active:b.dataset.active==='1'});await loadMembers();$('message').textContent='成员权限已更新。';});});}
$('member-form').onsubmit=e=>{e.preventDefault();action(e.target,async()=>{await api('members',{email:$('member-email').value,active:true});$('member-email').value='';await loadMembers();$('message').textContent='已授权。同事可使用自己的邮箱验证码登录；可以编辑、预览并自行发布。';});};
async function loadProducts(){const v=await api('products');$('create-template').innerHTML=v.templates.map(t=>`<option value="${esc(t.slug)}">${esc({'journeys':'私人行程','silk-road-luxury-trains':'列车','yangtze-river-cruises':'游轮'}[t.category]||'产品')} · ${esc(t.label)}</option>`).join('');$('product-select').innerHTML=v.products.map(p=>`<option value="${esc(p.slug)}">${esc(categoryNames[p.category]||'产品')} · ${esc(p.localName?p.localName+' · ':'')}${esc(p.label)}</option>`).join('');$('product-select').value=selectedSlug;
 $('product-cards').innerHTML=v.products.map(p=>`<button type="button" class="product-card" data-product="${esc(p.slug)}" aria-pressed="${p.slug===selectedSlug}"><img src="${esc(p.image||'')}" alt="" loading="lazy"><span><strong>${esc(p.localName?p.localName+' · ':'')}${esc(p.label)}</strong><small>${esc(categoryNames[p.category]||'产品')} · ${p.hidden?'已下架':p.publishedAt?'已发布':p.isNew?'草稿 · 未上架':'现有官网页面'}</small></span></button>`).join('');
 $('product-cards').querySelectorAll('[data-product]').forEach(b=>b.onclick=()=>{$('product-select').value=b.dataset.product;$('product-select').onchange();});$('product-search').oninput();}
$('product-select').onchange=()=>{const value=$('product-select').value;if(dirty&&!confirm('当前修改未保存，确定切换并放弃修改？')){$('product-select').value=selectedSlug;return;}$('product-select').disabled=true;action($('workspace'),async()=>{try{await loadProduct(value);$('message').textContent='已载入产品。';}catch(e){$('product-select').value=selectedSlug;throw e;}finally{$('product-select').disabled=false;}});};
$('unpublish').onclick=()=>{if(dirty){$('message').textContent='请先保存草稿，再下架。';return;}if(!confirm('下架后官网详情页和产品列表将不再展示此产品。内容会保留，可重新发布。确定下架？'))return;action($('editor'),async()=>{const v=await api('unpublish',{slug:selectedSlug,revision});revision=v.revision;$('publication').textContent='已下架；保存后重新发布即可上架。';await loadProducts();$('unpublish').disabled=true;$('delete-product').disabled=false;$('message').textContent='已下架，内容已保留。';});};
$('delete-product').onclick=()=>{if(dirty){$('message').textContent='请先保存或放弃未保存的修改，再删除记录。';return;}if(!confirm(`永久删除“${product.title}”的产品记录？删除后将从后台列表移除，且无法恢复。`))return;action($('workspace'),async()=>{await api('delete',{slug:selectedSlug,revision});dirty=false;selectedSlug='baiyun';$('product-search').value='';await loadProducts();await loadProduct();$('message').textContent='记录已永久删除，已从产品列表移除。';});};
$('product-search').oninput=()=>{const q=$('product-search').value.trim().toLowerCase();$('product-cards').querySelectorAll('[data-product]').forEach(b=>b.hidden=!b.textContent.toLowerCase().includes(q));};
$('new-product').onclick=()=>{if(dirty&&!confirm('当前修改未保存，请先取消并保存；继续创建不会保存当前修改。继续？'))return;$('create-message').textContent='';$('create-dialog').showModal();};
$('cancel-create').onclick=()=>$('create-dialog').close();
$('create-form').onsubmit=e=>{e.preventDefault();const buttons=[...e.target.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);$('create-message').textContent='正在创建…';api('create',{baseSlug:$('create-template').value,title:$('create-title').value,slug:$('create-slug').value}).then(async v=>{await loadProducts();await loadProduct(v.slug);$('create-dialog').close();e.target.reset();$('message').textContent='产品草稿已创建。请替换模板内容、保存并预览，再发布。';}).catch(err=>{$('create-message').textContent=err.message;}).finally(()=>buttons.forEach(b=>b.disabled=false));};
api('me').then(showUser).catch(()=>{});

async function uploadImage(input){
 const file=input.files[0];if(!file)return;const uploadProduct=product;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024){$('message').textContent='请选择 20 MB 以内的 JPG、PNG 或 WebP 图片。';input.value='';return;}
 const workspace=$('workspace'),wasInert=Boolean(workspace.inert);workspace.inert=true;
 input.disabled=true;$('message').textContent='正在压缩并上传图片…';
 try{
  const bitmap=await createImageBitmap(file);const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  let blob;for(const quality of [.85,.7,.5]){blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));if(blob&&blob.size<=512*1024)break;}
  if(!blob||blob.type!=='image/webp'||blob.size>512*1024)throw new Error('图片压缩失败，请选择较小的图片或填写图片地址。');
  const r=await fetch('/api/team/upload',{method:'POST',headers:{'Content-Type':'image/webp'},body:blob});const v=await r.json();if(!r.ok)throw new Error(v.error||'上传失败');
  if(product!==uploadProduct)throw new Error('当前产品已切换，本次上传未应用。请在目标产品重新选择图片。');
  const p=JSON.parse(input.dataset.upload),key=p.pop();at(p)[key]=v.url;dirty=true;draw();$('message').textContent='图片已上传。请保存草稿并预览，发布后才会更换官网图片。';
 }catch(e){$('message').textContent=e.message;}finally{workspace.inert=wasInert;input.disabled=false;input.value='';}
}

async function uploadVideo(input){
 const file=input.files[0];if(!file)return;
 if(!/\.mp4$/i.test(file.name)||!['','video/mp4'].includes(file.type)||!file.size||file.size>99000000){$('message').textContent='请选择 99 MB 以内的 MP4 视频。';input.value='';return;}
 const uploadProduct=product,workspace=$('workspace'),wasInert=Boolean(workspace.inert);workspace.inert=true;
 $('message').textContent='正在准备视频上传…';
 try{
  const auth=await api('video-auth',{}),form=new FormData();form.append('file',file);form.append('token',auth.token);
  for(const [key,value]of Object.entries(auth.parameters))form.append(key,value);
  const result=await new Promise((resolve,reject)=>{
   const xhr=new XMLHttpRequest();xhr.open('POST','/api/team/video-upload');xhr.timeout=600000;
   xhr.upload.onprogress=e=>{if(e.lengthComputable)$('message').textContent='正在上传视频：'+Math.round(e.loaded/e.total*100)+'%（传输完成后仍需等待处理）';};
   xhr.onerror=()=>reject(new Error('电脑与官网的上传连接中断，结果未确认。当前修改已保留，请将此提示反馈给管理员，暂勿重复上传。'));
   xhr.ontimeout=()=>reject(new Error('视频上传等待超过 10 分钟，结果未确认。当前修改已保留，请将此提示反馈给管理员，暂勿重复上传。'));
   xhr.onload=()=>{let v;try{v=JSON.parse(xhr.responseText);}catch{v={};}
    if(xhr.status===401){requireLogin();reject(new Error('登录状态已失效，请在上方重新登录后上传。当前修改已保留。'));return;}
    if(xhr.status<200||xhr.status>=300){reject(new Error(v.error||(xhr.status===413?'视频过大，请选择 99 MB 以内的 MP4。':`视频上传失败（HTTP ${xhr.status}），请将此提示反馈给管理员。`)));return;}
    if(!v.url){reject(new Error('未能确认视频上传结果。当前修改已保留，请反馈给管理员，暂勿重复上传。'));return;}
    resolve(v);
   };xhr.send(form);
  });
  if(typeof result.url!=='string'||!result.url.startsWith('https://ik.imagekit.io/negxem1l9/')||/[<>"'\s\\]/.test(result.url))throw new Error('视频已上传，但返回地址异常，请到 ImageKit 素材库核对。');
  if(product!==uploadProduct)throw new Error('当前产品已切换，视频未应用。请从 ImageKit 素材库复制链接到目标产品。');
  const path=JSON.parse(input.dataset.videoUpload),key=path.pop();at(path)[key]=result.url;dirty=true;draw();
  $('message').textContent='视频已上传。请保存草稿并预览，发布后才会更新官网。';
 }catch(error){$('message').textContent=error.message;}finally{workspace.inert=wasInert;input.value='';}
}

async function loadNotifications(){
 try{const v=await api('inquiry-notifications');$('notification-list').innerHTML=v.notifications.map(n=>`<article><strong>${esc(n.reference)}</strong> · ${esc(new Date(n.createdAt).toLocaleString('zh-CN'))}<div>${esc(n.name)} · ${esc(n.email)}</div><pre style="white-space:pre-wrap">${esc(n.summary)}</pre><button type="button" data-retry-notification="${esc(n.reference)}">${n.status==='sending'?'核对或重试通知':'重试邮件通知'}</button></article>`).join('')||'<p>目前没有待处理通知。</p>';
 $('notification-list').querySelectorAll('[data-retry-notification]').forEach(b=>b.onclick=()=>action($('inquiry-notifications'),async()=>{const v=await api('inquiry-notifications',{reference:b.dataset.retryNotification});$('notification-status').textContent=v.emailSent?'邮件服务已接受通知，请核对收件箱。':'通知尚未确认，请稍后再试；询盘记录仍保留。';await loadNotifications();}));
 }catch(e){$('notification-status').textContent=e.message;}
}
$('refresh-notifications').onclick=()=>action($('inquiry-notifications'),loadNotifications);
