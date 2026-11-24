import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const css=read('src/storefrontVideoRedesign.css'),store=read('src/components/StoreView.jsx'),modals=read('src/components/Modals.jsx');
test('video 01 keeps size tools separate from size grid and existing actions',()=>{
 for(const term of ['gs-video-size-heading','gs-video-size-tools','setIsSmartSizeModalOpen(true)','setIsSizeGuideOpen(true)','setSelectedSize(size)','aria-pressed={selectedSize === size}'])assert.ok(store.includes(term),term);
 assert.ok(css.includes('flex: 1 1 120px !important'));
 assert.ok(css.includes('writing-mode: horizontal-tb !important'));
});
test('video 01 removes flash image blending and preserves click handlers and tracking lookup',()=>{
 assert.ok(store.includes('gs-video-flash-image'));
 assert.ok(store.includes('handleOpenProduct(prod, event.currentTarget)'));
 assert.ok(css.includes('mix-blend-mode: normal !important'));
 for(const term of ['aria-labelledby="gs-video-tracker-title"','onSubmit={handleSearchOrder}','lookupOrderForTracking(cleanId, cleanPhone)','setSearchOrderPhone(e.target.value)'])assert.ok(modals.includes(term),term);
 assert.ok(css.includes('var(--gs-ink, #302820)'));
 assert.ok(css.includes('var(--gs-button-text, #fffaf3)'));
});
test('storefront video overrides load after prior layers; previews disabled only on working branches',()=>{
 const main=read('src/main.jsx');assert.ok(main.indexOf("import './storefrontVideoRedesign.css'")>main.indexOf("import './videoAuditMobileAdmin.css'"));
 assert.ok(css.includes('.geostore-shell.geostore-fashion-store'));
 const cfg=JSON.parse(read('vercel.json'));assert.equal(cfg.git.deploymentEnabled['internal-storefront-video-redesign-2026-11-24'],false);assert.notEqual(cfg.git.deploymentEnabled.main,false);
});
