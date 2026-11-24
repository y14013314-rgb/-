export const base='/private-china-tours/';
export const regions=['North China','East China','Central China','Southwest China','Northwest China','South China','Northeast China'];
export const facets={visit:['First Time','Been Before'],length:['Up to 14 Days','15–18 Days','19+ Days'],interest:['Culture','Nature','Cities & Local Life','Adventure'],season:['Spring','Summer','Autumn','Winter']};
const home=name=>`/assets/home-v1/${name}.webp`;
const travel=name=>`/assets/travel-real/${name}.webp`;
const destinationFilms={
 beijing:{videoTitle:'Beijing Gets Me',videoUrl:'https://play.shipin.beijing.gov.cn/vod/38993514/ywbcpk/mrlm/2026/01/16/5404D06FEE684b0586E276E0ED8089361.mp4'},
 chengdu:{videoTitle:'Charming China – Vibrant Chengdu',videoUrl:'https://gcdpic-1328690609.cos.ap-chengdu.myqcloud.com/2056/c10c/2056c10c68b3ef05d1bc3dbef32135b1.mp4'},
 chongqing:{videoTitle:'Chongqing’s Yangtze River Cableway',videoUrl:'https://v.qq.com/txp/iframe/player.html?vid=z0973m92vq9'},
 'inner-mongolia':{videoTitle:'Beautiful Horqin Right Middle Banner',videoUrl:'https://lyfw.mct.gov.cn/_static/attachment/3c/6d/76/6c2f9134c40681700336047940cc95d3.mp4'},
 shanghai:{videoTitle:'This is Shanghai · city ambassadors',videoUrl:'https://english.shanghai.gov.cn/cmsres/dd/dd95615f557b4a418384d4081f941ee7/a18f713244932f77ab6914c51f704f65.mp4'},
 xian:{videoTitle:'Global visitors journey through time in Xi’an',videoUrl:'https://v-hls.chinadaily.com/player/player.html?src=//v-hls.chinadaily.com/stream/607827/2cc6d59c-81f9-4b70-af7e-e5026234b426/7a95449c-798c-4da6-a3ca-ee97bc5a1256_h.m3u8&p=//video-ref.chinadaily.com.cn/images/202609/18/6aac9562e4b0f52de259849e.jpeg&c=59ffc23da3100d18610b8f8d&is=1'},
 xinjiang:{videoTitle:'Waiting for you in Xinjiang',videoUrl:'https://lyfw.mct.gov.cn/_static/attachment/94/9e/6d/9afe01afe3230cceccac2e3cd75b6b17.mp4'},
 yunnan:{videoTitle:'Meet Yunnan',videoUrl:'https://lyfw.mct.gov.cn/_static/attachment/fb/3d/80/f7eb8a99656e8a9c7707cfbcf94a9ac4.mp4'}
};
const destinations=[
 ['beijing','Beijing',0,home('beijing'),'Trace the relationship between imperial courtyards, hutong neighbourhoods and the Great Wall.','Great Wall|Imperial courtyards|Hutong walks','Spring and autumn suit long walks; allow extra time around major holidays.'],
 ['chengdu','Chengdu & Sichuan',3,home('sichuan'),'Pair the teahouses of Chengdu with panda conservation and the archaeology of Sanxingdui.','Panda habitats|Sanxingdui|Sichuan kitchens','Spring and autumn are comfortable for city visits; mountain routes have their own seasons.'],
 ['guilin','Guilin & Yangshuo',5,home('guilin'),'Follow the Li River past limestone towers and slow down in the villages around Yangshuo.','Li River landscapes|Village cycling|Karst walks','Autumn is a good starting point for outdoor days; summer rain can change river conditions.'],
 ['shanghai','Shanghai',1,home('shanghai'),'Read the city through its waterfront architecture, neighbourhood lanes and contemporary skyline.','The Bund|Neighbourhood walks|Modern architecture','Spring and autumn suit walking; summers can be hot and humid.'],
 ['xian','Xi’an',4,travel('xian'),'Discover the old imperial capital through its archaeology and the city that grew around its walls.','Terracotta Warriors|Ancient city wall|Local food','Spring and autumn offer milder days for exploring the city walls.'],
 ['zhangjiajie','Zhangjiajie',2,travel('zhangjiajie'),'Explore sandstone pillars and forest trails, with viewpoints chosen around the weather.','Sandstone peaks|Forest trails|Mountain viewpoints','Allow flexibility in spring and autumn: mist can reveal or conceal the peaks.'],
 ['xinjiang','Xinjiang',4,home('xinjiang'),'Explore oasis towns and mountain landscapes along the historic Silk Road.','Kashgar|Pamir scenery|Oasis culture','Timing depends on the route; high passes and desert towns have very different conditions.'],
 ['guizhou','Guizhou',3,'','Explore Dong and Miao communities through village architecture, craft and mountain landscapes.','Dong villages|Local crafts|Natural wonders','Choose dates around local festivals for a cultural visit; allow for rain on mountain roads.'],
 ['yunnan','Yunnan',3,home('yunnan'),'Follow the changing landscapes and cultures between Dali, Lijiang and the Tibetan plateau.','Dali|Lijiang|Shangri-La','Choose dates by altitude; highland weather differs from the valleys year-round.'],
 ['tibet','Tibet',3,home('tibet'),'Discover Lhasa and the high plateau with time set aside for acclimatisation.','Lhasa|Shigatse|Plateau landscapes','Access, permits, weather and altitude must be checked for your travel dates.'],
 ['chongqing','Chongqing',3,home('chongqing'),'Link the hillside city with Dazu’s stone carvings or Wulong’s karst landscapes.','Mountain city walks|Dazu carvings|Wulong karst','Spring and autumn are generally easier for walking than the hot summer months.'],
 ['inner-mongolia','Inner Mongolia',0,travel('inner-mongolia'),'Combine Hohhot with grassland landscapes and an introduction to pastoral life.','Grasslands|Hohhot|Ordos','Summer is the usual starting point for grassland trips; conditions vary by area.'],
 ['gansu','Gansu & Silk Road Corridor',4,travel('dunhuang'),'Follow the Hexi Corridor from Zhangye through Jiayuguan to Dunhuang.','Dunhuang|Zhangye|Jiayuguan','Spring and autumn avoid the strongest desert heat; nights can be cold.'],
 ['shanxi','Shanxi',0,'','Explore northern Chinese architecture through Datong, Yungang and the walled town of Pingyao.','Datong|Yungang Grottoes|Pingyao','Spring and autumn suit heritage walks; winter days are shorter.'],
 ['henan','Henan',2,'','Discover the art and history of the Central Plains around Luoyang.','Longmen Grottoes|Luoyang|Shaolin culture','Spring and autumn are useful starting points for outdoor sightseeing.'],
 ['ningxia','Ningxia',4,'','Discover Western Xia heritage and the vineyard landscapes at the foot of the Helan Mountains.','Helan Mountains|Wine country|Western Xia heritage','Ask about harvest dates when planning a vineyard visit.'],
 ['northeast','Northeast China',6,'','Travel between Shenyang, Changbai Mountain, Yanji and Harbin.','Harbin|Changbai Mountain|Yanji','Winter favours ice and snow; warmer months offer a different mountain itinerary.'],
 ['jiangnan','Jiangnan & East China',1,'','Explore Suzhou gardens, Hangzhou tea country and the waterways of Jiangnan.','Suzhou gardens|Hangzhou tea|Water towns','Spring tea season and mild autumn days are good starting points.']
];
const styles=[
 ['wildlife','Wildlife & Nature',travel('qinghai'),'Look for wildlife in its own habitat, leaving time for patient observation rather than promising a sighting.','Plateau habitats|Wildlife observation','nature-china'],
 ['hiking','Hiking & Trekking',home('tibet'),'Choose mountain trails around terrain, season, altitude and your preferred walking pace.','Highland paths|Guided walks','nature-china'],
 ['heritage','Culture & Heritage',travel('xian'),'Meet China through living craft traditions, historic towns and archaeological sites.','Traditional craft|Historic architecture','china-cultural-discovery'],
 ['ancient-routes','Silk Road & Ancient Routes',travel('dunhuang'),'Follow the paths of ancient travellers through oasis towns and the cultural crossroads of the Hexi Corridor.','Dunhuang|The Hexi Corridor','ancient-silk-road'],
 ['offbeat','Off-the-Beaten-Path',travel('inner-mongolia'),'Give smaller towns and less familiar landscapes space in your itinerary.','Borderland cultures|Grassland landscapes','xinjiang-explorer'],
 ['food','Food & Local Life',travel('chengdu-tea'),'Find everyday China in teahouses, markets and regional kitchens.','Teahouses|Local markets','chengdu-local-life']
];
export const signatures=[
 ['icons-natural-wonders','China’s Icons & Natural Wonders','14–15','beijing xian zhangjiajie guilin shanghai','Beijing · Xi’an · Zhangjiajie · Guilin · Shanghai','Nature'],
 ['classics-pandas-cities','China Classics, Pandas & City Life','12–13','beijing xian chengdu chongqing shanghai','Beijing · Xi’an · Chengdu · Chongqing · Shanghai','Cities & Local Life'],
 ['grand-china-discovery','The Grand China Discovery','19–21','beijing xian chengdu chongqing guizhou guilin shanghai','Beijing · Xi’an · Chengdu · Chongqing · Guizhou · Guilin · Shanghai','Culture'],
 ['southwest-cultures','Southwest China: Cultures & Landscapes','13–15','chengdu chongqing yunnan','Chengdu · Chongqing · Kunming · Dali · Lijiang · Shangri-La','Nature'],
 ['china-dynasties','China Through the Dynasties','13–15','beijing shanxi xian henan shanghai','Beijing · Datong · Pingyao · Xi’an · Luoyang · Shanghai','Culture'],
 ['northeast-heritage','Northeast China: Nature & Heritage','13–15','beijing northeast shanghai','Beijing · Shenyang · Changbai Mountain · Yanji · Harbin · Shanghai','Culture'],
 ['legendary-silk-road','The Legendary Silk Road','15–17','xian gansu xinjiang','Xi’an · Zhangye · Jiayuguan · Dunhuang · Turpan · Ürümqi · Kashgar','Culture'],
 ['tibet-roof-of-the-world','Tibet & the Roof of the World','16–18','beijing chongqing tibet shanghai','Beijing · Chongqing · Lhasa · Shigatse · Xining · Shanghai','Adventure'],
 ['great-wall-grasslands','Great Wall, Grasslands & Nomadic Culture','11–13','beijing inner-mongolia','Beijing · Hohhot · Grasslands · Ordos · Beijing','Nature'],
 ['winter-wonders','Winter Wonders of China','11–12','beijing northeast shanghai','Beijing · Harbin · Yabuli or Snow Town · Shanghai','Adventure']
];
export function initialLayout(){
 const tags=Object.fromEntries(signatures.map(([id,,days,,,interest],index)=>{const [min,max]=days.split('–').map(Number);return [id,{visit:index<3||index>5?[...facets.visit]:['Been Before'],length:facets.length.filter((_,index)=>index===0?min<=14:index===1?max>=15&&min<=18:max>=19),interest:[interest],season:id==='winter-wonders'?['Winter']:['northeast-heritage','great-wall-grasslands','tibet-roof-of-the-world'].includes(id)?['Summer','Autumn']:['Spring','Autumn']}];}));
 const groups=[['classic','Classic China',0,3,'beijing'],['deeper','Discover China Deeper',3,6,'yunnan'],['extraordinary','Extraordinary Journeys',6,10,'xinjiang']];
 const guide=(id,title,image,intro,items,tours)=>({id,title,image,intro,experiences:items.split('|').map(title=>({title,image:''})),tours});
 return {first:['classic-china','chengdu-chongqing-yangtze','guilin-family','china-cultural-discovery','nature-china','ancient-silk-road'],second:['xinjiang-explorer','yunnan-slow-journey','chengdu-local-life'],more:['china-river-culture'],
 destinations:destinations.map(([id,title,region,image,intro,items,season])=>({...guide(id,title,image,intro,items,signatures.filter(row=>row[3].split(' ').includes(id)).map(row=>row[0])),...(destinationFilms[id]?{editorial:destinationFilms[id]}:{}),...(id==='beijing'?{extraPhotos:['/assets/travel-real/beijing-palace.jpg']}:{}),region:regions[region],season})),
 popular:destinations.slice(0,6).map(row=>row[0]),deep:destinations.slice(6,12).map(row=>row[0]),other:destinations.slice(12).map(row=>row[0]),
 styles:styles.map(([id,title,image,intro,items,tour])=>guide(id,title,image,intro,items,[tour])),themes:styles.map(row=>row[0]),featuredExperiences:[...new Set(styles.map(row=>row[5]))],
 collections:groups.map(([id,title,start,end,cover])=>({id,title,image:home(cover),tours:signatures.slice(start,end).map(row=>row[0])})),series:groups.map(row=>row[0]),tags};
}
