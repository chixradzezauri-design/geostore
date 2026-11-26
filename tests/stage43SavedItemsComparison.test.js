import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const compare=readFileSync(new URL('../src/components/ProductCompareModal.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/designSystemV2.css',import.meta.url),'utf8');
const browser=readFileSync(new URL('./browser/responsiveLayout.mjs',import.meta.url),'utf8');
test('Stage 43: wishlist removal, correct starting prices, and variant-safe storefront navigation',()=>{
  assert.match(app,/handleFindSavedProduct = \(product\) =>/);
  assert.match(app,/setRequestedSavedProductId\(String\(currentProduct\.id\)\)/);
  assert.match(app,/onClick=\{\(\) => handleAddSavedProduct\(savedProd\)\}/);
  assert.match(app,/onClick=\{\(\) => toggleWishlist\(savedProd\)\}/);
  assert.match(app,/getProductAvailableStock\(prod\) <= 0/);
  assert.match(app,/const savedPrice = liveProduct \? getProductStartingPrice\(prod\) : null/);
  assert.match(app,/savedPrice === null \? '—' : formatPrice\(savedPrice\)/);
  assert.match(compare,/const price = liveProduct \? getProductStartingPrice\(prod\) : null/);
});
test('Stage 43: comparison modal focus, keyboard closure, clear and variant/stock safety',()=>{
  assert.match(compare,/role="dialog" aria-modal="true"/);
  assert.match(compare,/ref=\{closeButtonRef\}/);
  assert.match(compare,/event\.key === 'Escape'/);
  assert.match(compare,/event\.key === 'Tab'/);
  assert.match(compare,/returnFocus\.focus\(\)/);
  assert.match(compare,/setComparisonList\(\[\]\)/);
  assert.match(compare,/onFindProduct\?\.\(savedProd\) : addToCart\(prod\)/);
  assert.match(compare,/disabled=\{!liveProduct \|\| getProductAvailableStock\(prod\) <= 0\}/);
});
test('Stage 43: measured responsive wishlist and compare control sizes and horizontal comparison scroll',()=>{
  assert.match(css,/Stage 43 — saved-list \/ comparison/);
  assert.match(browser,/stage43Fixture/);
  assert.match(browser,/saved\.controlsMinHeight >= 43/);
  assert.match(browser,/saved\.compareControlsMinHeight >= 43/);
  assert.match(browser,/saved\.scrollWidth > saved\.clientWidth/);
});
