import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProductVariants, validateSizeColorInventoryVariants } from './productValidation.js';

test('accepts an empty variant list and valid variants', () => {
  assert.deepEqual(validateProductVariants([]), { valid: true });
  assert.deepEqual(validateProductVariants([
    { id: 'v1', name: '128GB', priceGEL: 99.9, stock: 10 },
    { id: 'v2', name: '256GB', price_gel: '129.00', stock: 0 }
  ]), { valid: true });
});

test('rejects non-array and oversized variant collections', () => {
  assert.equal(validateProductVariants(null).reason, 'count');
  assert.equal(validateProductVariants(Array.from({ length: 51 }, (_, i) => ({
    id: String(i), name: 'Option', priceGEL: 1, stock: 0
  }))).reason, 'count');
});

test('rejects malformed variants and duplicate IDs', () => {
  assert.equal(validateProductVariants([null]).reason, 'shape');
  assert.equal(validateProductVariants([
    { id: 'same', name: 'A', priceGEL: 1, stock: 1 },
    { id: 'same', name: 'B', priceGEL: 2, stock: 2 }
  ]).reason, 'identity');
});

test('rejects invalid prices and stock values', () => {
  for (const priceGEL of [-1, 'NaN', '1.999', 1000000001]) {
    assert.equal(validateProductVariants([
      { id: 'v1', name: 'Option', priceGEL, stock: 1 }
    ]).reason, 'price');
  }
  for (const stock of [-1, 1.5, 1000001, 'not-a-number']) {
    assert.equal(validateProductVariants([
      { id: 'v1', name: 'Option', priceGEL: 10, stock }
    ]).reason, 'stock');
  }
});


test('validates complete size/color stock matrices', () => {
  const rows = [
    { id: 'a', name: 'S / Black', variantType: 'size_color', size: 'S', color: 'Black', priceGEL: 20, stock: 3 },
    { id: 'b', name: 'S / White', variantType: 'size_color', size: 'S', color: 'White', priceGEL: 20, stock: 0 },
    { id: 'c', name: 'M / Black', variantType: 'size_color', size: 'M', color: 'Black', priceGEL: 20, stock: 2 },
    { id: 'd', name: 'M / White', variantType: 'size_color', size: 'M', color: 'White', priceGEL: 20, stock: 1 }
  ];
  assert.deepEqual(validateSizeColorInventoryVariants(rows, ['S', 'M'], ['Black', 'White']), { valid: true });
  assert.deepEqual(validateSizeColorInventoryVariants(rows.slice(0, 3), ['S', 'M'], ['Black', 'White']), { valid: false, reason: 'coverage' });
});

test('rejects duplicate, unknown, malformed, or out-of-range size/color stock rows', () => {
  const base = { id: 'a', name: 'S / Black', variantType: 'size_color', size: 'S', color: 'Black', priceGEL: 20, stock: 3 };
  assert.equal(validateSizeColorInventoryVariants([base, { ...base, id: 'b' }], ['S'], ['Black']).reason, 'combination');
  assert.equal(validateSizeColorInventoryVariants([{ ...base, size: 'XL' }], ['S'], ['Black']).reason, 'combination');
  assert.equal(validateSizeColorInventoryVariants([{ ...base, stock: -1 }], ['S'], ['Black']).reason, 'stock');
  assert.equal(validateSizeColorInventoryVariants([{ ...base, variantType: 'custom' }], ['S'], ['Black']).reason, 'shape');
});
