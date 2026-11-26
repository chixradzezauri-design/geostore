import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeStorefrontVisualDesign} from './storefrontVisualDesign.js';
import {FLASH_PRODUCT_APPEARANCE,normalizeFlashProductAppearance} from './flashCampaignThemes.js';
test('product appearance choices are independent allowlisted settings and preserve default shape',()=>{
 const baseline=normalizeStorefrontVisualDesign({});
 for(const {key,options} of FLASH_PRODUCT_APPEARANCE){
  for(const [id] of options){
   const d=normalizeStorefrontVisualDesign({[key]:id});
   assert.equal(d[key],id==='inherit'?undefined:id);
   assert.deepEqual(normalizeStorefrontVisualDesign(d),d);
   for(const other of FLASH_PRODUCT_APPEARANCE.filter(x=>x.key!==key))assert.equal(d[other.key],undefined);
  }
  assert.deepEqual(normalizeStorefrontVisualDesign({[key]:'unsafe-value'}),baseline);
 }
 assert.equal(normalizeFlashProductAppearance('__proto__','gold'),'inherit');
 const d=normalizeStorefrontVisualDesign({flashCardStyle:'soft',flashDiscountStyle:'ticket',flashButtonStyle:'outline',flashTimerStyle:'digital'});
 assert.equal(d.flashCardStyle,'soft');assert.equal(d.flashDiscountStyle,'ticket');assert.equal(d.flashButtonStyle,'outline');assert.equal(d.flashTimerStyle,'digital');
});
test('premium appearance styles keep original product action and disabled stock guard',()=>{
 const view=readFileSync(new URL('../components/StoreView.jsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../storefrontVideoRedesign.css',import.meta.url),'utf8');
 for(const [key,attr] of [['flashCardStyle','card'],['flashDiscountStyle','discount'],['flashButtonStyle','button']]){
  assert.ok(view.includes('data-flash-'+attr+'-style='));
  for(const [id] of FLASH_PRODUCT_APPEARANCE.find(g=>g.key===key).options.slice(1))assert.ok(css.includes('data-flash-'+attr+'-style="'+id+'"'));
 }
 assert.match(view, /const availableStock = getProductAvailableStock\(prod\)/);
 assert.match(view, /disabled=\{availableStock <= 0\}/);
 assert.ok(view.includes('addToCart(prod)'));
 assert.ok(css.includes('.gs-video-flash-add:disabled'));
});
