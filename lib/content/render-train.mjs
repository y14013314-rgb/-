import { priceLabel } from './product.mjs';
export function renderTrain(product, template, origin) {
const collection = "/silk-road-luxury-trains/";
const productUrl = collection + product.slug + "/";
const escape = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const route = product.route.join(' · ');
const highlights = product.highlights.map(({ title, description }) =>
  `<article><h3>${escape(title)}</h3><p>${escape(description)}</p></article>`).join('');
const editions = product.editions.map(({ title, description, supplement }) => {
  const price = supplement
    ? `<p>Brochure supplement · ${escape(supplement.option)} · ${escape(supplement.currency)} ${escape(supplement.amount.toLocaleString('en-GB'))} per ${escape(supplement.unit)}. Confirm before booking.</p>`
    : '';
  return `<details><summary>${escape(title)}<b>＋</b></summary><p>${escape(description)}</p>${price}</details>`;
}).join('');
const itinerary = product.itinerary.map(({ title, description }) =>
  `<li><h3>${escape(title)}</h3><p>${escape(description)}</p></li>`).join('');
const sources = product.sources.map(title => `<li>${escape(title)}</li>`).join('');
const fields = {
  ...product, origin, url: productUrl, route, image: product.image.src,
  imageAlt: product.image.alt, imageCredit: product.image.credit, film: product.film.src,
  poster: product.film.poster, filmCredit: product.film.credit, price: priceLabel(product.price),
};
const sections = { highlights, editions, itinerary, sources };
const detail = template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
  if (Object.hasOwn(sections, key)) return sections[key];
  if (!Object.hasOwn(fields, key)) throw new Error('Missing template field: ' + key);
  return escape(fields[key]);
});
const card = `<article class="cruise-collection-card" id="${escape(product.slug)}">
  <a class="cruise-collection-image" href="${productUrl}" aria-label="Explore ${escape(product.title)}">
    <img src="${escape(product.image.src)}" alt="${escape(product.image.alt)}" loading="lazy">
    <span>${escape(product.image.credit)}</span>
  </a>
  <div class="cruise-collection-copy"><p class="eyebrow">${escape(product.localTitle)}</p>
    <h2>${escape(product.title)}</h2><p class="cruise-duration">${product.days} days · ${product.year}</p>
    <p>${escape(product.description)}</p><p>${escape(route)}</p><p>${escape(priceLabel(product.price))}</p>
    <a class="button" href="${productUrl}">Explore this train ↗</a>
  </div>
</article>`;
return { detail, card, productUrl };
}
