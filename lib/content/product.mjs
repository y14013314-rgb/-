export function validateProduct(value) {
  const text=(s,max=5000)=>typeof s==='string' && s.length<=max;
  const required=(s,max=5000)=>text(s,max)&&s.trim().length>0;
  const image=s=>required(s,1000)&&((s.startsWith('/assets/')&&!s.includes('..')&&!/[<>"'\\?#]/.test(s))||(/^https:\/\//.test(s)&&!/[<>"'\s]/.test(s)));
  const sections=(a,max)=>Array.isArray(a)&&a.length<=max&&a.every(x=>x&&required(x.title,200)&&required(x.description));
  if (!value || value.slug!=='baiyun' || !required(value.title,100) || !required(value.localTitle,150) || !required(value.description,2000)
    || !Number.isInteger(value.days)||value.days<1||value.days>100 || !Number.isInteger(value.year)||value.year<2020||value.year>2100
    || !Array.isArray(value.route)||!value.route.length||value.route.length>40||!value.route.every(x=>required(x,100))
    || !value.image||!image(value.image.src)||!required(value.image.alt,300)||!text(value.image.credit,1000)
    || !value.film||!image(value.film.src)||!image(value.film.poster)||!text(value.film.credit,1500)
    || !sections(value.highlights,20)||!sections(value.itinerary,100)||!sections(value.editions,20)
    || !text(value.planningNote)||!text(value.accessNote)||!Array.isArray(value.sources)||value.sources.length>30||!value.sources.every(x=>required(x,300))) throw new Error('请检查产品名称、图片地址、天数和行程等字段。');
  for (const e of value.editions) if(e.supplement && (!required(e.supplement.option,300)||!['CNY','USD','EUR','GBP'].includes(e.supplement.currency)||!Number.isFinite(e.supplement.amount)||e.supplement.amount<0||e.supplement.amount>10000000||!required(e.supplement.unit,50))) throw new Error('附加费用格式不正确。');
  const p=value.price;
  if (!p || !['on-request','from'].includes(p.status) || (p.status==='from'&&(!['CNY','USD','EUR','GBP'].includes(p.currency)||!Number.isFinite(p.amount)||p.amount<=0||p.amount>10000000))) throw new Error('请填写有效的起价和币种，或选择询价。');
  return value;
}
export function priceLabel(price) { return price.status==='from' ? `From ${price.currency} ${Number(price.amount).toLocaleString('en-GB')} per person` : 'Price on request'; }
