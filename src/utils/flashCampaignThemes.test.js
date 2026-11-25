import test from 'node:test';
import assert from 'node:assert/strict';
import { FLASH_CAMPAIGN_THEMES, normalizeFlashCampaignTheme } from './flashCampaignThemes.js';
import { normalizeStorefrontVisualDesign } from './storefrontVisualDesign.js';
import { readFileSync } from 'node:fs';

test('campaign themes preserve unrelated visual settings and reject arbitrary CSS',()=>{
 const before=normalizeStorefrontVisualDesign({signature2026:true,copy:{flashSaleTitle:'Black Friday'},elementStyles:{flashSale:{backgroundColor:'#123456'}},sections:{flashSale:false}});
 for(const theme of FLASH_CAMPAIGN_THEMES){
   const after=normalizeStorefrontVisualDesign({...before,flashCampaignTheme:theme.id});
   assert.deepEqual(after,theme.id==='inherit'?before:{...before,flashCampaignTheme:theme.id});
   assert.deepEqual(normalizeStorefrontVisualDesign(after),after);
 }
 for(const invalid of ['unknown','url(https://example.com)',null,{},'__proto__']){
   assert.equal(normalizeFlashCampaignTheme(invalid),'inherit');
   assert.deepEqual(normalizeStorefrontVisualDesign({...before,flashCampaignTheme:invalid}),before);
 }
});

test('all campaign palettes are bound to the actual flash section and existing editor commit flow',()=>{
 const css=readFileSync(new URL('../storefrontVideoRedesign.css',import.meta.url),'utf8');
 const view=readFileSync(new URL('../components/StoreView.jsx',import.meta.url),'utf8');
 const editor=readFileSync(new URL('../components/StorefrontVisualEditor.jsx',import.meta.url),'utf8');
 for(const theme of FLASH_CAMPAIGN_THEMES.filter(t=>t.id!=='inherit')) assert.ok(css.includes('[data-flash-campaign-theme="'+theme.id+'"]'));
 assert.ok(view.includes('data-flash-campaign-theme={normalizeFlashCampaignTheme'));
 assert.ok(editor.includes('commitDesign({...designRef.current,flashCampaignTheme:theme.id})'));
 assert.ok(css.includes('var(--gs-video-explicit-backgroundColor,var(--gs-video-flashSale-backgroundColor,var(--gs-campaign-bg)))'));
});
