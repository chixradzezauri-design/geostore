import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeStorefrontVisualDesign,buildStorefrontElementStyle,withStorefrontVideoTokens} from './storefrontVisualDesign.js';

const targets=["flashSale.card","flashSale.image","flashSale.timer","flashSale.discount","flashSale.button"];
test('campaign-specific styles persist and inherit independently across viewports',()=>{
 const elementStyles=Object.fromEntries(targets.map(id=>[id,{backgroundColor:'#123456',textColor:'#ffffff',fontSize:16,borderRadius:12}]));
 const d=normalizeStorefrontVisualDesign({flashCampaignTheme:'black-friday',elementStyles,responsive:{mobile:{elementStyles:{'flashSale.button':{fontSize:20}}}}});
 assert.deepEqual(normalizeStorefrontVisualDesign(d),d);
 for(const id of targets){
   const style=withStorefrontVideoTokens(buildStorefrontElementStyle(d,id,'desktop'),id);
   assert.equal(style.backgroundColor,'#123456');
   assert.equal(style['--gs-video-'+id.replaceAll('.','-')+'-color'],'#ffffff');
   assert.equal(style.fontSize,'16px');
 }
 assert.equal(buildStorefrontElementStyle(d,'flashSale.button','mobile').fontSize,'20px');
 assert.equal(buildStorefrontElementStyle(d,'flashSale.timer','mobile').fontSize,'16px');
 assert.equal(buildStorefrontElementStyle(d,'product.button','desktop').backgroundColor,undefined);
});
test('all new campaign targets are wired in editor, storefront and scoped CSS',()=>{
 const view=readFileSync(new URL('../components/StoreView.jsx',import.meta.url),'utf8');
 const editor=readFileSync(new URL('../components/StorefrontVisualEditor.jsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../storefrontVideoRedesign.css',import.meta.url),'utf8');
 for(const id of targets){
   assert.ok(view.includes('data-visual-editor-target="'+id+'" style={videoElementStyle(\''+id+'\')}'));
   assert.ok(editor.includes("'"+id+"': { label:"));
   assert.ok(css.includes('[data-visual-editor-target="'+id+'"][style*='));
 }
 assert.equal((view.match(/data-visual-editor-target="flashSale.timer"/g)||[]).length,3);
});
