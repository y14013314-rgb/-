for(const gallery of document.querySelectorAll('.tour-photos')){
 const nav=gallery.querySelector('.tour-photo-nav');if(!nav)continue;
 const track=gallery.querySelector('.tour-photo-track'),count=track.children.length,[previous,next]=nav.querySelectorAll('button'),status=nav.querySelector('span');
 const index=()=>Math.round(track.scrollLeft/track.clientWidth)||0;
 function update(){const current=index();previous.disabled=current<=0;next.disabled=current>=count-1;status.textContent=`${current+1} / ${count}`;}
 const show=position=>track.scrollTo({left:position*track.clientWidth,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 for(const [button,step] of [[previous,-1],[next,1]])button.onclick=()=>show(index()+step);
 let drag=null;
 track.onpointerdown=event=>{
  if(event.pointerType!=='mouse'||event.button!==0||!event.target.closest('img'))return;
  event.preventDefault();drag={start:event.clientX,left:track.scrollLeft,index:index()};track.setPointerCapture(event.pointerId);track.classList.add('dragging');
 };
 track.onpointermove=event=>{if(drag)track.scrollLeft=drag.left+drag.start-event.clientX;};
 track.onpointerup=event=>{if(!drag)return;const delta=drag.start-event.clientX,target=drag.index+(Math.abs(delta)>=Math.min(50,track.clientWidth*.15)?Math.sign(delta):0);drag=null;track.classList.remove('dragging');show(target);};
 track.onlostpointercapture=()=>{if(drag){const target=drag.index;drag=null;track.classList.remove('dragging');show(target);}};
 track.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);nav.hidden=false;update();
}
