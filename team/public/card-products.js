'use strict';
(()=>{
 const get=id=>document.getElementById(id);
 const element=(tag,text)=>Object.assign(document.createElement(tag),{textContent:text});
 const status=text=>{get('status').textContent=text;};
 let state,owners,products,dirty=false;
 const selected=new URLSearchParams(location.search).get('card');
 function updateActions(){
  get('save').disabled=!dirty;
  get('publish').disabled=dirty||!state.canPublish||!state.revision;
 }
 function createOwner(owner){
  const row=document.createElement('details');
  row.append(element('summary',`${owner.group} · ${owner.title}（${owner.ids.length}）`));
  const visits=element('a','预览已保存的关联产品 ↗');
  visits.href=owner.preview;visits.target='_blank';visits.rel='noopener';row.append(visits);
  const list=document.createElement('ul'),select=document.createElement('select'),add=element('button','＋ 添加产品');
  select.setAttribute('aria-label',`${owner.title} 可添加的产品`);row.append(list,select,add);
  function refresh(){
   row.firstChild.textContent=`${owner.group} · ${owner.title}（${owner.ids.length}）`;
   list.replaceChildren();
   for(const id of owner.ids){
    const item=element('li',state.tours[id]?.title||id),remove=element('button','－ 移出产品');
    remove.type='button';remove.onclick=()=>{owner.ids.splice(owner.ids.indexOf(id),1);changed();};item.append(' ',remove);list.append(item);
   }
   select.replaceChildren(...products.filter(product=>product.id!==owner.self&&!owner.ids.includes(product.id)).map(product=>new Option(`${product.group} · ${product.title}`,product.id)));
   add.disabled=!select.length;
  }
  function changed(){
   owner.set(owner.ids);dirty=true;status('有未保存的关联修改。');updateActions();refresh();
  }
  add.type='button';add.onclick=()=>{if(select.value&&!owner.ids.includes(select.value)){owner.ids.push(select.value);changed();}};
  row.addEventListener('toggle',()=>{if(row.open)refresh();});
  row.open=owner.key===selected;return row;
 }
 function draw(){
  const query=get('search').value.trim().toLowerCase();
  get('cards').replaceChildren(...owners.filter(owner=>(owner.group+' '+owner.title).toLowerCase().includes(query)).map(createOwner));
 }
 function load(data){
  state=data;products=Object.values(data.tours);owners=[];
  const layout=data.layout;
  for(const [key,group,section] of [['destinations','目的地指南','destinations'],['styles','旅行主题','travel-styles'],['collections','精选系列','signature-journeys']]){
   for(const item of layout[key]){
    const url=`/private-china-tours/${section}/`;
    owners.push({key:`${key}:${item.id}`,group,title:item.title,ids:item.tours,set:ids=>{item.tours=ids;},preview:key==='collections'?`${url}?layout-preview=1&collection=${item.id}#journeys`:`${url}${item.id}/?layout-preview=1`});
   }
  }
  layout.cardProducts??={};
  for(const product of products){
   owners.push({key:product.id,self:product.id,group:product.group,title:product.title,ids:layout.cardProducts[product.id]||[],set:ids=>{if(ids.length)layout.cardProducts[product.id]=ids;else delete layout.cardProducts[product.id];},preview:`${product.href}?card-preview=1`});
  }
  if(selected){const owner=owners.find(item=>item.key===selected);if(owner)get('search').value=owner.title;}
  draw();updateActions();get('workspace').hidden=false;status('选择卡片，添加或移出其关联产品。');
 }
 async function write(action){
  if(action==='publish'&&!confirm('将已保存的全站卡片关联和 Private Tours 布局发布到官网？'))return;
  const workspace=get('workspace');workspace.inert=true;
  try{
   const payload={action,revision:state.revision};if(action==='save')payload.layout=state.layout;
   const response=await fetch('/api/team/private-layout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
   const result=await response.json();if(!response.ok)throw Error(result.error);
   state.revision=result.revision;dirty=false;status(action==='save'?'草稿已保存，可打开卡片预览。':'关联产品已发布。');updateActions();
  }catch(error){status(error.message);}finally{workspace.inert=false;}
 }
 get('save').onclick=()=>write('save');get('publish').onclick=()=>write('publish');get('search').oninput=draw;
 window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
 fetch('/api/team/private-layout').then(async response=>{const data=await response.json();if(!response.ok)throw Error(data.error||'请登录内容工作台。');load(data);}).catch(error=>status(error.message));
})();
