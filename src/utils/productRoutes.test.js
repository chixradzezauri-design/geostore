import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductRoutePath, parseProductRoute } from './productRoutes.js';

test('parses a stable product ID route', () => {
  assert.deepEqual(parseProductRoute('/products/product_123-ABC'), { productId: 'product_123-ABC' });
});

test('accepts an optional trailing slash', () => {
  assert.deepEqual(parseProductRoute('/products/abc123/'), { productId: 'abc123' });
});

test('decodes a valid percent-encoded product ID', () => {
  assert.deepEqual(parseProductRoute('/products/%61bc123'), { productId: 'abc123' });
});

test('rejects unsafe, empty, malformed and unrelated paths', () => {
  assert.equal(parseProductRoute('/products/a%2Fb')?.productId, null);
  assert.equal(parseProductRoute('/products/%ZZ')?.productId, null);
  assert.equal(parseProductRoute('/products/'), null);
  assert.equal(parseProductRoute('/category/shoes'), null);
  assert.equal(parseProductRoute('/products/' + 'a'.repeat(129))?.productId, null);
});

test('builds safe paths and rejects invalid IDs', () => {
  assert.equal(buildProductRoutePath('product_123-ABC'), '/products/product_123-ABC');
  assert.equal(buildProductRoutePath('a/b'), null);
  assert.equal(buildProductRoutePath(''), null);
  assert.equal(buildProductRoutePath(null), null);
});

test('build and parse round-trip preserves valid IDs', () => {
  for (const id of ['18', 'product_123-ABC', 'A'.repeat(128)]) {
    assert.deepEqual(parseProductRoute(buildProductRoutePath(id)), { productId: id });
  }
});
