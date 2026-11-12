import test from 'node:test';
import assert from 'node:assert/strict';
import { collectReferencedProductImageUrls, collectReferencedProductImagePaths, collectReferencedLegacyMessageImageUrls } from './productImageCleanup.js';

test('collects image and gallery URLs from other products only', () => {
  const referenced = collectReferencedProductImageUrls([
    { id: 'product-a', image: 'https://cdn.test/a.jpg', gallery: ['https://cdn.test/b.jpg'] },
    { id: 'product-b', image: 'https://cdn.test/shared.jpg', gallery: ['https://cdn.test/c.jpg'] }
  ], 'product-a');

  assert.deepEqual([...referenced].sort(), [
    'https://cdn.test/c.jpg',
    'https://cdn.test/shared.jpg'
  ]);
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


test('matches the same Storage object when a reference URL has query or fragment parameters', () => {
  const prefix = 'https://xmtnszxtnfxnrojionoa.supabase.co/storage/v1/object/public/storefront-media/';
  const paths = collectReferencedProductImagePaths([
    `${prefix}products/prod-a/image%20one.jpg?cache=123#preview`,
    `${prefix}products/prod-b/second.jpg`,
    'https://other.example/storage/v1/object/public/storefront-media/products/prod-a/image%20one.jpg',
    'https://xmtnszxtnfxnrojionoa.supabase.co/storage/v1/object/public/other-bucket/products/prod-a/image%20one.jpg',
    'javascript:alert(1)'
  ], prefix);

  assert.deepEqual([...paths].sort(), [
    'products/prod-a/image one.jpg',
    'products/prod-b/second.jpg'
  ]);
});

test('ignores malformed URLs and invalid public prefixes', () => {
  assert.equal(collectReferencedProductImagePaths(['not a URL'], 'bad-prefix').size, 0);
  assert.equal(collectReferencedProductImagePaths(null, 'https://cdn.test/bucket/').size, 0);
});


test('retains product image URLs referenced by legacy admin messages', () => {
  const referenced = collectReferencedLegacyMessageImageUrls([
    { image: 'https://xmtnszxtnfxnrojionoa.supabase.co/storage/v1/object/public/storefront-media/products/prod-a/photo.jpg' },
    { image: '' },
    { image: 'data:image/jpeg;base64,AAAA' },
    null
  ]);

  assert.deepEqual([...referenced], [
    'https://xmtnszxtnfxnrojionoa.supabase.co/storage/v1/object/public/storefront-media/products/prod-a/photo.jpg'
  ]);
});
