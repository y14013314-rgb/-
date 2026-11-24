import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {findPages,onRequest} from '../functions/search/index.js';
import {catalog} from '../lib/content/catalog-product.mjs';
import {privatePage} from '../lib/content/private-pages.mjs';
import {privateState} from '../lib/content/private-layout.mjs';
import {withSearch} from '../lib/content/search-ui.mjs';

const origin='https://site.test';
test('travel styles shows only six theme cards and keeps journeys, not featured experiences, on detail pages',async()=>{
 const state=await privateState(null),show=path=>privatePage(state,new URL('/private-china-tours/'+path,origin));
 const overview=show('travel-styles/');assert.equal((overview.match(/class="pt-card"/g)||[]).length,6);assert.doesNotMatch(overview,/Explore Our Signature Experiences|<h2>Plan Your Journey/);
 for(const id of state.layout.themes){const detail=show('travel-styles/'+id+'/');assert.doesNotMatch(detail,/Featured Experiences/);assert.match(detail,/Recommended Journeys/);}
 assert.match(show('destinations/beijing/'),/Top Experiences/);
});
test('search renders product covers and links before supplementary website pages',async()=>{
 const response=await onRequest({request:new Request(origin+'/search/?q=Baiyun'),env:{}});const html=await response.text();
 assert.match(html,/<article class="pt-card"><a href="\/silk-road-luxury-trains\/baiyun\/"><img class="pt-cover" src="\/assets\/[^"]+"[^>]*><small>Train Journey<\/small><strong>[^<]+/);
 assert(html.indexOf('search-cards')<html.indexOf('<details class="search-pages">'));
});
test('public forms appear once: global on the hero and scoped above interior content',async()=>{
 const home=withSearch(readFileSync(new URL('../public/index.html',import.meta.url),'utf8'));
 assert.equal(withSearch(home),home);assert.match(home,/<section class="home-hero"[\s\S]*?placeholder="Search all site content"[\s\S]*?home-hero-bottom/);
 const page=privatePage(await privateState(null),new URL('/private-china-tours/signature-journeys/',origin));
 assert.match(page,/<\/header><form class="site-search"[^]*?value="signature-journeys"[^]*?<\/form><main/);assert.doesNotMatch(page,/Find a Journey That Fits You|Find journeys/);
});
test('search respects sections and published content, including bodies and private guides',()=>{
 const product={...catalog['classic-china'].product,sections:[{title:'Day 12',description:'Juniper garden lunch'}]};
 const rows=[{slug:product.slug,published:JSON.stringify(product),draft:'not searchable'},{slug:'baiyun',is_hidden:1}];
 const search=(term,scope)=>findPages(term,scope,rows,origin).map(page=>page.path);
 assert.deepEqual(search('Juniper garden','all'),['/journeys/classic-china/']);assert.deepEqual(search('Juniper garden','silk-road-luxury-trains'),[]);
 assert(!search('Baiyun','all').includes('/silk-road-luxury-trains/baiyun/'));assert.deepEqual(search('not searchable','all'),[]);
 assert(search('Beijing','destinations').includes('/private-china-tours/destinations/beijing/'));
 assert(search('Beijing','destinations').every(path=>path.startsWith('/destinations/')||path.startsWith('/private-china-tours/destinations/')));
});
test('zero results retain scope and escape the query',async()=>{
 const response=await onRequest({request:new Request(origin+'/search/?scope=privacy&q=%3Ctest%3E'),env:{}});const html=await response.text();
 assert.match(html,/0 results for “&lt;test&gt;” in Privacy/);assert.match(html,/placeholder="Search Privacy"/);
});
