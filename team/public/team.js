const $=id=>document.getElementById(id);let challenge;
async function api(action,body){const r=await fetch('/api/team/'+action,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const v=await r.json();if(!r.ok)throw new Error(v.error||'操作失败，请稍后再试。');return v;}
async function showUser(user){$('send').hidden=true;$('verify').hidden=true;$('workspace').hidden=false;$('identity').textContent=user.email;$('message').textContent='';document.querySelector('main').classList.add('editing');await loadProduct();if(user.role==='admin'){$('members').hidden=false;await loadMembers();}}
async function action(form,fn){const buttons=[...form.querySelectorAll('button')],disabled=buttons.map(b=>b.disabled);buttons.forEach(b=>b.disabled=true);$('message').textContent='正在处理…';try{await fn();}catch(e){$('message').textContent=e.message;}finally{buttons.forEach((b,i)=>b.disabled=disabled[i]);}}
$('send').onsubmit=e=>{e.preventDefault();action(e.target,async()=>{const v=await api('request-code',{email:$('email').value});challenge=v.challenge;$('send').hidden=true;$('verify').hidden=false;$('message').textContent='验证码邮件已提交发送，请检查收件箱和垃圾邮件。10 分钟内有效。';$('code').focus();});};
$('verify').onsubmit=e=>{e.preventDefault();action(e.target,async()=>showUser(await api('verify',{challenge,code:$('code').value})));};
$('back').onclick=()=>{challenge=null;$('code').value='';$('verify').hidden=true;$('send').hidden=false;$('message').textContent='';};
$('logout').onclick=()=>action($('workspace'),async()=>{await api('logout',{});location.reload();});

let product,revision,dirty=false;
const labels={title:'英文名称 / 标题',localTitle:'中文名称',description:'英文介绍',year:'年份',days:'天数',route:'路线（每行一个地点）',image:'主图',src:'素材路径或 HTTPS 地址',alt:'图片说明',credit:'素材来源说明',film:'视频',poster:'视频封面图片',price:'价格',status:'展示方式',currency:'币种',amount:'金额',highlights:'产品亮点',editions:'路线版本',supplement:'附加费用',option:'费用选项说明',unit:'计价单位',source:'费用来源',itinerary:'行程',planningNote:'预订说明',accessNote:'出行限制说明',sources:'参考资料（每行一条）'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function fields(value,path=[]){return Object.entries(value).filter(([k])=>k!=='slug').map(([k,v])=>{
 const p=[...path,k],key=esc(JSON.stringify(p)),label=labels[k]||k;
 if(Array.isArray(v)){
  if(k==='route'||k==='sources')return `<label>${esc(label)}<textarea data-path="${key}" data-type="lines" rows="4">${esc(v.join('\n'))}</textarea></label>`;
  return `<fieldset><legend>${esc(label)}</legend>${v.map((x,i)=>`<fieldset><legend>第 ${i+1} 项</legend>${fields(x,[...p,i])}<button type="button" data-remove="${esc(JSON.stringify([...p,i]))}">删除此项</button></fieldset>`).join('')}<button type="button" data-add="${key}">添加一项</button></fieldset>`;
 }
 if(v&&typeof v==='object')return `<fieldset><legend>${esc(label)}</legend>${fields(v,p)}</fieldset>`;
 if(k==='status'&&path[0]==='price')return `<label>${esc(label)}<select data-path="${key}"><option value="on-request" ${v==='on-request'?'selected':''}>询价 · Price on request</option><option value="from" ${v==='from'?'selected':''}>每人起价 · From</option></select></label>`;
 return `<label>${esc(label)}${typeof v==='number'?`<input type="number" step="any" data-path="${key}" data-type="number" value="${esc(v)}">`:`<textarea data-path="${key}" rows="${['description','planningNote','accessNote'].includes(k)?4:2}">${esc(v)}</textarea>`}</label>${(path[0]==='image'&&k==='src')||(path[0]==='film'&&k==='poster')?`<label>从电脑上传图片<input type="file" accept="image/jpeg,image/png,image/webp" data-upload="${key}"></label>`:''}`;
 }).join('');}
function at(path){return path.reduce((x,k)=>x[k],product);}
function draw(){
 if(!product.price.currency)product.price.currency='CNY';
 if(product.price.amount===undefined)product.price.amount=0;
 $('fields').innerHTML=fields(product);
 $('fields').querySelectorAll('[data-path]').forEach(input=>input.oninput=()=>{const p=JSON.parse(input.dataset.path),key=p.pop();at(p)[key]=input.dataset.type==='number'?Number(input.value):input.dataset.type==='lines'?input.value.split('\n').filter(s=>s.trim()):input.value;dirty=true;});
 $('fields').querySelectorAll('[data-upload]').forEach(input=>input.onchange=()=>uploadImage(input));
 $('fields').querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{if(!confirm('删除这条内容？保存并发布后才影响官网。'))return;const p=JSON.parse(b.dataset.remove),i=p.pop();at(p).splice(i,1);dirty=true;draw();});
 $('fields').querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{const a=at(JSON.parse(b.dataset.add));a.push({title:'',description:''});dirty=true;draw();});
}
async function loadProduct(){const v=await api('product');product=v.product;revision=v.revision;dirty=false;draw();$('publish').disabled=!v.canPublish;$('publication').textContent=v.publishedAt?'最近发布：'+new Date(v.publishedAt).toLocaleString('zh-CN'):'尚未通过后台发布，官网仍使用原内容。';}
$('editor').onsubmit=e=>{e.preventDefault();action(e.target,async()=>{const v=await api('save',{product,revision});revision=v.revision;dirty=false;$('message').textContent='草稿已保存。请预览，确认后再发布。';});};
$('preview').onclick=e=>{if(dirty){e.preventDefault();$('message').textContent='请先保存草稿，再打开预览。';}};
$('publish').onclick=()=>{if(dirty){$('message').textContent='请先保存草稿并预览。';return;}if(!confirm('确认将当前已保存的 Baiyun 草稿发布到正式官网？'))return;action($('editor'),async()=>{const v=await api('publish',{revision});revision=v.revision;$('publication').textContent='最近发布：'+new Date(v.published_at).toLocaleString('zh-CN');$('message').textContent='已发布。可打开官网详情页核对。';});};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});

async function loadMembers(){const v=await api('members');$('member-list').innerHTML=v.members.map(m=>`<p>${esc(m.email)} · ${m.active?'已授权':'已停用'} <button type="button" data-member="${esc(m.email)}" data-active="${m.active?'0':'1'}">${m.active?'停用':'恢复'}</button></p>`).join('')||'<p>尚未添加同事。</p>';$('member-list').querySelectorAll('[data-member]').forEach(b=>b.onclick=()=>{if(!confirm(b.dataset.active==='0'?'停用后该同事将无法继续访问后台，确定？':'恢复该同事的编辑权限？'))return;action($('members'),async()=>{await api('members',{email:b.dataset.member,active:b.dataset.active==='1'});await loadMembers();$('message').textContent='成员权限已更新。';});});}
$('member-form').onsubmit=e=>{e.preventDefault();action(e.target,async()=>{await api('members',{email:$('member-email').value,active:true});$('member-email').value='';await loadMembers();$('message').textContent='已授权。同事可使用自己的邮箱验证码登录；仅可编辑草稿，不能发布。';});};
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
