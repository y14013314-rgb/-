import { cpSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = join(root, 'public');
const output = join(root, 'pages-dist');
const origin = new URL(process.env.CF_PAGES_URL || 'http://127.0.0.1:8788').origin;
const oldOrigin = 'https://sukha-travel-20261103.racinglight1.chatgpt.site';
const collection = '/silk-road-luxury-trains/';
const product = JSON.parse(readFileSync(join(root, 'content/products/baiyun.json'), 'utf8'));
const productUrl = collection + product.slug + '/';
const escape = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const route = product.route.join(' · ');
const assets = [product.image.src, product.film.src, product.film.poster];
for (const asset of assets) {
  if (!asset.startsWith('/assets/') || asset.includes('..') || !statSync(join(source, asset)).isFile()) {
    throw new Error('Invalid product asset: ' + asset);
  }
}
if (product.slug !== 'baiyun' || product.price.status !== 'on-request') {
  throw new Error('The Baiyun sample expects its existing URL and price on request.');
}

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
const template = readFileSync(join(root, 'pages/templates/train-detail.html'), 'utf8');
const fields = {
  ...product, origin, url: productUrl, route, image: product.image.src,
  imageAlt: product.image.alt, imageCredit: product.image.credit, film: product.film.src,
  poster: product.film.poster, filmCredit: product.film.credit, price: 'Price on request',
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
    <p>${escape(product.description)}</p><p>${escape(route)}</p>
    <a class="button" href="${productUrl}">Explore this train ↗</a>
  </div>
</article>`;
const collectionSource = readFileSync(join(source, collection, 'index.html'), 'utf8');
const cardSlot = /<article class="cruise-collection-card" id="baiyun">[\s\S]*?<\/article>/;
if (!cardSlot.test(collectionSource)) throw new Error('Cannot locate the Baiyun collection card.');

const excluded = new Set(['admin', 'quote', 'inquiry-submit.js', 'assets/trains/collection-film.mp4']);
rmSync(output, { recursive: true, force: true });
cpSync(source, output, {
  recursive: true,
  filter: file => !excluded.has(file.slice(source.length + 1)),
});
writeFileSync(join(output, productUrl, 'index.html'), detail);
writeFileSync(join(output, collection, 'index.html'), collectionSource.replace(cardSlot, () => card));
cpSync(join(root, 'pages/inquiry.js'), join(output, 'pages-inquiry.js'));
for (const file of readdirSync(output, { recursive: true }).filter(file => file.endsWith('.html'))) {
  const path = join(output, file);
  writeFileSync(path, readFileSync(path, 'utf8').replaceAll(oldOrigin, origin));
}
const sitemap = readFileSync(join(source, 'sitemap.xml'), 'utf8');
writeFileSync(join(output, 'sitemap.xml'), sitemap.replaceAll(oldOrigin, origin)
  .replace(/<url><loc>[^<]+\/(plan-my-trip|destinations|signature-experiences)\/<\/loc><\/url>/g, ''));
writeFileSync(join(output, '_headers'), '/*\n  X-Robots-Tag: noindex\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n');
writeFileSync(join(output, '_redirects'), ['/payment', '/payment/', '/plan-my-trip', '/plan-my-trip/']
  .map(path => path + ' /#request-quote 302\n').join(''));
writeFileSync(join(output, '_routes.json'), JSON.stringify({
  version: 1, include: ['/api/inquiries', '/api/inquiries/'], exclude: [],
}) + '\n');
writeFileSync(join(output, '404.html'), '<!doctype html><html lang="en"><meta charset="utf-8"><title>Page not found | SUKHA</title><h1>Page not found</h1><p><a href="/">Return to SUKHA</a></p></html>\n');
console.log('Pages preview built in ' + output);
