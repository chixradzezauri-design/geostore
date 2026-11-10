import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesProductSearch } from './productSearch.js';

const product = {
  name: 'Classic Leather Jacket',
  category: 'ქალის ტანსაცმელი',
  brand: 'GEOSTORE Studio',
  vendor: 'GEOSTORE Studio',
  sku: 'JKT-204',
  description: 'Premium outerwear',
  tags: ['new season', 'leather'],
  variants: [{ name: 'Black / M', sku: 'JKT-204-BM', color: 'Black', size: 'M' }]
};

test('empty query matches every valid product', () => {
  assert.equal(matchesProductSearch(product, ''), true);
  assert.equal(matchesProductSearch(null, ''), true);
});

test('search matches product name, category, brand, vendor, SKU and description', () => {
  for (const query of ['leather jacket', 'ქალის ტანსაცმელი', 'geostore studio', 'JKT-204', 'premium outerwear']) {
    assert.equal(matchesProductSearch(product, query), true, query);
  }
});

test('search matches variant names, SKU, color and size', () => {
  for (const query of ['black m', 'JKT-204-BM', 'black', 'M']) {
    assert.equal(matchesProductSearch(product, query), true, query);
  }
});

test('search matches laptop model and technical specifications', () => {
  const laptop = {
    name: 'Business Laptop',
    brand: 'Lenovo',
    model: 'ThinkPad T14',
    cpu: 'Intel Core i7',
    ram: '16GB',
    storage: '512GB SSD',
    gpu: 'Intel Iris Xe',
    screen_size: '14 inch',
    os: 'Windows 11'
  };

  for (const query of ['lenovo', 'thinkpad t14', 'intel core i7', '16gb', '512gb ssd', 'iris xe', '14 inch', 'windows 11']) {
    assert.equal(matchesProductSearch(laptop, query), true, query);
  }
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
