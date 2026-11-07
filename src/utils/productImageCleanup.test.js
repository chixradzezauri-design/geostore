import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProductImageList, collectReferencedProductImageUrls, shouldCleanupUploadedProductImages, shouldRetainProductImagesForOrderHistory } from './productImageCleanup.js';

test('normalizes array gallery and preserves fallback main image without duplicates', () => {
  assert.deepEqual(normalizeProductImageList(' https://cdn.test/main.jpg ', [
    'https://cdn.test/main.jpg', ' https://cdn.test/detail.jpg ', null
  ]), ['https://cdn.test/main.jpg', 'https://cdn.test/detail.jpg']);
});

test('normalizes serialized and single-string galleries', () => {
  assert.deepEqual(normalizeProductImageList('', '["https://cdn.test/a.jpg","https://cdn.test/b.jpg"]'), [
    'https://cdn.test/a.jpg', 'https://cdn.test/b.jpg'
  ]);
  assert.deepEqual(normalizeProductImageList(null, ' https://cdn.test/a.jpg '), ['https://cdn.test/a.jpg']);
});

test('collects image and gallery URLs from other products only', () => {
  const referenced = collectReferencedProductImageUrls([
    { id: 'product-a', image: 'https://cdn.test/a.jpg', gallery: ['https://cdn.test/b.jpg'] },
    { id: 'product-b', image: 'https://cdn.test/shared.jpg', gallery: ['https://cdn.test/c.jpg'] }
  ], 'product-a');
  assert.deepEqual([...referenced].sort(), ['https://cdn.test/c.jpg', 'https://cdn.test/shared.jpg']);
});

test('ignores missing products and malformed gallery fields', () => {
  const referenced = collectReferencedProductImageUrls([
    null,
    { id: 'product-b', image: '', gallery: 'not-an-array' },
    { id: 'product-c', image: ' https://cdn.test/image.jpg ', gallery: null }
  ], 'product-a');
  assert.deepEqual([...referenced], ['https://cdn.test/image.jpg']);
});

test('returns an empty set for an invalid product list', () => {
  assert.equal(collectReferencedProductImageUrls(null, 'product-a').size, 0);
});

test('cleans newly uploaded images only when product write is known not committed', () => {
  assert.equal(shouldCleanupUploadedProductImages('not-started'), true);
  assert.equal(shouldCleanupUploadedProductImages('rejected'), true);
  assert.equal(shouldCleanupUploadedProductImages('unknown'), false);
  assert.equal(shouldCleanupUploadedProductImages('committed'), false);
});

test('retains product images whenever order history exists', () => {
  assert.equal(shouldRetainProductImagesForOrderHistory([]), false);
  assert.equal(shouldRetainProductImagesForOrderHistory([{ id: 'order-1' }]), true);
  assert.equal(shouldRetainProductImagesForOrderHistory([{ id: 'order-1' }, { id: 'order-2' }]), true);
  assert.equal(shouldRetainProductImagesForOrderHistory(null), false);
});
