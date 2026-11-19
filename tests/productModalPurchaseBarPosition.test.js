import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');
const store = await readFile(new URL('../src/components/StoreView.jsx', import.meta.url), 'utf8');

test('product purchase bar overrides earlier relative positioning and remains pinned to the dialog bottom', () => {
  const selector = '.geostore-fashion-store .geostore-storefront .gs-product-modal-purchase-bar';
  const selectorIndex = css.lastIndexOf(selector);
  assert.ok(selectorIndex >= 0, 'final purchase-bar override exists');
  const ruleEnd = css.indexOf('}', selectorIndex);
  const rule = css.slice(selectorIndex, ruleEnd);
  assert.match(rule, /position:\\s*absolute\\s*!important/);
  assert.match(rule, /inset:\\s*auto 0 0 0\\s*!important/);
  assert.match(rule, /z-index:\\s*30\\s*!important/);
});

test('pinned purchase bar keeps content clear of the action and mobile safe area', () => {
  const bodySelector = '.geostore-fashion-store .geostore-storefront .gs-product-modal-body';
  const bodyIndex = css.lastIndexOf(bodySelector);
  assert.ok(bodyIndex >= 0);
  const bodyRule = css.slice(bodyIndex, css.indexOf('}', bodyIndex));
  assert.match(bodyRule, /padding-bottom:\\s*max\\(104px, calc\\(78px \\+ env\\(safe-area-inset-bottom\\)\\)\\)\\s*!important/);
  assert.ok(store.includes('gs-product-modal-purchase-bar absolute bottom-0 left-0 right-0'));
  assert.ok(store.includes('disabled={currentAvailableStock <= 0'));
  assert.ok(store.includes('addToCart({'));
  assert.ok(store.includes('customVariantId: selectedInventoryVariant?.id || null'));
  assert.ok(store.includes('selectedSize: availableSizesForSelectedColor.length > 0 && selectedSize ? selectedSize : null'));
});
