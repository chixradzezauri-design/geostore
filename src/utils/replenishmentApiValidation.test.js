import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateReplenishmentSettingsResponse,
  validateReplenishmentSaveResponse
} from './replenishmentApiValidation.js';

const saved = {
  product_id: 'shirt-1',
  variant_id: null,
  updated_at: '2026-11-20T10:11:12.123456+00:00',
  low_stock_threshold: 5,
  target_stock: 20
};
const validList = items => ({ items, has_more: false });

test('accepts complete versioned settings, including variant-specific rows', () => {
  const items = [saved, {
    ...saved, variant_id: 'red-m', low_stock_threshold: 0, target_stock: 1
  }];
  assert.equal(validateReplenishmentSettingsResponse(validList(items)), items);
  assert.deepEqual(validateReplenishmentSettingsResponse(validList([])), []);
});

test('rejects truncated pages and missing required list contract fields', () => {
  for (const data of [
    null, [], {}, { items: [] },
    { items: [], has_more: true },
    { items: 'not-array', has_more: false },
    validList(Array.from({ length: 1001 }, (_, id) => ({ ...saved, product_id: 'p-' + id })))
  ]) {
    assert.throws(() => validateReplenishmentSettingsResponse(data));
  }
});

test('rejects malformed versions, identifiers, thresholds and targets', () => {
  const broken = [
    { updated_at: null },
    { updated_at: '2026-11-20T10:11:12' },
    { updated_at: 'not-a-timestamp' },
    { product_id: '' },
    { variant_id: undefined },
    { variant_id: '' },
    { low_stock_threshold: null },
    { low_stock_threshold: '5' },
    { low_stock_threshold: -1 },
    { low_stock_threshold: 100001 },
    { low_stock_threshold: 1.2 },
    { target_stock: null },
    { target_stock: '20' },
    { target_stock: 5 },
    { target_stock: 1000001 },
    { target_stock: 7.2 }
  ];
  for (const override of broken) {
    assert.throws(() => validateReplenishmentSettingsResponse(validList([
      { ...saved, ...override }
    ])), 'Should reject ' + JSON.stringify(override));
  }
});

test('rejects duplicate product and variant combinations', () => {
  assert.throws(() => validateReplenishmentSettingsResponse(validList([
    saved, { ...saved, target_stock: 30 }
  ])));
  assert.doesNotThrow(() => validateReplenishmentSettingsResponse(validList([
    saved, { ...saved, variant_id: 'v1' }
  ])));
});

test('acknowledges only exact matching product, variant and requested values', () => {
  const position = { productId: 'shirt-1', variantId: null };
  const response = { success: true, setting: saved };
  assert.equal(validateReplenishmentSaveResponse(response, position, 5, 20), saved);
  for (const wrong of [
    { success: false, setting: saved },
    { success: true, setting: { ...saved, product_id: 'other' } },
    { success: true, setting: { ...saved, variant_id: 'red' } },
    { success: true, setting: { ...saved, low_stock_threshold: 3 } },
    { success: true, setting: { ...saved, target_stock: 30 } },
    { success: true, setting: { ...saved, updated_at: null } },
    { success: true, setting: null }
  ]) {
    assert.throws(() => validateReplenishmentSaveResponse(wrong, position, 5, 20));
  }
  const variant = { ...saved, variant_id: 'red-m' };
  assert.equal(validateReplenishmentSaveResponse(
    { success: true, setting: variant },
    { productId: 'shirt-1', variantId: 'red-m' }, 5, 20
  ), variant);
});
