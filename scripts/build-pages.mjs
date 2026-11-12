import { buildCatalog } from './catalog.mjs';
import { renderTrain } from '../lib/content/render-train.mjs';
import { cpSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = join(root, 'public');
const catalog = buildCatalog(root);
writeFileSync(join(root, 'lib/content/catalog-seed.mjs'), 'export default ' + JSON.stringify(catalog) + ';\n');
const output = join(root, 'pages-dist');
const live = process.env.SITE_URL === 'https://sukhatrip.com'
  && (!process.env.CF_PAGES || process.env.CF_PAGES_BRANCH === 'codex/pages-preview');
if (process.env.SITE_URL && process.env.SITE_URL !== 'https://sukhatrip.com') {
  throw new Error('SITE_URL must be https://sukhatrip.com. Leave it unset for previews.');
}
const origin = live ? process.env.SITE_URL
  : new URL(process.env.CF_PAGES_URL || 'http://127.0.0.1:8788').origin;
const oldOrigin = 'https://sukha-travel-20261103.racinglight1.chatgpt.site';
const collection = '/silk-road-luxury-trains/';
const product = JSON.parse(readFileSync(join(root, 'content/products/baiyun.json'), 'utf8'));
const productUrl = collection + product.slug + '/';
writeFileSync(join(root, 'lib/content/train-seed.mjs'), 'export default ' + JSON.stringify(product) + ';\n');
const assets = [product.image.src, product.film.src, product.film.poster];
for (const asset of assets) {
  if (!asset.startsWith('/assets/') || asset.includes('..') || !statSync(join(source, asset)).isFile()) {
    throw new Error('Invalid product asset: ' + asset);
  }
}
if (product.slug !== 'baiyun' || product.price.status !== 'on-request') {
  throw new Error('The Baiyun sample expects its existing URL and price on request.');
}

const template = readFileSync(join(root, 'pages/templates/train-detail.html'), 'utf8');
writeFileSync(join(root, 'lib/content/train-template.mjs'), 'export default ' + JSON.stringify(template) + ';\n');
const { detail, card } = renderTrain(product, template, origin);
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
cpSync(join(root, 'team/public'), join(output, 'team'), { recursive: true });
for (const file of readdirSync(output, { recursive: true }).filter(file => file.endsWith('.html'))) {
  const path = join(output, file);
  writeFileSync(path, readFileSync(path, 'utf8').replaceAll(oldOrigin, origin));
}
const sitemap = readFileSync(join(source, 'sitemap.xml'), 'utf8');
writeFileSync(join(output, 'sitemap.xml'), sitemap.replaceAll(oldOrigin, origin)
  .replace(/<url><loc>[^<]+\/(plan-my-trip|destinations|signature-experiences)\/<\/loc><\/url>/g, ''));
writeFileSync(join(output, 'robots.txt'), live
  ? `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\nDisallow: /team/\nSitemap: ${origin}/sitemap.xml\n`
  : 'User-agent: *\nDisallow: /\n');
writeFileSync(join(output, '_headers'), '/*\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n'
  + (live
    ? '\nhttps://:project.pages.dev/*\n  X-Robots-Tag: noindex\n\nhttps://:version.:project.pages.dev/*\n  X-Robots-Tag: noindex\n'
    : '  X-Robots-Tag: noindex\n')
  + '\n/team/*\n  X-Robots-Tag: noindex\n  Cache-Control: no-store\n  Content-Security-Policy: default-src \'self\'; img-src \'self\' https: data: blob:; media-src \'self\' https: blob:; frame-ancestors \'none\'; base-uri \'none\'; form-action \'self\'\n');
writeFileSync(join(output, '_redirects'), ['/payment', '/payment/', '/plan-my-trip', '/plan-my-trip/']
  .map(path => path + ' /#request-quote 302\n').join(''));
writeFileSync(join(output, '_routes.json'), JSON.stringify({
  version: 1, include: ['/api/inquiries', '/api/inquiries/', '/api/team/*', '/media/*', '/silk-road-luxury-trains/', '/yangtze-river-cruises/', '/silk-road-luxury-trains/baiyun', '/silk-road-luxury-trains/baiyun/', ...Object.values(catalog).map(p=>p.path)], exclude: [],
}) + '\n');
writeFileSync(join(output, '404.html'), '<!doctype html><html lang="en"><meta charset="utf-8"><title>Page not found | SUKHA</title><h1>Page not found</h1><p><a href="/">Return to SUKHA</a></p></html>\n');
console.log(`Pages ${live ? 'live' : 'preview'} built in ${output}`);
