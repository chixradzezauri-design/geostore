import test from 'node:test';
import assert from 'node:assert/strict';

import { isValidProductCatalogueResponse } from './productCatalogSafety.js';

test('accepts a valid empty or populated product catalogue', () => {
  assert.equal(isValidProductCatalogueResponse([]), true);
  assert.equal(isValidProductCatalogueResponse([
    { id: 'p-1', price_gel: 19.99, stock: 3 },
    { id: 'p-2', price_gel: 0, stock: null }
  ]), true);
});

test('rejects malformed catalogue payloads without accepting partial rows', () => {
  assert.equal(isValidProductCatalogueResponse(null), false);
  assert.equal(isValidProductCatalogueResponse({ id: 'p-1' }), false);
  assert.equal(isValidProductCatalogueResponse([null]), false);
  assert.equal(isValidProductCatalogueResponse([{ id: 'p-1', price_gel: 'bad', stock: 1 }]), false);
  assert.equal(isValidProductCatalogueResponse([{ id: 'p-1', price_gel: -1, stock: 1 }]), false);
  assert.equal(isValidProductCatalogueResponse([{ id: 'p-1', price_gel: 1, stock: 1.5 }]), false);
  assert.equal(isValidProductCatalogueResponse([
    { id: 'p-1', price_gel: 1, stock: 1 },
    { id: 'p-1', price_gel: 2, stock: 2 }
  ]), false);
});
