import test from 'node:test';
import assert from 'node:assert/strict';
import {stateFromRows,validLayout} from '../lib/content/private-layout.mjs';
import {privatePage} from '../lib/content/private-pages.mjs';
import {catalog,renderContent} from '../lib/content/catalog-product.mjs';
import {videoFrameUrl} from '../lib/content/video.mjs';

test('guide draft renders existing day copy, edited video and a single planning footer',()=>{
 const state=stateFromRows([]);
 const guide=state.layout.destinations.find(item=>item.id==='guizhou');
 guide.image='/assets/guizhou-film-cover.webp';
 guide.story.body='Day 1 · Guiyang\nMeet the team.\n\nDay 2 · Kaili\nContinue to Kaili.';
 guide.editorial={videoTitle:'Travel film',videoUrl:'https://example.test/travel-film.mp4',ctaTitle:'Make this your own'};
 assert(validLayout(state.layout));
 const saved=stateFromRows([{slug:'@private-tours-layout',published:JSON.stringify(state.layout)}]);
 const html=privatePage(saved,new URL('https://example.test/private-china-tours/destinations/guizhou/'));
 assert.match(html,/class="pt-days"/);
 assert.equal((html.match(/Continue to Kaili\./g)||[]).length,1);
 assert.match(html,/class="pt-film"><h2>Travel film<\/h2><div class="pt-film-player">/);
 assert.match(html,/poster="\/assets\/guizhou-film-cover\.webp"/);
 assert.match(html,/<video[^>]*poster="\/assets\/guizhou-film-cover\.webp"/);
 assert(html.indexOf('class="pt-banner"')<html.indexOf('class="pt-film"'));
 assert(html.indexOf('class="pt-film"')<html.indexOf('id="story"'));
 assert.equal((html.match(/class="final-cta pt-ending"/g)||[]).length,1);
 assert.match(html,/Make this your own/);
 assert.match(html,/class="footer-top"/);
 guide.editorial.videoUrl='invalid';assert.equal(validLayout(state.layout),false);
});

test('signature route and daily descriptions respect the saved product',()=>{
 const product={...catalog['icons-natural-wonders'].product,privateEditorial:{route:'One\nTwo',days:'Day 1 · A first stop\nTravel description.',videoUrl:'https://youtu.be/abcdefghijk',ctaButton:'Enquire now'}};
 const html=renderContent(product,'https://example.test');
 assert.match(html,/<small>01<\/small>One/);
 assert.match(html,/<summary><small>DAY 01<\/small>A first stop/);
 assert.match(html,/Travel description\./);assert.match(html,/Enquire now/);
 assert(html.indexOf('class="pt-banner"')<html.indexOf('class="pt-film"'));
 assert(html.indexOf('class="pt-film"')<html.indexOf('class="pt-route"'));
});

test('restored destination players use only approved embed domains',()=>{
 assert.equal(videoFrameUrl('https://v.qq.com/txp/iframe/player.html?vid=z0973m92vq9'),'https://v.qq.com/txp/iframe/player.html?vid=z0973m92vq9');
 assert.match(videoFrameUrl('https://v-hls.chinadaily.com/player/player.html?src=test'),/^https:\/\/v-hls\.chinadaily\.com\//);
 assert.equal(videoFrameUrl('https://example.test/player.html'),'');
});

test('Yunnan gallery closes before the caption and the standalone film',()=>{
 const product={...catalog['yunnan-slow-journey'].product,videoUrl:'',galleryUnified:true,
  gallery:[{src:'/media/forest.webp',alt:'Forest'},{src:'/media/tea.webp',alt:'Tea'}],
  privateEditorial:{videoUrl:'https://example.test/yunnan.mp4'}};
 const html=renderContent(product,'https://example.test');
 assert.match(html,/Next photo">→<\/button><\/div><\/div><\/div><div class="pt-caption">/);
 assert.match(html,/<\/a><\/div><\/div><div id="journey-overview"><\/div><section class="pt-film">/);
 assert.match(html,/<source src="https:\/\/example\.test\/yunnan\.mp4"/);
});
