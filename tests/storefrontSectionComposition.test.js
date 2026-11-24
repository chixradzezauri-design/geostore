import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeStorefrontVisualDesign,getStorefrontSectionOrder,setStorefrontSectionOrder,inheritStorefrontSectionOrder,storefrontViewportForWidth,buildStorefrontVisualStyle} from '../src/utils/storefrontVisualDesign.js';
const base=['hero','banners','flashSale','categories','filters','products'],mobile=['categories','products','filters','hero','flashSale','banners'];
test('mobile order is isolated, persists, and can inherit desktop again',()=>{
 const d=normalizeStorefrontVisualDesign({copy:{heroButton:'Keep'},productOrder:['sku']});
 const changed=setStorefrontSectionOrder(d,'mobile',mobile);
 assert.deepEqual(getStorefrontSectionOrder(changed,'desktop'),base);
 assert.deepEqual(getStorefrontSectionOrder(changed,'tablet'),base);
 assert.deepEqual(getStorefrontSectionOrder(normalizeStorefrontVisualDesign(JSON.parse(JSON.stringify(changed))),'mobile'),mobile);
 assert.deepEqual(changed.copy,d.copy);assert.deepEqual(changed.productOrder,d.productOrder);assert.deepEqual(changed.sections,d.sections);
 assert.equal(buildStorefrontVisualStyle(changed,'mobile')['--gs-order-categories'],'1');
 assert.deepEqual(getStorefrontSectionOrder(inheritStorefrontSectionOrder(changed,'mobile'),'mobile'),base);
});
test('invalid permutations fail closed and breakpoints are consistent',()=>{
 assert.equal(setStorefrontSectionOrder({},'tablet',['hero','hero']),null);
 assert.deepEqual(getStorefrontSectionOrder({sectionOrder:['products'],responsive:{mobile:{sectionOrder:['hero','unknown']}}},'mobile'),['products','hero','banners','flashSale','categories','filters']);
 assert.deepEqual([640,641,1023,1024].map(storefrontViewportForWidth),['mobile','tablet','tablet','desktop']);
 const d=normalizeStorefrontVisualDesign({responsive:{mobile:{sectionOrder:['unknown']}}});assert.equal(d.responsive.mobile.sectionOrder,undefined);
});
test('renderer groups keep modal out of reorder and render actual DOM order',()=>{
 const src=readFileSync(new URL('../src/components/StoreView.jsx',import.meta.url),'utf8');
 assert.match(src,/sectionOrder\.map\(id=><React\.Fragment key=\{id\}>/);
 assert.ok(src.indexOf('const sectionGroups')<src.indexOf('data-gs-dom-order="true"'));
 assert.ok(src.indexOf('data-gs-dom-order="true"')<src.indexOf('100% SMOOTH & FIXED PRODUCT DETAIL MODAL'));
 for(const slot of ['hero','banners','flash-sale','categories','filters','products'])assert.equal(src.split("renderCustomSections('after-"+slot+"')").length,2);
});
