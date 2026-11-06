import fs from 'node:fs';
const products=JSON.parse(fs.readFileSync('content/home-featured.json','utf8'));
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const cards=products.filter(p=>p.featured).sort((a,b)=>a.order-b.order).map(p=>{
 if(!p.url.startsWith('/')||!fs.existsSync('public'+p.url+'index.html')||!fs.existsSync('public'+p.image))throw new Error('Invalid featured product asset or route: '+p.title);
 const image=escape(p.image),small=escape(p.image.split('/').pop().replace(/\.[^.]+$/,''));
 const responsive=fs.existsSync('public/assets/home-v3/'+small+'-960.webp')?` srcset="/assets/home-v3/${small}-960.webp 960w, ${image} 1920w" sizes="(max-width:500px) 88vw, 44vw"`:'';
 return `<article class="home-trip"><a class="home-trip-image" href="${escape(p.url)}" aria-label="Discover ${escape(p.title)}"><img src="${image}"${responsive} alt="${escape(p.alt)}" width="960" height="582" loading="lazy" decoding="async"></a><div class="home-trip-copy"><p class="home-kicker">${escape(p.category)}</p><h3><a href="${escape(p.url)}">${escape(p.title)}</a></h3><p>${escape(p.description)}</p><a class="home-text-link" href="${escape(p.url)}">Discover More <span aria-hidden="true">↗</span></a></div></article>`;
}).join('\n');
const file='public/index.html',html=fs.readFileSync(file,'utf8');
fs.writeFileSync(file,html.replace(/<!-- featured:start -->[\s\S]*?<!-- featured:end -->/,'<!-- featured:start -->\n'+cards+'\n<!-- featured:end -->'));
