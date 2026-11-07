import test from 'node:test';
import assert from 'node:assert/strict';
import { hasProductMutationLock } from './productMutationSafety.js';

test('detects a product field update lock', () => {
  assert.equal(hasProductMutationLock(new Set(['priceGEL:product-1']), 'product-1'), true);
  assert.equal(hasProductMutationLock(new Set(['priceGEL:product-1']), 'product-2'), false);
});

test('detects a custom variant stock lock for its parent product', () => {
  assert.equal(hasProductMutationLock(new Set(['variant-stock:product-1:variant-7']), 'product-1'), true);
  assert.equal(hasProductMutationLock(new Set(['variant-stock:product-1:variant-7']), 'product-2'), false);
});

test('does not treat similarly suffixed product ids as the same product', () => {
  assert.equal(hasProductMutationLock(new Set(['stock:product-12']), 'product-2'), false);
});

test('fails closed for missing lock collections or product ids', () => {
  assert.equal(hasProductMutationLock(null, 'product-1'), false);
  assert.equal(hasProductMutationLock(new Set(['stock:product-1']), ''), false);
});


test('builds an encoded optimistic version filter from a valid timestamp', () => {
  assert.equal(
    buildProductVersionFilter('2026-11-08T01:00:00.000Z'),
    'updated_at=eq.2026-11-08T01%3A00%3A00.000Z'
  );
});

test('rejects missing or invalid product version tokens', () => {
  assert.equal(buildProductVersionFilter(null), null);
  assert.equal(buildProductVersionFilter(''), null);
  assert.equal(buildProductVersionFilter('not-a-date'), null);
});
