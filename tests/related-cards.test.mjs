import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog} from '../lib/content/catalog-product.mjs';
import {stateFromRows,validLayout} from '../lib/content/private-layout.mjs';
import {privatePage} from '../lib/content/private-pages.mjs';

const show=(state,path)=>privatePage(state,new URL('https://example.test/private-china-tours/'+path+'/'));
test('destination guides omit the legacy story while continuing to accept saved layouts',()=>{
 const product=structuredClone(catalog['destination-beijing'].product);product.values.field4='Discover Beijing in Four Days';
 const rows=[{slug:product.slug,published:JSON.stringify(product)}],state=stateFromRows(rows);
 for(const destination of state.layout.destinations){
  const html=show(state,'destinations/'+destination.id);
  assert.doesNotMatch(html,/class="pt-story"/,destination.id);
  assert.match(html,/Best Time to Visit[\s\S]*?Top Experiences/,destination.id);
 }
 const beijing=state.layout.destinations.find(item=>item.id==='beijing');assert.equal(beijing.story.title,product.values.field4);assert.equal(beijing.story.tag2,'Private & adaptable');
 const chengdu=state.layout.destinations.find(item=>item.id==='chengdu');
 chengdu.story.body='Legacy custom copy';
 const layout=JSON.stringify(state.layout);
 const preview=stateFromRows(rows,{draft:layout},true);
 const published=stateFromRows([...rows,{slug:'@private-tours-layout',published:layout}]);
 for(const view of [preview,published])assert.doesNotMatch(show(view,'destinations/chengdu'),/class="pt-story"|Legacy custom copy/);
 assert(validLayout(state.layout));
 chengdu.story.body=15;assert(!validLayout(state.layout));
});
test('every public product category can be recommended; hidden and draft-only products are excluded',()=>{
 const slug='wildlife-sanjiangyuan-snow-leopard',custom={...catalog['classic-china'].product,templateSlug:'classic-china',slug:'custom-trip',title:'Custom trip'};
 const state=stateFromRows([{slug:'classic-china',is_hidden:1},{slug:'draft-only',draft:JSON.stringify({...custom,slug:'draft-only'})},{slug:custom.slug,published:JSON.stringify(custom)}]);
 assert.equal(new Set(Object.values(state.tours).map(item=>item.group)).size,7);assert(!state.tours['classic-china']&&!state.tours['draft-only']&&!state.tours.homepage);assert.equal(state.tours.baiyun.href,'/silk-road-luxury-trains/baiyun/');assert.equal(state.tours[custom.slug].href,'/journeys/custom-trip/');
 state.layout.styles[0].tours=[slug,custom.slug];state.layout.collections[0].tours=[slug];state.layout.destinations[0].tours=[slug];
 for(const path of ['travel-styles/wildlife','destinations/beijing','signature-journeys'])assert(show(state,path).includes(state.tours[slug].href));
 const hidden=stateFromRows([{slug,is_hidden:1},{slug:'@private-tours-layout',published:JSON.stringify(state.layout)}]);assert(!show(hidden,'travel-styles/wildlife').includes(state.tours[slug].href));
});
