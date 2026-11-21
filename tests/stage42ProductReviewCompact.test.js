import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const store = readFileSync(new URL('../src/components/StoreView.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/designSystemV2.css', import.meta.url), 'utf8');
const browser = readFileSync(new URL('./browser/responsiveLayout.mjs', import.meta.url), 'utf8');
test('Stage 42 reviews are discoverable with a native collapsible summary and preserve submission/storage flow',()=>{
  assert.match(store, /<details className="gs-product-review-entry">/);
  assert.match(store, /<summary className="gs-product-review-entry-toggle/);
  assert.match(store, /<form onSubmit=\{\(e\) => handleAddReview\(e, selectedProduct\.id\)\}/);
  assert.match(store, /<section className="gs-product-reviews/);
  assert.match(store, /setAllReviews\(prev => \{/);
  assert.match(browser, /reviewCollapsedInitially/);
  assert.match(browser, /await reviewEntry\.locator\('summary'\)\.click\(\)/);
});
test('Stage 42 review form inputs have accessible names and keyboard-operable file upload',()=>{
  assert.match(store, /htmlFor="gs-product-review-rating"/);
  assert.match(store, /id="gs-product-review-rating"/);
  assert.match(store, /aria-label=\{storeText\.yourName\}/);
  assert.match(store, /aria-label=\{storeText\.reviewPlaceholder\}/);
  assert.match(store, /gs-product-review-file-input sr-only/);
  assert.match(store, /dialog\.querySelectorAll\('button:not\(\[disabled\]\), summary,/);
  assert.match(css, /gs-product-review-upload label:focus-within/);
});
test('Stage 42 preserves editable product descriptions, protects long text and avoids mobile iOS zoom',()=>{
  assert.match(store, /<section aria-label=\{storeText\.description\} className="gs-product-description-panel/);
  assert.match(store, /data-visual-editor-target="product\.detail\.description"/);
  assert.match(store, /gs-product-detail-specs.*aria-label=/);
  assert.match(css, /Stage 42 — compact, keyboard-accessible details and review submission/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.match(browser, /ratingFont >= 16 && fieldFont >= 16/);
});
