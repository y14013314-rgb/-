import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog} from '../lib/content/catalog-product.mjs';
import {stateFromRows,validLayout} from '../lib/content/private-layout.mjs';
import {privatePage} from '../lib/content/private-pages.mjs';

const show=(state,path)=>privatePage(state,new URL('https://example.test/private-china-tours/'+path+'/'));
test('all destinations have independent editable sections after season, initialized from published copy',()=>{
 const product=structuredClone(catalog['destination-beijing'].product);product.values.field4='Discover Beijing in Four Days';
 const rows=[{slug:product.slug,published:JSON.stringify(product)}],state=stateFromRows(rows);
 for(const destination of state.layout.destinations){const html=show(state,'destinations/'+destination.id);assert(!html.includes('Discover Beijing in Four Days'));if(destination.id==='beijing'){assert.doesNotMatch(html,/class="pt-story"/);assert.match(html,/Best Time to Visit[\s\S]*?Top Experiences/);continue;}assert.match(html,/Best Time to Visit[\s\S]*?<section class="pt-story">/);assert(html.indexOf('Recommended Tours')===-1||html.indexOf('pt-story')<html.indexOf('Recommended Tours'));}
 const beijing=state.layout.destinations.find(item=>item.id==='beijing');assert.equal(beijing.story.title,product.values.field4);assert.equal(beijing.story.tag2,'Private & adaptable');
 beijing.story.body='A new line\n<edited> & more';let preview=stateFromRows(rows,{draft:JSON.stringify(state.layout)},true);
 assert(!show(preview,'destinations/beijing').includes('A new line'));assert(!show(stateFromRows(rows),'destinations/beijing').includes('A new line'));
 for(const key of Object.keys(beijing.story))beijing.story[key]='';assert(validLayout(state.layout));
 rows.push({slug:'@private-tours-layout',published:JSON.stringify(state.layout)});assert(!show(stateFromRows(rows),'destinations/beijing').includes('class="pt-story"'));
 beijing.story.body=15;assert(!validLayout(state.layout));
});
test('every public product category can be recommended; hidden and draft-only products are excluded',()=>{
 const slug='wildlife-sanjiangyuan-snow-leopard',custom={...catalog['classic-china'].product,templateSlug:'classic-china',slug:'custom-trip',title:'Custom trip'};
 const state=stateFromRows([{slug:'classic-china',is_hidden:1},{slug:'draft-only',draft:JSON.stringify({...custom,slug:'draft-only'})},{slug:custom.slug,published:JSON.stringify(custom)}]);
 assert.equal(new Set(Object.values(state.tours).map(item=>item.group)).size,7);assert(!state.tours['classic-china']&&!state.tours['draft-only']&&!state.tours.homepage);assert.equal(state.tours.baiyun.href,'/silk-road-luxury-trains/baiyun/');assert.equal(state.tours[custom.slug].href,'/journeys/custom-trip/');
 state.layout.styles[0].tours=[slug,custom.slug];state.layout.collections[0].tours=[slug];state.layout.destinations[0].tours=[slug];
 for(const path of ['travel-styles/wildlife','destinations/beijing','signature-journeys'])assert(show(state,path).includes(state.tours[slug].href));
 const hidden=stateFromRows([{slug,is_hidden:1},{slug:'@private-tours-layout',published:JSON.stringify(state.layout)}]);assert(!show(hidden,'travel-styles/wildlife').includes(state.tours[slug].href));
});
