export function validateProduct(value) {
  const text=(s,max=5000)=>typeof s==='string' && s.length<=max;
  const required=(s,max=5000)=>text(s,max)&&s.trim().length>0;
  const image=s=>required(s,1000)&&((/^\/media\/[a-f0-9-]{36}\.webp$/.test(s))||(s.startsWith('/assets/')&&!s.includes('..')&&!/[<>"'\\?#]/.test(s))||(/^https:\/\//.test(s)&&!/[<>"'\s]/.test(s)));
  const sections=(a,max)=>Array.isArray(a)&&a.length<=max&&a.every(x=>x&&required(x.title,200)&&required(x.description));
  if (!value || (value.templateSlug||value.slug)!=='baiyun') throw new Error('列车产品模板不正确，请重新载入产品。');
  if (!required(value.title,100)||!required(value.localTitle,150)||!required(value.description,2000)) throw new Error('请填写产品名称、中英文名称和简介。');
  if (!Number.isInteger(value.days)||value.days<1||value.days>100||!Number.isInteger(value.year)||value.year<2020||value.year>2100) throw new Error('请填写 1 至 100 天的行程天数和有效年份。');
  if (!Array.isArray(value.route)||!value.route.length||value.route.length>40||!value.route.every(x=>required(x,100))) throw new Error('请至少填写一个路线站点，每个站点不超过 100 个字符。');
  if (!value.image||!image(value.image.src)||!required(value.image.alt,300)||!text(value.image.credit,1000)) throw new Error('请检查列车封面图片地址和图片说明。');
  if (!value.film||!(value.film.src===''&&value.railMedia==='gallery'||image(value.film.src))||!(value.film.poster===''&&value.railMedia==='gallery'||image(value.film.poster))||!text(value.film.credit,1500)) throw new Error('请检查列车视频、封面图片或视频说明。');
  if (!sections(value.highlights,20)||!sections(value.itinerary,100)||!sections(value.editions,20)) throw new Error('请检查亮点、行程段和路线版本的名称与说明。');
  if (!text(value.planningNote)||!text(value.accessNote)||!Array.isArray(value.sources)||value.sources.length>30||!value.sources.every(x=>required(x,300))) throw new Error('请检查行程说明、出行提示和参考资料。');
  for (const e of value.editions) if(e.supplement && (!required(e.supplement.option,300)||!['CNY','USD','EUR','GBP'].includes(e.supplement.currency)||!Number.isFinite(e.supplement.amount)||e.supplement.amount<0||e.supplement.amount>10000000||!required(e.supplement.unit,50))) throw new Error('附加费用格式不正确。');
  const p=value.price;
  if (!p || !['on-request','from'].includes(p.status) || (p.status==='from'&&(!['CNY','USD','EUR','GBP'].includes(p.currency)||!Number.isFinite(p.amount)||p.amount<=0||p.amount>10000000))) throw new Error('请填写有效的起价和币种，或选择询价。');
  return value;
}
export function priceLabel(price) { return price.status==='from' ? `From ${price.currency} ${Number(price.amount).toLocaleString('en-GB')} per person` : 'Price on request'; }
