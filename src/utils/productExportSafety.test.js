import test from 'node:test';
import assert from 'node:assert/strict';

import { buildProductExportRows } from './productExportSafety.js';

test('product export includes price, stock, sizes, colors and custom variants', () => {
  const rows = buildProductExportRows([{
    id: 'p-1', sku: 'SKU-1', name: 'ქურთუკი', category: 'ტანსაცმელი',
    priceGEL: 125.5, oldPriceGEL: 150, purchaseCost: 80, stock: 4,
    availableSizes: ['S', 'M'], availableColors: ['შავი', 'თეთრი'],
    variants: [{ id: 'v1', name: 'XL', priceGEL: 130, stock: 2 }], vendor: 'GEOSTORE'
  }]);
  assert.deepEqual(rows[0], [
    'p-1', 'SKU-1', 'ქურთუკი', 'ტანსაცმელი', '125.50', '150.00', '80.00', 4,
    'S, M', 'შავი, თეთრი', 'XL | ფასი: 130.00 GEL | მარაგი: 2', 'GEOSTORE'
  ]);
});

test('product export leaves malformed money and stock blank instead of inventing zero', () => {
  const rows = buildProductExportRows([{
    id: 'p-2', name: 'ფეხსაცმელი', priceGEL: '12.345', stock: -2,
    variants: [{ name: '42', priceGEL: 'bad', stock: 1.5 }]
  }]);
  assert.equal(rows[0][4], '');
  assert.equal(rows[0][7], '');
  assert.match(rows[0][10], /ფასი: უცნობია GEL \| მარაგი: უცნობია/);
});

test('product export safely ignores malformed top-level rows and non-array input', () => {
  assert.deepEqual(buildProductExportRows(null), []);
  assert.equal(buildProductExportRows([null, [], { id: 'p-3', stock: 0 }]).length, 1);
});
