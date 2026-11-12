import test from 'node:test';
import assert from 'node:assert/strict';
import { filterPublishedProducts, sanitizePublicProductCache } from './publishedProducts.js';

test('public catalogue only includes products explicitly marked as published', () => {
  const published = { id: 'published', isPublished: true };
  const hidden = { id: 'hidden', isPublished: false };
  const legacyCacheWithoutFlag = { id: 'unknown' };
  assert.deepEqual(
    filterPublishedProducts([published, hidden, legacyCacheWithoutFlag]),
    [published]
  );
});

test('supports database snake_case publish flag', () => {
  const published = { id: 'published', is_published: true };
  const hidden = { id: 'hidden', is_published: false };
  assert.deepEqual(filterPublishedProducts([published, hidden]), [published]);
});

test('fails closed for malformed or missing catalogue arrays', () => {
  assert.deepEqual(filterPublishedProducts(null), []);
  assert.deepEqual(filterPublishedProducts({ id: 'unknown' }), []);
});

test('public product cache excludes unpublished rows and private purchase costs', () => {
  const published = { id: 'p1', isPublished: true, purchaseCost: 15, purchase_cost: 15, priceGEL: 30 };
  const hidden = { id: 'p2', isPublished: false, purchaseCost: 5 };
  const cached = sanitizePublicProductCache([published, hidden]);
  assert.deepEqual(cached, [{ id: 'p1', priceGEL: 30, isPublished: true }]);
  assert.equal(published.purchaseCost, 15);
});

test('database publish flag takes precedence over a stale camelCase cache flag', () => {
  assert.deepEqual(
    filterPublishedProducts([{ id: 'p1', isPublished: true, is_published: false }]),
    []
  );
});
