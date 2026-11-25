import test from 'node:test';
import assert from 'node:assert/strict';
import { FLASH_CAMPAIGN_COPY_PRESETS, applyFlashCampaignCopyPreset } from './flashCampaignCopy.js';
import { normalizeStorefrontVisualDesign } from './storefrontVisualDesign.js';

test('campaign copy presets change only three shared copy keys',()=>{
 const before=normalizeStorefrontVisualDesign({copy:{heroButton:'Shop',flashSaleTitle:'Custom'},sections:{flashSale:false},productOrder:['p1'],responsive:{mobile:{layout:{productColumns:2}}}});
 for(const preset of FLASH_CAMPAIGN_COPY_PRESETS){
   const after=applyFlashCampaignCopyPreset(before,preset.id);
   assert.deepEqual(after,{...before,copy:{...before.copy,flashSaleTitle:preset.title,flashSaleBadge:preset.badge,flashSaleSubtitle:preset.description}});
   assert.deepEqual(applyFlashCampaignCopyPreset(after,preset.id),after);
 }
 assert.deepEqual(applyFlashCampaignCopyPreset(before,'invalid'),before);
 assert.deepEqual(applyFlashCampaignCopyPreset(before,'reset'),{...before,copy:{...before.copy,flashSaleTitle:'',flashSaleBadge:'',flashSaleSubtitle:''}});
});
