'use strict';
(()=>{
 const byId=id=>document.getElementById(id),panel=byId('panel'),status=byId('status');
 let data,layout,dirty=false,busy=false;
 const selected={};
 const node=(tag,value)=>{const el=document.createElement(tag);if(value!==undefined)el.textContent=value;return el;};
 function changed(){dirty=true;status.textContent='有未保存的修改。';byId('publish').disabled=true;}
 function redraw(){changed();draw();}
 function button(title,callback,disabled=false){const el=node('button',title);el.type='button';el.disabled=disabled;el.onclick=callback;return el;}
 function select(options,current,label){const el=node('select');el.setAttribute('aria-label',label);for(const [id,title] of options)el.add(new Option(title,id));if(current!==undefined)el.value=current;return el;}
 function field(parent,item,key,label,long=false){const wrap=node('label',label),el=node(long?'textarea':'input');el.value=item[key]||'';el.oninput=()=>{item[key]=el.value;changed();};wrap.append(el);parent.append(wrap);}
 function box(title){const el=node('section');el.append(node('h2',title));panel.append(el);return el;}
 function photoField(parent,title,src,set){
  const row=node('fieldset'),preview=node('img'),label=node('label','选择或更换图片'),upload=node('input'),link=node('label','或填写图片地址'),url=node('input');
  preview.alt='';preview.width=160;upload.type='file';upload.accept='image/jpeg,image/png,image/webp';url.value=src;
  function refresh(){const allowed=/^(?:\/(?:assets|media)\/|https:\/\/)/.test(url.value);preview.hidden=!allowed;if(allowed)preview.src=url.value;else preview.removeAttribute('src');}
  refresh();url.oninput=()=>{set(url.value.trim());changed();};url.onchange=refresh;
  upload.onchange=async()=>{const file=upload.files[0];if(!file||busy)return;busy=true;byId('tools').inert=true;status.textContent='正在压缩并上传图片…';try{const {uploadPhoto}=await import('./photo-upload.js');set(await uploadPhoto(file));redraw();status.textContent='图片已上传，请保存布局草稿。';}catch(error){status.textContent=error.message;}finally{busy=false;byId('tools').inert=false;upload.value='';}};
  label.append(upload);link.append(url);row.append(node('legend',title),preview,label,link);parent.append(row);return row;
 }
 function galleryEditor(edit,item){
  const photos=[item.image,...(item.extraPhotos||[])];
  const sync=()=>{item.image=photos[0]||'';item.extraPhotos=photos.slice(1);};
  edit.append(node('p','详情图库最多 10 张。第一张同时作为列表封面；只有一张时不显示翻页按钮。'));
  photos.forEach((src,index)=>{const row=photoField(edit,`第 ${index+1} 张${index?'':' · 封面'}`,src,value=>{photos[index]=value;sync();});
   const move=step=>{[photos[index],photos[index+step]]=[photos[index+step],photos[index]];sync();redraw();};
   row.append(button('上移',()=>move(-1),!index),button('下移',()=>move(1),index===photos.length-1),button('删除图片',()=>{photos.splice(index,1);sync();redraw();}));
  });
  edit.append(button('添加图片',()=>{if(photos.some(src=>!src)){status.textContent='请先给空白位置选择图片，或删除空白位置。';return;}photos.push('');sync();redraw();},photos.length>=10));
 }
 function ordered(parent,title,ids,choices,groups=[[title,ids]],visibleCount,shared=false){
  const names=new Map(choices),details=node('div');details.append(node('p',`共 ${ids.length} 张 · 按官网展示顺序排列`));parent.append(details);
  ids.forEach((id,index)=>{if(visibleCount&&(!index||index===visibleCount))details.append(node('h3',index?'Show More · 展开后显示':'默认显示'));const line=node('div');line.className='card-row';const move=node('details');move.className='move-box';move.append(node('summary','移动到…'));
   const current=groups.findIndex(group=>group[1]===ids),target=select(groups.map(([label],number)=>[number,label]),current,'目标板块'),position=node('select');position.setAttribute('aria-label','目标位置');
   const positions=()=>{const list=groups[target.value][1];position.replaceChildren(...Array.from({length:list.length+(list.includes(id)?0:1)},(_,number)=>new Option(`第 ${number+1} 位`,number)));position.value=list===ids?index:0;};target.onchange=positions;positions();
   for(const [caption,control] of [['目标板块',target],['目标位置',position]]){const label=node('label',caption);label.append(control);move.append(label);}
   move.append(button('确认移动',()=>{const [label,list]=groups[target.value],slot=Number(position.value);ids.splice(index,1);const existing=list.indexOf(id);if(existing>=0)list.splice(existing,1);list.splice(slot,0,id);redraw();status.textContent=`已移到「${label}」第 ${slot+1} 位，尚未保存。`;}));
   line.append(node('strong',`${index+1}. ${names.get(id)||id}`),move,button('上移',()=>{[ids[index-1],ids[index]]=[ids[index],ids[index-1]];redraw();},!index),button('下移',()=>{[ids[index+1],ids[index]]=[ids[index],ids[index+1]];redraw();},index===ids.length-1),button('从本板块移出',()=>{ids.splice(index,1);redraw();}));details.append(line);});
  const available=choices.filter(([id])=>!ids.includes(id));if(!available.length)return;
  const picker=select(available,undefined,title+'待添加卡片'),row=node('div'),label=node('label','添加已有卡片');row.className='add-row';label.append(picker);row.append(label,button('加入此组',()=>{if(!shared)for(const [,group] of groups){const old=group.indexOf(picker.value);if(old>=0)group.splice(old,1);}ids.push(picker.value);redraw();}));details.append(row);
 }
 function draw(){
  panel.replaceChildren();const area=byId('area').value,dest=area==='destinations',style=area==='travel-styles',key=dest?'destinations':style?'styles':'collections',items=layout[key];
  const tours=Object.values(data.tours).map(item=>[item.id,`${item.group} · ${item.localName?item.localName+' · ':''}${item.title}`]),choices=items.map(item=>[item.id,item.title]);
  const pages=[['@overview','总览页'],...choices,['@new','＋ 新建资料']],page=selected[key]||'@overview';byId('page').replaceChildren(...pages.map(([id,label])=>new Option(label,id)));byId('page').value=page;
  const names={popular:'热门目的地（默认展示前 6 张）',deep:'深度目的地（默认展示前 3 张）',other:'仅在按地区探索展示',themes:'主题卡片（官网展示前 6 张）',series:'系列卡片',tags:'行程筛选标签',info:'封面与介绍',experiences:'代表性体验',tours:'关联行程',create:'新建资料'};
  names.copy='总览标题与文案';names.hero='详情首屏与按钮';
  Object.assign(names,{schedule:'路线与每日行程',film:'视频栏目',ending:'页底规划邀请'});
  const sections=page==='@overview'?(dest?['popular','deep','other']:style?['themes']:['series','tags']):page==='@new'?['create']:dest?['info','experiences','tours']:['info','tours'];
  if(page==='@overview')sections.push('copy');else if(page!=='@new'&&(dest||style))sections.push('hero');
  if(page==='@overview'||page!=='@new'&&(dest||style)){if(page!=='@overview')sections.push('schedule');sections.push('film','ending');}
  const section=sections.includes(selected.section)?selected.section:sections[0];byId('section').replaceChildren(...sections.map(id=>new Option(names[id],id)));byId('section').value=section;
  const edit=box(names[section]),item=items.find(record=>record.id===page);
  if(section==='copy'){
   const labels={title:'页面标题',intro:'页面简介',popular:'热门目的地标题',deep:'深度目的地标题',region:'地区索引标题',themes:'主题栏标题',collections:'系列栏标题',journeys:'行程栏标题'};
   for(const key of Object.keys(layout.overviews[area]).filter(key=>key in labels))field(edit,layout.overviews[area],key,labels[key],key==='intro');
  }
  if(section==='hero'&&item){
   const group=dest?'Destinations':'Travel Styles';
   const current=item.hero??={};
   const defaults={eyebrow:'Private Tours / '+group,subtitle:dest?item.region:'Travel Style',back:'← All '+group.toLowerCase(),button:'Explore the story ↓',storyTitle:dest?'Why visit '+item.title+'?':'The Story'};
   const labels={eyebrow:'首屏小标题',subtitle:'副标题',back:'返回链接文字',button:'首屏按钮文字',storyTitle:'介绍板块标题'};
   for(const key of Object.keys(defaults)){const values={...defaults,...current};const label=node('label',labels[key]),input=node('input');input.value=values[key];input.maxLength=1000;input.oninput=()=>{current[key]=input.value;changed();};label.append(input);edit.append(label);}
  }
  if(['schedule','film','ending'].includes(section)){
   const owner=item||layout.overviews[area],copy=owner.editorial??={};
   const defaults={...data.pageDefaults,...(dest&&item?data.guidePlans?.[item.id]:{})};
   const labels={route:'路线站点（每行一站）',routeLabel:'路线小标题',routeNote:'路线备注',dayLabel:'每日行程小标题',dayTitle:'每日行程标题',days:'每日行程（Day 1 · 标题，下一行填写正文）',videoTitle:'视频标题',videoUrl:'视频地址（YouTube 或 MP4）',ctaLabel:'小标题',ctaTitle:'主标题',ctaBody:'说明',ctaButton:'询价按钮文字'};
   const keys=section==='schedule'?['routeLabel','route','routeNote','dayLabel','dayTitle','days']:section==='film'?['videoTitle','videoUrl']:['ctaLabel','ctaTitle','ctaBody','ctaButton'];
   for(const key of keys){
    const label=node('label',labels[key]),input=node(['days','route','ctaTitle','ctaBody'].includes(key)?'textarea':'input');
    input.value=copy[key]??defaults[key];if(key==='days')input.rows=15;
    input.oninput=()=>{copy[key]=input.value;changed();};label.append(input);edit.append(label);
   }
   if(section==='film'){
    const label=node('label','或上传 MP4（最多 99 MB）'),upload=node('input');upload.type='file';upload.accept='video/mp4,.mp4';label.append(upload);edit.append(label);
    upload.onchange=async()=>{const file=upload.files[0];if(!file||busy)return;if(file.size>99000000||!file.size||!/\.mp4$/i.test(file.name)){status.textContent='请选择 99 MB 以内的 MP4 文件。';return;}
     busy=true;byId('tools').inert=true;status.textContent='正在上传视频…';
     try{const auth=await fetch('/api/team/video-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});const data=await auth.json();if(!auth.ok)throw Error(data.error||'无法授权上传');
      const form=new FormData();form.append('file',file);form.append('token',data.token);for(const [key,value] of Object.entries(data.parameters))form.append(key,value);
      const result=await fetch('/api/team/video-upload',{method:'POST',body:form}),video=await result.json();if(!result.ok||!video.url)throw Error(video.error||'上传结果未确认');
      copy.videoUrl=video.url;redraw();status.textContent='视频已上传，请保存草稿并预览。';
     }catch(error){status.textContent=error.message;}finally{busy=false;byId('tools').inert=false;upload.value='';}};
   }
  }
  if(page==='@overview'&&!['tags','copy','film','ending'].includes(section)){
   const groups=dest?['popular','deep','other']:[section];
   if(section==='popular')edit.append(node('p','热门目的地只展示前 6 张，不设展开按钮。排在第 7 位及以后的卡片仍可在地区索引找到。'));
   if(section==='other')edit.append(node('p','地区索引也会自动收录热门和深度目的地。要修改所属地区，请选择该目的地 → 封面与介绍。'));
   ordered(edit,names[section],layout[section],choices,groups.map(id=>[names[id],layout[id]]),section==='deep'?3:undefined);
  }
  if(page==='@new'){
  edit.append(node('p','新建后，请在总览页的对应板块添加这张卡片。'));
  const title=node('input'),slug=node('input');title.placeholder='英文显示名称';slug.placeholder='网址名称，例如 local-crafts';title.setAttribute('aria-label',title.placeholder);slug.setAttribute('aria-label',slug.placeholder);
  edit.append(title,slug,button('新建资料',()=>{const id=slug.value.trim(),name=title.value.trim();if(!name||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)||items.some(item=>item.id===id)){status.textContent='请填写名称及未使用的小写英文网址。';return;}items.push({id,title:name,image:'',tours:[],...(dest||style?{intro:'',experiences:[]}:{}),...(dest?{region:data.regions[0],season:''}:{})});selected[key]=id;redraw();}));
  }
  if(item&&section==='info'){field(edit,item,'title','英文标题');if(dest||style){galleryEditor(edit,item);field(edit,item,'intro',dest?'Why Visit · 简介':'The Story · 主题故事',true);}else{photoField(edit,'系列封面（可留空）',item.image,value=>{item.image=value;});edit.append(node('p','单条精选行程的图库请在内容工作台选择该行程 → 图片与视频。'));}if(dest){const label=node('label','所属地区'),region=select(data.regions.map(region=>[region,region]),item.region,'所属地区');region.onchange=()=>{item.region=region.value;changed();};label.append(region);edit.append(label);field(edit,item,'season','Best Time to Visit',true);}}
  if(item&&section==='experiences'){
   edit.append(node('p',`Top Experiences · 当前 ${item.experiences.length} 张。不限制为三张；全部删除后，官网将隐藏此板块。`),button('＋ 添加体验卡',()=>{item.experiences.push({title:'',image:''});redraw();panel.querySelector('[data-experience]:last-child input')?.focus();}));
   item.experiences.forEach((exp,index,all)=>{const row=node('fieldset');row.dataset.experience='';row.append(node('legend',`体验卡 ${index+1}`));field(row,exp,'title','体验名称');const photo=photoField(row,'体验配图',exp.image,value=>{exp.image=value;});photo.append(button('移除配图',()=>{exp.image='';redraw();}));row.append(button('上移',()=>{[all[index-1],all[index]]=[all[index],all[index-1]];redraw();},!index),button('下移',()=>{[all[index+1],all[index]]=[all[index],all[index+1]];redraw();},index===all.length-1),button('删除此体验卡',()=>{all.splice(index,1);redraw();}));edit.append(row);});
  }
  if(item&&section==='tours'){
   edit.append(node('p','可以添加各类已上架产品。同一卡片可以推荐到多个页面；从本板块移出，不会下架产品。'));
   const groups=[['目的地',layout.destinations],['旅行主题',layout.styles],['精选系列',layout.collections]].flatMap(([group,records])=>records.map(record=>[`${group} · ${record.title}`,record.tours]));
   ordered(edit,'关联行程',item.tours,tours,groups,undefined,true);
  }
  if(section==='tags'&&tours.length){const filter=edit,pick=select(tours,selected.filter||tours[0][0],'选择行程');filter.append(pick);pick.onchange=()=>{selected.filter=pick.value;draw();};for(const [facet,values] of Object.entries(data.facets)){const group=node('fieldset');group.append(node('legend',({visit:'访华经历',length:'假期长度',interest:'旅行兴趣',season:'适合季节'})[facet]));for(const value of values){const label=node('label',value),input=node('input');input.type='checkbox';input.checked=layout.tags[pick.value]?.[facet].includes(value)||false;input.onchange=()=>{const tags=layout.tags[pick.value]??=Object.fromEntries(Object.keys(data.facets).map(key=>[key,[]]));tags[facet]=input.checked?[...tags[facet],value]:tags[facet].filter(tag=>tag!==value);changed();};label.prepend(input);group.append(label);}filter.append(group);}}
  byId('page').onchange=()=>{selected[key]=byId('page').value;selected.section=null;draw();};byId('section').onchange=()=>{selected.section=byId('section').value;draw();};
  const preview=new URL('/private-china-tours/'+area+'/'+(item&&(dest||style)?item.id+'/':''),location.origin);preview.searchParams.set('layout-preview','1');if(item&&!dest&&!style)preview.searchParams.set('collection',item.id);if(dest&&page==='@overview')preview.hash=section==='other'?'by-region':section;byId('preview').href=preview.href;byId('publish').disabled=dirty||!data.canPublish||!data.revision;
 }
 async function api(body){const result=await fetch('/api/team/private-layout',body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});const json=await result.json();if(!result.ok)throw new Error(json.error||'载入失败');return json;}
 async function write(action){if(busy||action==='publish'&&!confirm('将已保存的三个栏目布局一起发布到官网？'))return;busy=true;byId('tools').inert=true;try{const result=await api({action,revision:data.revision,...action==='save'?{layout}:{}});data.revision=result.revision;dirty=false;draw();status.textContent=action==='save'?'草稿已保存，尚未发布。':'已发布。';}catch(error){status.textContent=error.message;}finally{busy=false;byId('tools').inert=false;}}
 byId('area').onchange=draw;byId('save').onclick=()=>write('save');byId('publish').onclick=()=>write('publish');window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
 api().then(result=>{data=result;layout=result.layout;byId('tools').hidden=false;status.textContent='已载入当前布局草稿。';draw();}).catch(error=>status.textContent=error.message+' 请返回内容工作台登录后重试。');
})();
