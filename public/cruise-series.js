'use strict';
(()=>{
const dataElement=document.getElementById('series-data');if(!dataElement)return;
const data=JSON.parse(dataElement.textContent),q=id=>document.getElementById('series-'+id),ship=q('ship'),cabin=q('cabin'),sailing=q('sailing'),preferred=q('date'),adults=q('adults'),children=q('children'),ages=q('ages'),extension=q('extension'),link=q('inquire');
const routeButtons=[...document.querySelectorAll('[data-series-route]')].map(button=>({button,label:button.textContent}));
let route=data.routes[0];
const formatDate=d=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'));
function update(){
 const departure=preferred.value||sailing.value;
 const lines=['Cruise series: '+data.name,'Ship: '+ship.value,'Voyage: '+route.name,'Route: '+route.route,'Cruise duration: '+route.days+' days / '+(route.days-1)+' nights','Preferred departure: '+(departure?formatDate(departure):'Flexible — please advise'),'Cabin: '+cabin.value,'Adults: '+adults.value,'Children: '+children.value,'Children’s ages: '+(ages.value.trim()||'To discuss if applicable'),'Extension: '+extension.value];
 q('summary').textContent=lines.join('\n');
 Object.assign(link.dataset,{quoteJourney:data.name+' — '+route.name,quoteStyle:'Yangtze cruise',quoteDays:String(route.days),quoteDestinations:route.route,quoteRequirements:lines.join('\n'),quoteDeparture:departure,quoteAdults:adults.value,quoteChildren:children.value});
}
function dates(){
 let dates=route.dates||[];
 if(data.schedules){const key=ship.value.toLowerCase().replace(' ','')+'-'+route.id;dates=data.schedules[key]||[];}
 sailing.replaceChildren(new Option(dates.length?'Flexible — help me choose':'Dates on request',''),...dates.map(d=>new Option(formatDate(d),d)));preferred.value='';update();
}
function choose(id,scroll){route=data.routes.find(r=>r.id===id);q('selected').textContent=route.name+' · '+route.days+' days';routeButtons.forEach(({button,label})=>{const active=button.dataset.seriesRoute===id;button.setAttribute('aria-pressed',String(active));button.textContent=active?'Selected ✓':label;});dates();if(scroll)q('config').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
routeButtons.forEach(({button})=>button.addEventListener('click',()=>choose(button.dataset.seriesRoute,true)));
ship.addEventListener('change',dates);
sailing.addEventListener('change',()=>{preferred.value='';update();});preferred.addEventListener('input',()=>{sailing.value='';update();});
[cabin,adults,children,ages,extension].forEach(el=>el.addEventListener('input',update));
link.addEventListener('click',e=>{if(!adults.reportValidity()||!children.reportValidity()||!preferred.reportValidity()){e.preventDefault();e.stopPropagation();}});
choose(route.id,false);
})();
