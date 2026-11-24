import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findCurrentSavedProduct } from '../src/utils/savedProductNavigation.js';
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const store=readFileSync(new URL('../src/components/StoreView.jsx',import.meta.url),'utf8');
const compare=readFileSync(new URL('../src/components/ProductCompareModal.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/designSystemV2.css',import.meta.url),'utf8');
const browser=readFileSync(new URL('./browser/responsiveLayout.mjs',import.meta.url),'utf8');

test('Stage 44: resolve saved products only by current catalog ID, not cached name/stock', () => {
  const products=[{id:12,name:'New name',stock:0},{id:'20',name:'Choice',stock:8}];
  assert.equal(findCurrentSavedProduct(products,{id:'12',name:'Old name',stock:99}),products[0]);
  assert.equal(findCurrentSavedProduct(products,{id:20,name:'Older',stock:4}),products[1]);
  assert.equal(findCurrentSavedProduct(products,{id:21,name:'Choice'}),null);
  assert.equal(findCurrentSavedProduct(products,{name:'Choice'}),null);
  assert.equal(findCurrentSavedProduct([], {id:12}),null);
  assert.equal(findCurrentSavedProduct(null,{id:12}),null);
  assert.equal(findCurrentSavedProduct(products,null),null);
});
test('Stage 44: wishlist actions use canonical catalog stock and preserve removal of saved item', () => {
  assert.match(app,/findCurrentSavedProduct\(products, savedProd\)/);
  assert.match(app,/disabled=\{!liveProduct \|\| getProductAvailableStock\(prod\) <= 0\}/);
  assert.match(app,/handleAddSavedProduct = \(savedProduct\) =>/);
  assert.match(app,/hasProductVariantOptions\(currentProduct\) \? handleFindSavedProduct\(currentProduct\) : addToCart\(currentProduct\)/);
  assert.match(app,/onClick=\{\(\) => toggleWishlist\(savedProd\)\}/);
  assert.match(app,/className="gs-wishlist-detail-link/);
  assert.match(app,/setSearchQuery\(''\)/);
  assert.match(app,/setRequestedSavedProductId\(String\(currentProduct\.id\)\)/);
});
test('Stage 44: direct saved-product ID request opens existing option dialog then is consumed', () => {
  assert.match(app,/requestedSavedProductId=\{requestedSavedProductId\}/);
  assert.match(app,/onSavedProductRequestHandled=\{setRequestedSavedProductId\}/);
  assert.match(store,/requestedSavedProductId = null/);
  assert.match(store,/activeProducts\.find\(product => String\(product\?\.id\) === String\(requestedSavedProductId\)\)/);
  assert.match(store,/if \(currentProduct\) handleOpenProduct\(currentProduct\)/);
  assert.match(store,/onSavedProductRequestHandled\?\.\(null\)/);
});
test('Stage 44: comparison uses live catalog data and keyboard-sized native detail controls', () => {
  assert.match(compare,/findCurrentSavedProduct\(catalogProducts, savedProd\)/);
  assert.match(compare,/disabled=\{!liveProduct \|\| getProductAvailableStock\(prod\) <= 0\}/);
  assert.match(compare,/className="gs-product-compare-detail-link text-left"/);
  assert.match(compare,/onFindProduct\?\.\(savedProd\)/);
  assert.match(css,/Stage 44 — direct saved-product detail navigation/);
  assert.match(browser,/saved\.detailActionCount === 5/);
  assert.match(browser,/saved\.detailActionMinHeight >= 43/);
});
