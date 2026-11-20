import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');
const store = await readFile(new URL('../src/components/StoreView.jsx', import.meta.url), 'utf8');

test('Flash Sale heading and badge use a stable, shrink-safe layout', () => {
  const stage46 = css.slice(css.lastIndexOf('GEOSTORE STOREFRONT — STAGE 46'));
  assert.match(stage46, /\.gs-flash-sale-section > div:first-child\s*\{[^}]*display:\s*grid\s*!important;[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto\s*!important;/s);
  assert.match(stage46, /h3 > span\s*\{[^}]*display:\s*inline-flex\s*!important;[^}]*max-width:\s*100%\s*!important;/s);
  assert.match(stage46, /@media \(max-width: 640px\)[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\)\s*!important;[\s\S]*?h3 > span/);
  assert.match(stage46, /@media \(max-width: 370px\)/);
});

test('Flash Sale copy, countdown and product data remain connected to existing source', () => {
  assert.match(store, /aria-labelledby="gs-flash-sale-title"/);
  assert.match(store, /\{visualCopy\.flashSaleBadge \|\| storeText\.limitedOffer\}/);
  assert.match(store, /\{visualCopy\.flashSaleSubtitle \|\| storeText\.hurryDiscount\}/);
  assert.match(store, /getFlashSaleCountdown\(flashSaleEndAt, flashSaleClock\)/);
  assert.match(store, /flashSaleProducts\.map\(prod =>/);
  assert.match(store, /getActiveFlashSaleProducts\(activeProducts, flashSaleClock\)/);
});
