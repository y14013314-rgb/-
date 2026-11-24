const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const railInquiryCopy={
 heading:'Make it yours',productLabel:'Train',departureLabel:'Preferred departure date',
 cabinLabel:'Cabin preference (optional)',cabinExample:'e.g. A standard twin cabin, an executive suite or a family cabin',
 extensionLabel:'Extend your journey (optional)',extensionExample:'e.g. Two extra nights after the train journey.',
 adultsLabel:'Adults',childrenLabel:'Children',agesLabel:'Children’s ages at departure',agesExample:'For example: 1, 8, 14',
 contactHeading:'Your contact details',nameLabel:'Your name',emailLabel:'Email for our reply',
 consent:'I agree to the Privacy Policy and to sharing my inquiry with SUKHA.',button:'Review my inquiry →',
 note:'Nothing is sent until you confirm. Your preferred date is a request, not a confirmed departure.',
};
const cruiseInquiryCopy={...railInquiryCopy,productLabel:'Ship',extensionExample:'e.g. I’d like to spend three extra days in Chongqing after the cruise.',note:'Nothing is sent until you confirm. Your preferred date is a request, not a confirmed sailing.'};
export function inquiryForm(rail=false,title='',copy={}){
 const text={...(rail?railInquiryCopy:cruiseInquiryCopy),...copy};
 return `<form id="cruise-inquiry" method="dialog"${rail?' data-type="rail"':''}><h3>${rail?'':'02 · '}${escape(text.heading)}</h3><p>${escape(text.productLabel)}: <strong id="cruise-ship">${title}</strong></p><p id="cruise-voyage" aria-live="polite"></p>
<div class="form-grid three"><label>${escape(text.departureLabel)}<input type="date" name="departure"></label><label>${escape(text.cabinLabel)}<textarea name="cabin" rows="2" maxlength="160" placeholder="${escape(text.cabinExample)}"></textarea></label><label>${escape(text.extensionLabel)}<textarea name="extension" rows="2" maxlength="350" placeholder="${escape(text.extensionExample)}"></textarea></label>
<label>${escape(text.adultsLabel)}<input type="number" name="adults" min="1" max="50" value="2" required></label><label>${escape(text.childrenLabel)}<input type="number" name="children" min="0" max="30" value="0" required></label><label>${escape(text.agesLabel)}<input name="ages" maxlength="100" placeholder="${escape(text.agesExample)}"></label></div>
<h4>${escape(text.contactHeading)}</h4><div class="form-grid"><label>${escape(text.nameLabel)}<input name="name" maxlength="100" autocomplete="name" required></label><label>${escape(text.emailLabel)}<input name="email" type="email" maxlength="254" autocomplete="email" required></label></div>
<label class="cruise-consent"><input type="checkbox" name="consent" required><span>${escape(text.consent).replace('Privacy Policy','<a href="/privacy/" target="_blank" rel="noopener">Privacy Policy</a>')}</span></label><button class="button" type="submit">${escape(text.button)}</button><p class="quiet">${escape(text.note)}</p></form>`;
}

export function withCruiseInquiry(html){
 const cruiseForm=inquiryForm();
 if(html.includes('class="cruise-series-shortcuts"'))html=html.replace(/<div class="cruise-series-shortcuts">[\s\S]*?<\/div>/,'');
 if(!html.includes('class="explorer-config"')||html.includes('id="cruise-inquiry"'))return html;
 html=html.replace(/(<section class="explorer-config" id="explorer-config"[^>]*>)[\s\S]*?<\/section>/,(_,open)=>open+cruiseForm+'</section>')
  .replace(/(<div class="explorer-config" id="series-config">)[\s\S]*?<\/div>(?=<details class="explorer-details")/,(_,open)=>open+cruiseForm+'</div>');
 if(!html.includes('id="cruise-inquiry"'))return html;
 if(!html.includes('id="explorer-config"')){
  const visits=html.includes('rel="canonical" href=')&&html.match(/rel="canonical" href="[^"]*\/yangtze-river-cruises\/(century-legend|yangtze-miracle)\//)?.[1];
  const description=visits==='century-legend'?'The reference voyage links the Three Gorges with the middle and lower Yangtze. Cultural visits around Wuhan and Nanjing depend on your sailing and direction.':visits==='yangtze-miracle'?'The downstream programme describes a choice of visits in Fuling and a stop in Wushan. Selected upstream departures include Shennongjia; check which excursions apply to your cabin.':'Check the stops and excursion choices on your chosen voyage.';
  html=html.replace('<details class="explorer-details">',`<details class="explorer-details"><summary>What to expect on shore</summary><div class="info-grid three"><article><h3>Planning your shore visits</h3><p>${description}</p></article></div><p>Ask us to confirm inclusions, walking distances and accessibility for your departure.</p></details><details class="explorer-details">`);
 }
 return html.replace(' aria-labelledby="explorer-heading"',' aria-label="Cruise inquiry"')
  .replace(/<section class="wrap section"><div class="section-head">(?:(?!<\/section>)[\s\S])*?<div class="table-scroll"><table>[\s\S]*?<\/section>/,'')
  .replace(/<section class="ivory"><div class="wrap section"><div class="section-head">(?:(?!<\/section>)[\s\S])*?<div class="journey-grid"><article class="journey-card"[\s\S]*?<\/section>/,'')
  .replace('<script src="/cruise-series.js" defer></script>','')
  .replace('src="/yangzi-explorer.js"','src="/yangzi-explorer.js?v=cruise-form-1"')
  .replace('</head>','<link rel="stylesheet" href="/cruise-inquiry.css"><script defer src="/cruise-inquiry.js?v=voyage-cards-1"></script></head>');
}
