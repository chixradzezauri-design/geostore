import test from 'node:test';
import assert from 'node:assert/strict';

import { isValidExpenseCatalogueResponse } from './expenseCatalogSafety.js';

test('accepts valid empty and populated expense catalogues', () => {
  assert.equal(isValidExpenseCatalogueResponse([]), true);
  assert.equal(isValidExpenseCatalogueResponse([
    { id: 'e-1', category: 'რეკლამა', description: 'კამპანია', amount: 12.5, date: '2026-11-08' },
    { id: 'e-2', category: 'მიტანა', description: 'კურიერი', amount: '3.00', date: '2026-11-07' }
  ]), true);
});

test('rejects malformed, duplicate, or financially unsafe expense rows', () => {
  assert.equal(isValidExpenseCatalogueResponse(null), false);
  assert.equal(isValidExpenseCatalogueResponse({}), false);
  assert.equal(isValidExpenseCatalogueResponse([null]), false);
  assert.equal(isValidExpenseCatalogueResponse([{ id: 'e-1', category: 'რეკლამა', description: 'x', amount: 'NaN', date: '2026-11-08' }]), false);
  assert.equal(isValidExpenseCatalogueResponse([{ id: 'e-1', category: 'რეკლამა', description: 'x', amount: '-1', date: '2026-11-08' }]), false);
  assert.equal(isValidExpenseCatalogueResponse([{ id: 'e-1', category: 'რეკლამა', description: 'x', amount: '1.999', date: '2026-11-08' }]), false);
  assert.equal(isValidExpenseCatalogueResponse([{ id: 'e-1', category: 'რეკლამა', description: 'x', amount: '1', date: '2026-02-30' }]), false);
  assert.equal(isValidExpenseCatalogueResponse([
    { id: 'e-1', category: 'რეკლამა', description: 'x', amount: '1', date: '2026-11-08' },
    { id: 'e-1', category: 'მიტანა', description: 'y', amount: '2', date: '2026-11-07' }
  ]), false);
});
