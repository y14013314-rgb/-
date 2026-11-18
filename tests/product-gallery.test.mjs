import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {catalog,galleryFor,coverFor,renderContent,validateContent} from '../lib/content/catalog-product.mjs';
import {updateCards} from '../lib/content/catalog-published.mjs';
const seed=JSON.parse(readFileSync(new URL('../content/products/baiyun.json',import.meta.url)));
const products=[seed,...Object.values(catalog).filter(entry=>['journeys','silk-road-luxury-trains','yangtze-river-cruises'].includes(entry.category)).map(entry=>entry.product)];
const origin='https://sukhatrip.com';
const photos=count=>Array.from({length:count},(_,index)=>({src:`https://example.test/photo-${index}.webp`,alt:`Photo ${index} <view>`,credit:'Photographer & owner'}));
const mainImages=html=>(html.match(/<main\b[\s\S]*?<\/main>/)[0].match(/<img\b/g)||[]).length;
test('every product template exposes existing photos without mutating saved content',()=>{
 for(const original of products){
  const product=structuredClone(original),before=renderContent(product,origin),gallery=galleryFor(product);
  assert.equal(gallery.length,mainImages(before),product.slug);
  assert.equal(gallery[0].src,coverFor(product));
  assert.equal(product.gallery,undefined);
  assert.deepEqual(product,original);
  assert.equal(renderContent(product,origin),before);
  product.gallery=gallery;validateContent(product);
  assert.equal(mainImages(renderContent(product,origin)),gallery.length,product.slug);
  for(const item of gallery)assert(renderContent(product,origin).includes(item.src));
 }
 assert.equal(galleryFor(catalog.homepage.product),null);
 assert.equal(galleryFor(catalog['destination-tibet'].product),null);
});
test('all product templates support one, several and fifty images with an updated cover',()=>{
 for(const original of products){
  for(const count of [1,3,50]){
   const product=structuredClone(original);product.gallery=photos(count);validateContent(product);
   const html=renderContent(product,origin);
   assert.equal(mainImages(html),count,product.slug+' '+count);
   assert.equal(coverFor(product),product.gallery[0].src);
   assert(html.includes('property="og:image" content="'+product.gallery[0].src+'"'));
   assert(!html.includes('<view>'));
   if(html.includes('class="cruise-hero"')){
    assert.equal((html.match(/class="cruise-hero-slide"/g)||[]).length,count);
    assert.equal((html.match(/aria-label="Image \d+"/g)||[]).length,count);
    assert.equal(html.includes('class="cruise-hero-controls" hidden'),count===1);
    assert(html.includes('1 / '+count+'</span>'));
    assert.equal((html.match(/<h1\b/g)||[]).length,1);
   }else{
    assert.equal(html.includes('class="wrap product-gallery"'),count>1);
    assert.equal(html.includes('href="/product-gallery.css"'),count>1);
    assert(html.indexOf(product.gallery.at(-1).src)<html.indexOf('class="trip-tags"'));
   }
  }
 }
});
test('reordering retains associated slide text and removing photos removes their slides',()=>{
 const product=structuredClone(catalog.chengdu.product),gallery=galleryFor(product);
 product.gallery=[gallery[2],gallery[0],{src:'/assets/new.webp',alt:'A new view',credit:''}];
 const html=renderContent(product,origin),slides=html.match(/<article class="cruise-hero-slide"[\s\S]*?<\/article>/g);
 assert(slides[0].includes(gallery[2].src));
 assert(slides[0].includes('<h1>Panda Train · Chengdu</h1>'));
 assert(slides[1].includes(gallery[0].src));
 assert(slides[1].includes('<h2>Panda Train'));
 assert(!html.includes(gallery[1].src));
 assert(!html.includes(gallery[3].src));
 assert(slides[2].includes('A new view'));
 assert(!html.includes('srcset='));
});
test('custom Gold gallery cannot be overwritten by legacy ship switching',()=>{
 const product=structuredClone(catalog['gold-cruises'].product);
 assert(renderContent(product,origin).includes('id="ship-gallery-data"'));
 product.gallery=photos(2);const html=renderContent(product,origin);
 assert(!html.includes('id="ship-gallery-data"'));
 assert(!html.includes('class="wrap ship-gallery-picker"'));
 assert(html.includes('id="series-ship"'));
});
test('previously uploaded cruise photos replace fixed slots, and empty legacy lists fall back',()=>{
 const product=structuredClone(catalog['gold-cruises'].product);
 const original=renderContent(product,origin),fixed=galleryFor(product);
 product.gallery=[];
 assert.deepEqual(galleryFor(product),fixed);
 assert.equal(renderContent(product,origin),original);
 product.gallery=photos(2);
 assert.deepEqual(galleryFor(product),photos(2));
 product.gallery.splice(0,1);
 product.gallery.push({...photos(3)[2],src:'/media/328cf4cd-a117-4595-9c88-1137597b601e.webp'});
 validateContent(product);
 const html=renderContent(product,origin);
 assert.equal(mainImages(html),2);
 assert(!html.includes(fixed[0].src));
 assert(!html.includes(photos(1)[0].src));
 for(const item of product.gallery)assert(html.includes(item.src));
});
test('published collection cards use the reordered gallery cover',()=>{
 const product=structuredClone(catalog['classic-china'].product);product.gallery=photos(2).reverse();
 const html='<article><a href="/journeys/classic-china/"><img src="/assets/old.webp" srcset="/assets/old-small.webp 400w"><h3>Classic China</h3></a></article>';
 const updated=updateCards(html,[{published:JSON.stringify(product)}]);
 assert(updated.includes('src="'+product.gallery[0].src+'"'));
 assert(!updated.includes('srcset='));
});
test('gallery validation rejects empty lists, bad addresses and invalid source references',()=>{
 for(const original of [seed,catalog.chengdu.product,catalog['classic-china'].product]){
  for(const gallery of [null,{},[],photos(51),[{...photos(1)[0],src:''}],[{...photos(1)[0],src:'https://?'}],[{...photos(1)[0],src:'javascript:alert(1)'}],[{...photos(1)[0],src:'/assets/../private'}],[{...photos(1)[0],src:'https://example.test/" onerror="alert(1)'}],[{...photos(1)[0],sourceIndex:100}],[{...photos(1)[0],alt:{}}]]){
   assert.throws(()=>validateContent({...structuredClone(original),gallery}));
  }
 }
 assert.throws(()=>validateContent({...structuredClone(catalog.homepage.product),gallery:photos(1)}));
});
