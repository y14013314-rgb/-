import test from 'node:test';
import assert from 'node:assert/strict';
import {entryFor,renderContent,validateContent} from '../lib/content/catalog-product.mjs';
import {railInquiryCopy} from '../lib/content/cruise-inquiry.mjs';

const origin='https://sukhatrip.com';
const photos=['salon','suite'].map(name=>({src:`/assets/${name}.webp`,alt:name,credit:''}));
for(const slug of ['baiyun','chengdu','jinxiu-dongfang','jinxiu-tianfu']){
 test(`${slug} and its copies share the rail inquiry and optional gallery`,()=>{
  const seed=entryFor(slug).product;
  assert.match(renderContent(seed,origin),/section rail-film/);
  const copy={...seed,templateSlug:slug,slug:'new-train',title:'New & scenic',railMedia:'gallery',railPhotos:photos};
  if(copy.film)copy.film={...copy.film,src:'',poster:''};
  else copy.videoUrl='';
  validateContent(copy);
  const html=renderContent(copy,origin);
  assert.equal(html.match(/id="cruise-inquiry"/g).length,1);
  assert(html.indexOf('id="cruise-inquiry"')<html.indexOf('class="final-cta"'));
  assert.match(html,/Train: <strong id="cruise-ship">New &amp; scenic/);
  assert.match(html,/class="tour-photo-track"/);
  assert.doesNotMatch(html,/section rail-film/);
  const custom={...copy,inquiryCopy:{...railInquiryCopy,heading:'Plan your rail escape',cabinExample:'e.g. A private cabin for two'}};
  const customHtml=renderContent(custom,origin);
  assert.match(customHtml,/>Plan your rail escape<\/h3>/);
  assert.match(customHtml,/placeholder="e\.g\. A private cabin for two"/);
  assert.throws(()=>validateContent({...copy,railPhotos:[]}));
  assert.throws(()=>validateContent({...copy,railPhotos:[{...photos[0],src:'bad'}]}));
  assert.throws(()=>validateContent({...copy,inquiryCopy:{heading:'Only this'}}));
 });
}
