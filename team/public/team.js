const $=id=>document.getElementById(id);let challenge;
function requireLogin(){
 $('send').hidden=false;$('verify').hidden=true;$('code').value='';challenge=null;
 $('session-title').textContent='登录状态已失效';
 $('email').value=$('identity').textContent;
 $('send').scrollIntoView({block:'center',behavior:'smooth'});
}
async function api(action,body){const r=await fetch('/api/team/'+action,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const v=await r.json();if(!r.ok){
 if(r.status===401&&!['me','verify','request-code'].includes(action)){
  requireLogin();throw new Error('登录状态已失效，请在上方重新获取验证码。当前未保存的修改仍保留在本页面，重新登录后可继续保存，请勿刷新。');
 }
 throw new Error(v.error||'操作失败，请稍后再试。');
}return v;}
async function showUser(user){
 $('send').hidden=true;$('verify').hidden=true;$('workspace').hidden=false;$('identity').textContent=user.email;
 $('session-title').textContent='登录成功';document.querySelector('main').classList.add('editing');
 if(product&&dirty){$('message').textContent='已重新登录，未保存的修改已保留。请点击保存草稿。';}
 else{$('message').textContent='';await loadProducts();await loadProduct();}
 if(user.role==='admin'){$('members').hidden=false;await loadMembers();}else{$('members').hidden=true;}
}
async function action(form,fn){const buttons=[...form.querySelectorAll('button')],disabled=buttons.map(b=>b.disabled);buttons.forEach(b=>b.disabled=true);$('message').textContent='正在处理…';try{await fn();}catch(e){$('message').textContent=e.message;}finally{buttons.forEach((b,i)=>b.disabled=disabled[i]);}}
$('send').onsubmit=e=>{e.preventDefault();action(e.target,async()=>{const v=await api('request-code',{email:$('email').value});challenge=v.challenge;$('send').hidden=true;$('verify').hidden=false;$('message').textContent='验证码邮件已提交发送，请检查收件箱和垃圾邮件。10 分钟内有效。';$('code').focus();});};
$('verify').onsubmit=e=>{e.preventDefault();action(e.target,async()=>showUser(await api('verify',{challenge,code:$('code').value})));};
$('back').onclick=()=>{challenge=null;$('code').value='';$('verify').hidden=true;$('send').hidden=false;$('message').textContent='';};
$('logout').onclick=()=>action($('workspace'),async()=>{await api('logout',{});location.reload();});

let product,revision,dirty=false,selectedSlug='baiyun',fieldSpecs=[],activeTab='basic',existingVideos=[];
const labels={values:'页面内容（按页面顺序）',title:'英文名称 / 标题',localTitle:'中文名称',description:'英文介绍',year:'年份',days:'天数',route:'路线（每行一个地点）',image:'主图',src:'素材路径或 HTTPS 地址',alt:'图片说明',credit:'素材来源说明',film:'视频',poster:'视频封面图片',price:'价格',status:'展示方式',currency:'币种',amount:'金额',highlights:'产品亮点',editions:'路线版本',supplement:'附加费用',option:'费用选项说明',unit:'计价单位',source:'费用来源',itinerary:'行程',planningNote:'预订说明',accessNote:'出行限制说明',sources:'参考资料（每行一条）'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function fields(value,path=[]){return Object.entries(value).filter(([k])=>k!=='slug').map(([k,v])=>{
 const p=[...path,k],key=esc(JSON.stringify(p)),label=fieldSpecs.find(f=>f.key===k)?.label||labels[k]||k;
 if(Array.isArray(v)){
  if(k==='route'||k==='sources')return `<label>${esc(label)}<textarea data-path="${key}" data-type="lines" rows="4">${esc(v.join('\n'))}</textarea></label>`;
  return `<fieldset><legend>${esc(label)}</legend>${v.map((x,i)=>`<fieldset><legend>第 ${i+1} 项</legend>${fields(x,[...p,i])}<button type="button" data-remove="${esc(JSON.stringify([...p,i]))}">删除此项</button></fieldset>`).join('')}<button type="button" data-add="${key}">添加一项</button></fieldset>`;
 }
 if(v&&typeof v==='object')return `<fieldset><legend>${esc(label)}</legend>${fields(v,p)}</fieldset>`;
 if(k==='status'&&path[0]==='price')return `<label>${esc(label)}<select data-path="${key}"><option value="on-request" ${v==='on-request'?'selected':''}>询价 · Price on request</option><option value="from" ${v==='from'?'selected':''}>每人起价 · From</option></select></label>`;
 const isImage=(path[0]==='image'&&k==='src')||(path[0]==='film'&&k==='poster')||fieldSpecs.find(f=>f.key===k)?.type==='image';
 if(isImage)return `<article class="media-card"><div class="media-frame"><img src="${esc(v)}" alt="${esc(label)}" loading="lazy"></div><div class="media-copy"><strong>${esc(label)}</strong><label class="upload-button">选择或更换图片<input type="file" accept="image/jpeg,image/png,image/webp" data-upload="${key}"></label><small>支持 JPG、PNG、WebP，自动压缩</small><details><summary>使用已有图片链接</summary><textarea data-path="${key}">${esc(v)}</textarea></details></div></article>`;
 if(path[0]==='film'&&k==='src')return `<article class="media-card"><video controls preload="metadata" src="${esc(v)}"></video><div class="media-copy"><strong>产品视频</strong><p>视频文件上传需先启用存储。目前可以使用已有视频链接。</p><details><summary>修改视频链接</summary><textarea data-path="${key}">${esc(v)}</textarea></details></div></article>`;
 return `<label>${esc(label)}${typeof v==='number'?`<input type="number" step="any" data-path="${key}" data-type="number" value="${esc(v)}">`:`<textarea data-path="${key}" rows="${['description','planningNote','accessNote'].includes(k)?4:2}">${esc(v)}</textarea>`}</label>${(path[0]==='image'&&k==='src')||(path[0]==='film'&&k==='poster')||fieldSpecs.find(f=>f.key===k)?.type==='image'?`<label>从电脑上传图片<input type="file" accept="image/jpeg,image/png,image/webp" data-upload="${key}"></label>`:''}`;
 }).join('');}
function at(path){return path.reduce((x,k)=>x[k],product);}
function draw(){
 if(product.price&&!product.price.currency)product.price.currency='CNY';
 if(product.price&&product.price.amount===undefined)product.price.amount=0;
 const groups={basic:[],media:[],content:[],price:[]};
 if(product.values){
  groups.basic.push(fields({title:product.title}));
  const media={},text={};for(const [key,value]of Object.entries(product.values))(fieldSpecs.find(f=>f.key===key)?.type==='image'?media:text)[key]=value;
  groups.media.push(fields(media,['values']));groups.media.push(existingVideos.map(url=>`<article class="media-card"><video controls preload="none" src="${esc(url)}"></video><div class="media-copy"><strong>现有产品视频</strong><p>可播放预览，视频文件上传稍后接入。</p></div></article>`).join(''));groups.content.push(fields(text,['values']));
 }else{
  for(const [key,value]of Object.entries(product)){if(key==='slug')continue;const group=['image','film'].includes(key)?'media':key==='price'?'price':['title','localTitle','description','year','days','route'].includes(key)?'basic':'content';groups[group].push(fields({[key]:value}));}
 }
 const names={basic:'基本信息',media:'图片与视频',content:'行程与文字',price:'价格'};
 const available=Object.keys(groups).filter(k=>groups[k].join('').length);if(!available.includes(activeTab))activeTab=available[0];
 $('editor-tabs').innerHTML=available.map(k=>`<button type="button" data-tab="${k}" aria-pressed="${k===activeTab}">${names[k]}</button>`).join('');
 $('fields').innerHTML=available.map(k=>`<section class="editor-panel" data-panel="${k}" ${k===activeTab?'':'hidden'}>${groups[k].join('')}</section>`).join('');
 $('editor-tabs').querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{activeTab=b.dataset.tab;$('fields').querySelectorAll('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==activeTab);$('editor-tabs').querySelectorAll('[data-tab]').forEach(t=>t.setAttribute('aria-pressed',String(t.dataset.tab===activeTab)));});
 $('fields').querySelectorAll('[data-path]').forEach(input=>{input.oninput=()=>{const p=JSON.parse(input.dataset.path),key=p.pop();at(p)[key]=input.dataset.type==='number'?Number(input.value):input.dataset.type==='lines'?input.value.split('\n').filter(s=>s.trim()):input.value;dirty=true;};input.onchange=input.oninput;});
 $('fields').querySelectorAll('[data-upload]').forEach(input=>input.onchange=()=>uploadImage(input));
 $('fields').querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{if(!confirm('删除这条内容？保存并发布后才影响官网。'))return;const p=JSON.parse(b.dataset.remove),i=p.pop();at(p).splice(i,1);dirty=true;draw();});
 $('fields').querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{const a=at(JSON.parse(b.dataset.add));a.push({title:'',description:''});dirty=true;draw();});
}
async function loadProduct(slug=selectedSlug){const v=await api('product?slug='+encodeURIComponent(slug));selectedSlug=slug;product=v.product;fieldSpecs=v.fields||[];existingVideos=v.videos||[];revision=v.revision;dirty=false;draw();$('preview').href='/api/team/preview?slug='+encodeURIComponent(selectedSlug);$('publish').disabled=!v.canPublish;document.querySelectorAll('[data-product]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.product===selectedSlug)));$('publication').textContent=v.publishedAt?'最近发布：'+new Date(v.publishedAt).toLocaleString('zh-CN'):'尚未通过后台发布，官网仍使用原内容。';}
$('editor').onsubmit=e=>{e.preventDefault();action(e.target,async()=>{const v=await api('save',{product,revision});revision=v.revision;dirty=false;$('message').textContent='草稿已保存。请预览，确认后再发布。';});};
$('preview').onclick=e=>{if(dirty){e.preventDefault();$('message').textContent='请先保存草稿，再打开预览。';}};
$('publish').onclick=()=>{if(dirty){$('message').textContent='请先保存草稿并预览。';return;}if(!confirm('确认将当前所选产品的已保存草稿发布到正式官网？'))return;action($('editor'),async()=>{const v=await api('publish',{revision,slug:selectedSlug});revision=v.revision;$('publication').textContent='最近发布：'+new Date(v.published_at).toLocaleString('zh-CN');$('message').textContent='已发布。可打开官网详情页核对。';});};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});

async function loadMembers(){const v=await api('members');$('member-list').innerHTML=v.members.map(m=>`<p>${esc(m.email)} · ${m.active?'已授权':'已停用'} <button type="button" data-member="${esc(m.email)}" data-active="${m.active?'0':'1'}">${m.active?'停用':'恢复'}</button></p>`).join('')||'<p>尚未添加同事。</p>';$('member-list').querySelectorAll('[data-member]').forEach(b=>b.onclick=()=>{if(!confirm(b.dataset.active==='0'?'停用后该同事将无法继续访问后台，确定？':'恢复该同事的编辑权限？'))return;action($('members'),async()=>{await api('members',{email:b.dataset.member,active:b.dataset.active==='1'});await loadMembers();$('message').textContent='成员权限已更新。';});});}
$('member-form').onsubmit=e=>{e.preventDefault();action(e.target,async()=>{await api('members',{email:$('member-email').value,active:true});$('member-email').value='';await loadMembers();$('message').textContent='已授权。同事可使用自己的邮箱验证码登录；可以编辑、预览并自行发布。';});};
async function loadProducts(){const v=await api('products');$('product-select').innerHTML=v.products.map(p=>`<option value="${esc(p.slug)}">${esc(p.label)}</option>`).join('');$('product-select').value=selectedSlug;
 $('product-cards').innerHTML=v.products.map(p=>`<button type="button" class="product-card" data-product="${esc(p.slug)}" aria-pressed="${p.slug===selectedSlug}"><img src="${esc(p.image||'')}" alt="" loading="lazy"><span><strong>${esc(p.label)}</strong><small>${p.publishedAt?'已发布':'尚未通过后台发布'}</small></span></button>`).join('');
 $('product-cards').querySelectorAll('[data-product]').forEach(b=>b.onclick=()=>{$('product-select').value=b.dataset.product;$('product-select').onchange();});}
$('product-select').onchange=()=>{const value=$('product-select').value;if(dirty&&!confirm('当前修改未保存，确定切换并放弃修改？')){$('product-select').value=selectedSlug;return;}$('product-select').disabled=true;action($('workspace'),async()=>{try{await loadProduct(value);$('message').textContent='已载入产品。';}catch(e){$('product-select').value=selectedSlug;throw e;}finally{$('product-select').disabled=false;}});};
api('me').then(showUser).catch(()=>{});

async function uploadImage(input){
 const file=input.files[0];if(!file)return;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024){$('message').textContent='请选择 20 MB 以内的 JPG、PNG 或 WebP 图片。';input.value='';return;}
 input.disabled=true;$('message').textContent='正在压缩并上传图片…';
 try{
  const bitmap=await createImageBitmap(file);const scale=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  let blob;for(const quality of [.85,.7,.5]){blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));if(blob&&blob.size<=512*1024)break;}
  if(!blob||blob.type!=='image/webp'||blob.size>512*1024)throw new Error('图片压缩失败，请选择较小的图片或填写图片地址。');
  const r=await fetch('/api/team/upload',{method:'POST',headers:{'Content-Type':'image/webp'},body:blob});const v=await r.json();if(!r.ok)throw new Error(v.error||'上传失败');
  const p=JSON.parse(input.dataset.upload),key=p.pop();at(p)[key]=v.url;dirty=true;draw();$('message').textContent='图片已上传。请保存草稿并预览，发布后才会更换官网图片。';
 }catch(e){$('message').textContent=e.message;}finally{input.disabled=false;input.value='';}
}
