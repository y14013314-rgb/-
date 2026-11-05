'use strict';
(()=>{
const routes=[
  {
    "id": "downstream",
    "days": 4,
    "name": "Chongqing to Yichang",
    "route": "Chongqing · Fuling · Zhongxian · Wushan · Yichang",
    "description": "A compact Three Gorges voyage, with cultural visits in Fuling and Zhongxian and a choice of excursions around Wushan.",
    "dates": [
      "2027-04-01",
      "2027-04-08",
      "2027-04-15",
      "2027-04-22",
      "2027-04-29",
      "2027-05-06",
      "2027-05-13",
      "2027-05-20",
      "2027-05-27",
      "2027-06-03",
      "2027-06-10",
      "2027-06-17",
      "2027-06-24",
      "2027-07-01",
      "2027-07-08",
      "2027-07-15",
      "2027-07-22",
      "2027-07-29",
      "2027-08-05",
      "2027-08-12",
      "2027-08-19",
      "2027-08-26",
      "2027-09-02",
      "2027-09-09",
      "2027-09-16",
      "2027-09-23",
      "2027-09-30",
      "2027-10-07",
      "2027-10-14",
      "2027-10-21",
      "2027-10-28",
      "2027-11-04",
      "2027-11-25",
      "2027-12-20",
      "2027-12-27"
    ]
  },
  {
    "id": "upstream-badong",
    "days": 5,
    "name": "Yichang to Chongqing via Badong",
    "route": "Yichang · Badong · Fengjie · Zhongxian · Chongqing",
    "description": "Travel upstream through the gorges, combining Badong with the riverside history of Fengjie and Zhongxian.",
    "dates": [
      "2027-04-04",
      "2027-04-11",
      "2027-04-25",
      "2027-05-02",
      "2027-05-16",
      "2027-05-23",
      "2027-05-30",
      "2027-06-13",
      "2027-06-20",
      "2027-06-27",
      "2027-07-04",
      "2027-07-18",
      "2027-08-01",
      "2027-08-15",
      "2027-08-29",
      "2027-09-05",
      "2027-09-12",
      "2027-09-26",
      "2027-10-03",
      "2027-10-17",
      "2027-10-24",
      "2027-11-07",
      "2027-11-28",
      "2027-12-23"
    ]
  },
  {
    "id": "upstream-shennongjia",
    "days": 5,
    "name": "Yichang to Chongqing via Shennongjia",
    "route": "Yichang · Shennongjia · Fengjie · Zhongxian · Chongqing",
    "description": "Pair the river with an excursion into the forest landscapes of Shennongjia.",
    "dates": [
      "2027-04-18",
      "2027-05-09",
      "2027-06-06",
      "2027-07-11",
      "2027-07-25",
      "2027-08-08",
      "2027-08-22",
      "2027-09-19",
      "2027-10-10",
      "2027-10-31"
    ]
  },
  {
    "id": "roundtrip-yichang-badong",
    "days": 8,
    "name": "Yichang round trip via Badong",
    "route": "Yichang · Badong · Chongqing · Yichang",
    "description": "Explore both directions of the river and return to Yichang, with time for Badong and Chongqing.",
    "dates": [
      "2027-04-04",
      "2027-04-11",
      "2027-04-25",
      "2027-05-02",
      "2027-05-16",
      "2027-05-23",
      "2027-05-30",
      "2027-06-13",
      "2027-06-20",
      "2027-06-27",
      "2027-07-04",
      "2027-07-18",
      "2027-08-01",
      "2027-08-15",
      "2027-08-29",
      "2027-09-05",
      "2027-09-12",
      "2027-09-26",
      "2027-10-03",
      "2027-10-17",
      "2027-10-24",
      "2027-12-23"
    ]
  },
  {
    "id": "roundtrip-yichang-shennongjia",
    "days": 8,
    "name": "Yichang round trip via Shennongjia",
    "route": "Yichang · Shennongjia · Chongqing · Yichang",
    "description": "A longer river journey combining the Three Gorges, Chongqing and Shennongjia.",
    "dates": [
      "2027-04-18",
      "2027-05-09",
      "2027-06-06",
      "2027-07-11",
      "2027-07-25",
      "2027-08-08",
      "2027-08-22",
      "2027-09-19",
      "2027-10-10",
      "2027-10-31"
    ]
  },
  {
    "id": "roundtrip-chongqing-badong",
    "days": 8,
    "name": "Chongqing round trip via Badong",
    "route": "Chongqing · Yichang · Badong · Chongqing",
    "description": "Begin and end in Chongqing on an extended exploration of the Three Gorges and Badong.",
    "dates": [
      "2027-04-01",
      "2027-04-08",
      "2027-04-22",
      "2027-04-29",
      "2027-05-13",
      "2027-05-20",
      "2027-05-27",
      "2027-06-10",
      "2027-06-17",
      "2027-06-24",
      "2027-07-01",
      "2027-07-15",
      "2027-07-29",
      "2027-08-12",
      "2027-08-26",
      "2027-09-02",
      "2027-09-09",
      "2027-09-23",
      "2027-09-30",
      "2027-10-14",
      "2027-10-21",
      "2027-11-04",
      "2027-11-25",
      "2027-12-20"
    ]
  }
];
const q=id=>document.getElementById(id),date=q('explorer-date'),suite=q('explorer-suite'),extension=q('explorer-extension'),adults=q('explorer-adults'),children=q('explorer-children'),ages=q('explorer-ages'),link=q('explorer-inquire');
let selected=routes[0];
const formatDate=value=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'));
function update(){
 const departure=date.value?formatDate(date.value):'Flexible — please advise';
 const lines=['Ship: Yangzi Explorer','Voyage: '+selected.name,'Route: '+selected.route,'Cruise duration: '+selected.days+' days / '+(selected.days-1)+' nights','Departure: '+departure,'Suite: '+suite.value,'Adults: '+adults.value,'Children: '+children.value,'Children’s ages: '+(ages.value.trim()||'To discuss if applicable'),'Extension: '+extension.value];
 q('explorer-summary').textContent=lines.slice(1).join(' · ');
 Object.assign(link.dataset,{quoteJourney:'Yangzi Explorer 2027 — '+selected.name,quoteDays:String(selected.days),quoteDestinations:selected.route,quoteRequirements:lines.join('\n'),quoteDeparture:date.value,quoteAdults:adults.value,quoteChildren:children.value});
}
function choose(id,scroll){
 selected=routes.find(r=>r.id===id);
 date.replaceChildren(new Option('Flexible — help me choose',''),...selected.dates.map(d=>new Option(formatDate(d),d)));
 q('explorer-selected').textContent=selected.name+' · '+selected.days+' days / '+(selected.days-1)+' nights';
 document.querySelectorAll('[data-explorer-route]').forEach(b=>{const active=b.dataset.explorerRoute===id;b.setAttribute('aria-pressed',String(active));b.textContent=active?'Selected ✓':'Choose this voyage ↗';});
 update();if(scroll)q('explorer-config').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
}
document.querySelectorAll('[data-explorer-route]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.explorerRoute,true)));
[date,suite,extension,adults,children,ages].forEach(el=>el.addEventListener('input',update));
link.addEventListener('click',e=>{if(!adults.reportValidity()||!children.reportValidity()){e.preventDefault();e.stopPropagation();}});
choose(selected.id,false);
})();
