import test from 'node:test';
import assert from 'node:assert/strict';

import { parseStoredCartSnapshot } from './cartSafety.js';

test('parses a valid cart snapshot for cross-tab synchronization', () => {
  const snapshot = [{ id: 'product-1', name: 'Coat', quantity: 2, priceGEL: 49.9 }];
  assert.deepEqual(parseStoredCartSnapshot(JSON.stringify(snapshot)), snapshot);
});

test('fails closed for removed, malformed, or non-array cart storage values', () => {
  assert.deepEqual(parseStoredCartSnapshot(null), []);
  assert.deepEqual(parseStoredCartSnapshot(''), []);
  assert.deepEqual(parseStoredCartSnapshot('{broken'), []);
  assert.deepEqual(parseStoredCartSnapshot(JSON.stringify({ id: 'product-1' })), []);
});

test('sanitizes cross-tab cart snapshots before applying them', () => {
  const snapshot = [
    { id: 'product-1', name: 'Coat', quantity: 1, priceGEL: 20 },
    null,
    { id: '', name: 'Invalid', quantity: 1 },
    { id: 'product-2', name: 'Shoes', quantity: 2, priceGEL: 30 }
  ];
  const parsed = parseStoredCartSnapshot(JSON.stringify(snapshot));
  assert.equal(parsed.length, 2);
  assert.deepEqual(parsed.map(item => item.id), ['product-1', 'product-2']);
});
