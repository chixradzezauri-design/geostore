import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesProductSearch } from './productSearch.js';

const product = {
  name: 'Classic Leather Jacket',
  category: 'ქალის ტანსაცმელი',
  vendor: 'GEOSTORE Studio',
  sku: 'JKT-204',
  description: 'Premium outerwear',
  tags: ['new season', 'leather'],
  variants: [{ name: 'Black / M', sku: 'JKT-204-BM' }]
};

test('empty query matches every valid product', () => {
  assert.equal(matchesProductSearch(product, ''), true);
  assert.equal(matchesProductSearch(null, ''), true);
});

test('search matches product name, category, vendor, SKU and description', () => {
  for (const query of ['leather jacket', 'ქალის ტანსაცმელი', 'geostore studio', 'JKT-204', 'premium outerwear']) {
    assert.equal(matchesProductSearch(product, query), true, query);
  }
});

test('search matches variant names and variant SKU', () => {
  assert.equal(matchesProductSearch(product, 'black m'), true);
  assert.equal(matchesProductSearch(product, 'JKT-204-BM'), true);
});

test('search is case-insensitive and ignores repeated whitespace', () => {
  assert.equal(matchesProductSearch(product, '  CLASSIC   LEATHER  '), true);
});

test('all query terms must match searchable product content', () => {
  assert.equal(matchesProductSearch(product, 'leather boots'), false);
});

test('malformed products do not throw', () => {
  assert.equal(matchesProductSearch(undefined, 'jacket'), false);
  assert.equal(matchesProductSearch({ name: null, tags: 42 }, 'jacket'), false);
});
