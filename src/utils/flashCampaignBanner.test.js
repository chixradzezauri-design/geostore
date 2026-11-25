import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeStorefrontVisualDesign} from './storefrontVisualDesign.js';
import {normalizeFlashCampaignBanner,normalizeFlashCampaignLayout} from './flashCampaignThemes.js';
test('campaign banner and layout use safe optional persisted fields',()=>{
 const d=normalizeStorefrontVisualDesign({flashCampaignBanner:'https://example.com/campaign.webp',flashCampaignLayout:'compact'});
 assert.equal(d.flashCampaignBanner,'https://example.com/campaign.webp');
 assert.equal(d.flashCampaignLayout,'compact');
 assert.deepEqual(normalizeStorefrontVisualDesign(d),d);
 for(const value of ['javascript:alert(1)','http://example.com/a','data:image/svg+xml,x','https://user:pass@example.com/a','//example.com/a'])assert.equal(normalizeFlashCampaignBanner(value),'');
 assert.equal(normalizeFlashCampaignLayout('arbitrary'),'inherit');
 assert.equal(normalizeStorefrontVisualDesign({flashCampaignLayout:'arbitrary'}).flashCampaignLayout,undefined);
});
