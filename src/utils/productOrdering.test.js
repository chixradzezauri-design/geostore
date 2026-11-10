import test from 'node:test';
import assert from 'node:assert/strict';
import { getLowStockInventory, groupLowStockInventory, resolveProductCreatedAt } from './productOrdering.js';

test('preserves a missing creation timestamp when editing a legacy product', () => {
  assert.equal(resolveProductCreatedAt({
    isEditing: true,
    savedRow: {},
    existingProduct: { id: 'legacy-1', createdAt: null },
    now: () => '2099-01-01T00:00:00.000Z'
  }), null);
});

test('preserves the original creation timestamp when editing a product', () => {
  assert.equal(resolveProductCreatedAt({
    isEditing: true,
    savedRow: {},
    existingProduct: { createdAt: '2024-02-03T10:00:00.000Z' },
    now: () => '2099-01-01T00:00:00.000Z'
  }), '2024-02-03T10:00:00.000Z');
});

test('prefers the canonical server creation timestamp when editing', () => {
  assert.equal(resolveProductCreatedAt({
    isEditing: true,
    savedRow: { created_at: '2023-05-06T10:00:00.000Z' },
    existingProduct: { createdAt: '2024-02-03T10:00:00.000Z' }
  }), '2023-05-06T10:00:00.000Z');
});

test('uses the server timestamp or a fresh timestamp for a new product', () => {
  assert.equal(resolveProductCreatedAt({
    isEditing: false,
    savedRow: { created_at: '2025-06-07T10:00:00.000Z' },
    now: () => '2099-01-01T00:00:00.000Z'
  }), '2025-06-07T10:00:00.000Z');
  assert.equal(resolveProductCreatedAt({
    isEditing: false,
    savedRow: null,
    now: () => '2099-01-01T00:00:00.000Z'
  }), '2099-01-01T00:00:00.000Z');
});


test('includes low-stock custom variants even when the parent product has ample stock', () => {
  const result = getLowStockInventory([{
    id: 'shoe-1', name: 'Sneaker', stock: 50,
    variants: [
      { id: 'size-40', name: '40', stock: 1 },
      { id: 'size-41', name: '41', stock: 8 },
      { id: 'size-42', name: '42', stock: 0 }
    ]
  }]);
  assert.deepEqual(result.map(item => [item.variantId, item._stockValue]), [['size-42', 0], ['size-40', 1]]);
  assert.deepEqual(result.map(item => item._inventoryKey), ['shoe-1::variant::size-42', 'shoe-1::variant::size-40']);
});

test('uses base product stock only when no custom variants are configured', () => {
  const result = getLowStockInventory([
    { id: 'plain', name: 'Plain item', stock: 2, variants: [] },
    { id: 'variant-parent', name: 'Variant item', stock: 0, variants: [{ id: 'v1', name: 'One', stock: 9 }] }
  ]);
  assert.deepEqual(result.map(item => item.id), ['plain']);
});

test('ignores missing, malformed, negative and above-threshold stock values', () => {
  const result = getLowStockInventory([
    { id: 'missing' },
    { id: 'bad', stock: 'unknown' },
    { id: 'negative', stock: -1 },
    { id: 'fraction', stock: 1.5 },
    { id: 'high', stock: 6 },
    { id: 'zero', stock: 0 }
  ]);
  assert.deepEqual(result.map(item => item.id), ['zero']);
});


test('groups low-stock variant positions under one product', () => {
  const positions = getLowStockInventory([
    {
      id: 'shoe-1',
      sku: 'SHOE-1',
      name: 'Sneaker',
      variants: [
        { id: 'size-40', name: '40 / Black', stock: 1 },
        { id: 'size-41', name: '41 / Black', stock: 0 }
      ]
    },
    { id: 'shirt-1', sku: 'SHIRT-1', name: 'T-Shirt', stock: 3, variants: [] }
  ]);
  const groups = groupLowStockInventory(positions);

  assert.equal(groups.length, 2);
  assert.equal(groups[0].name, 'Sneaker');
  assert.deepEqual(groups[0].positions.map(item => item.variantName), ['41 / Black', '40 / Black']);
  assert.equal(groups[1].positions[0]._stockValue, 3);
  assert.equal(positions.length, 3);
});
