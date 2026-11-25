import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeStorefrontVisualDesign} from './storefrontVisualDesign.js';
import {normalizeFlashCampaignBanner,normalizeFlashCampaignLayout,normalizeFlashBannerAppearance,flashBannerStyle} from './flashCampaignThemes.js';
test('campaign banner and layout use safe optional persisted fields',()=>{
 const d=normalizeStorefrontVisualDesign({flashCampaignBanner:'https://example.com/campaign.webp',flashCampaignLayout:'compact'});
 assert.equal(d.flashCampaignBanner,'https://example.com/campaign.webp');
 assert.equal(d.flashCampaignLayout,'compact');
 assert.deepEqual(normalizeStorefrontVisualDesign(d),d);
 for(const value of ['javascript:alert(1)','http://example.com/a','data:image/svg+xml,x','https://user:pass@example.com/a','//example.com/a'])assert.equal(normalizeFlashCampaignBanner(value),'');
 assert.equal(normalizeFlashCampaignLayout('arbitrary'),'inherit');
 assert.equal(normalizeStorefrontVisualDesign({flashCampaignLayout:'arbitrary'}).flashCampaignLayout,undefined);
});

test('banner upload accepts bounded raster data but rejects SVG and oversized values',()=>{
 const img='data:image/png;base64,YQ==';
 assert.equal(normalizeFlashCampaignBanner(img),img);
 assert.equal(normalizeFlashCampaignBanner('data:image/svg+xml;base64,YQ=='),'');
 assert.equal(normalizeFlashCampaignBanner('data:image/png;base64,'+'A'.repeat(1400001)),'');
 assert.deepEqual(normalizeStorefrontVisualDesign({flashCampaignBanner:img}).flashCampaignBanner,img);
});
test('banner controls retain independent viewport heights and reject unsafe CSS',()=>{
 const input={desktopHeight:200,tabletHeight:150,mobileHeight:100,positionX:30,positionY:80,radius:12,fit:'contain',placement:'above'};
 const d=normalizeStorefrontVisualDesign({flashBannerAppearance:input});
 assert.deepEqual(d.flashBannerAppearance,input);
 assert.deepEqual(normalizeStorefrontVisualDesign(d),d);
 assert.equal(flashBannerStyle(input,'mobile').height,'100px');
 assert.equal(flashBannerStyle(input,'tablet').height,'150px');
 assert.equal(flashBannerStyle(input,'desktop').objectPosition,'30% 80%');
 assert.equal(flashBannerStyle({desktopHeight:160},'mobile').height,'160px');
 assert.deepEqual(normalizeFlashBannerAppearance({mobileHeight:-1,fit:'url(evil)',radius:90,positionX:'20'}),{mobileHeight:80,radius:32});
 assert.deepEqual(flashBannerStyle({},'mobile'),{});
});
