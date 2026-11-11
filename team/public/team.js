const $=id=>document.getElementById(id);let challenge;
async function api(action,body){const r=await fetch('/api/team/'+action,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const v=await r.json();if(!r.ok)throw new Error(v.error||'操作失败，请稍后再试。');return v;}
async function showUser(user){$('send').hidden=true;$('verify').hidden=true;$('workspace').hidden=false;$('identity').textContent=user.email;$('message').textContent='';document.querySelector('main').classList.add('editing');await loadProduct();}
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
 return `<label>${esc(label)}${typeof v==='number'?`<input type="number" step="any" data-path="${key}" data-type="number" value="${esc(v)}">`:`<textarea data-path="${key}" rows="${['description','planningNote','accessNote'].includes(k)?4:2}">${esc(v)}</textarea>`}</label>`;
 }).join('');}
function at(path){return path.reduce((x,k)=>x[k],product);}
function draw(){
 if(!product.price.currency)product.price.currency='CNY';
 if(product.price.amount===undefined)product.price.amount=0;
 $('fields').innerHTML=fields(product);
 $('fields').querySelectorAll('[data-path]').forEach(input=>input.oninput=()=>{const p=JSON.parse(input.dataset.path),key=p.pop();at(p)[key]=input.dataset.type==='number'?Number(input.value):input.dataset.type==='lines'?input.value.split('\n').filter(s=>s.trim()):input.value;dirty=true;});
 $('fields').querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{if(!confirm('删除这条内容？保存并发布后才影响官网。'))return;const p=JSON.parse(b.dataset.remove),i=p.pop();at(p).splice(i,1);dirty=true;draw();});
 $('fields').querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{const a=at(JSON.parse(b.dataset.add));a.push({title:'',description:''});dirty=true;draw();});
}
async function loadProduct(){const v=await api('product');product=v.product;revision=v.revision;dirty=false;draw();$('publish').disabled=!v.canPublish;$('publication').textContent=v.publishedAt?'最近发布：'+new Date(v.publishedAt).toLocaleString('zh-CN'):'尚未通过后台发布，官网仍使用原内容。';}
$('editor').onsubmit=e=>{e.preventDefault();action(e.target,async()=>{const v=await api('save',{product,revision});revision=v.revision;dirty=false;$('message').textContent='草稿已保存。请预览，确认后再发布。';});};
$('preview').onclick=e=>{if(dirty){e.preventDefault();$('message').textContent='请先保存草稿，再打开预览。';}};
$('publish').onclick=()=>{if(dirty){$('message').textContent='请先保存草稿并预览。';return;}if(!confirm('确认将当前已保存的 Baiyun 草稿发布到正式官网？'))return;action($('editor'),async()=>{const v=await api('publish',{revision});revision=v.revision;$('publication').textContent='最近发布：'+new Date(v.published_at).toLocaleString('zh-CN');$('message').textContent='已发布。可打开官网详情页核对。';});};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});

api('me').then(showUser).catch(()=>{});
