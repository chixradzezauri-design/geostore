import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeStorefrontVisualDesign} from './storefrontVisualDesign.js';
import {FLASH_TIMER_STYLES,normalizeFlashTimerStyle,normalizeFlashTimerMotion} from './flashCampaignThemes.js';
test('timer modes persist independently without changing default normalized settings',()=>{
 const baseline=normalizeStorefrontVisualDesign({});
 for(const style of FLASH_TIMER_STYLES){
  const design=normalizeStorefrontVisualDesign({flashTimerStyle:style.id,flashTimerMotion:'reveal'});
  assert.equal(design.flashTimerStyle,style.id==='inherit'?undefined:style.id);
  assert.equal(design.flashTimerMotion,'reveal');
  assert.deepEqual(normalizeStorefrontVisualDesign(design),design);
 }
 assert.deepEqual(normalizeStorefrontVisualDesign({flashTimerStyle:'bad',flashTimerMotion:'infinite'}),baseline);
 assert.equal(normalizeFlashTimerStyle(null),'inherit');
 assert.equal(normalizeFlashTimerMotion(null),'none');
});
test('timer preserves live deadline logic and reduced-motion rule',()=>{
 const view=readFileSync(new URL('../components/StoreView.jsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../storefrontVideoRedesign.css',import.meta.url),'utf8');
 assert.match(view,/getFlashSaleCountdown\(flashSaleEndAt, flashSaleClock\)/);
 assert.match(view,/data-flash-timer-style=/);
 assert.match(view,/role="timer" aria-live="off"/);
 for(const mode of ['outline','pills','digital'])assert.ok(css.includes('data-flash-timer-style="'+mode+'"'));
 assert.ok(css.includes('prefers-reduced-motion:reduce'));
 assert.ok(css.includes('gs-flash-timer-reveal 240ms ease-out 1'));
});
