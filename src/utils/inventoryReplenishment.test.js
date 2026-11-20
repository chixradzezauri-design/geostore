import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInventoryReplenishmentPlan,
  filterInventoryReplenishmentPlan,
  getInventoryPositionKey,
  calculateReplenishmentDraftPreview
} from './inventoryReplenishment.js';

test('uses the existing product stock only for products without variants', () => {
  const plan = buildInventoryReplenishmentPlan([
    { id: 'plain-1', name: 'Basic item', stock: 2, variants: [] },
    { id: 'shoe-1', name: 'Sneaker', stock: 100, variants: [{ id: 'size-40', name: '40', stock: 1 }] }
  ]);
  assert.deepEqual(plan.map(row => [row.productId, row.variantId, row.stock]), [
    ['shoe-1', 'size-40', 1],
    ['plain-1', null, 2]
  ]);
});

test('does not double-count parent stock when variants exist', () => {
  const plan = buildInventoryReplenishmentPlan([{
    id: 'shoe-1', name: 'Sneaker', stock: 0,
    variants: [{ id: 'size-40', name: '40', stock: 8 }]
  }]);
  assert.equal(plan.length, 1);
  assert.equal(plan[0].variantId, 'size-40');
  assert.equal(plan[0].isLowStock, false);
});

test('applies saved threshold and target separately for each product or variant', () => {
  const plan = buildInventoryReplenishmentPlan([
    { id: 'shirt-1', name: 'Shirt', stock: 7 },
    { id: 'shoe-1', name: 'Shoe', variants: [{ id: 'v40', name: '40', stock: 7 }] }
  ], [
    { product_id: 'shirt-1', variant_id: null, low_stock_threshold: 8, target_stock: 30, id: 1 },
    { product_id: 'shoe-1', variant_id: 'v40', low_stock_threshold: 6, target_stock: 18, id: 2 }
  ]);
  assert.equal(plan[0].productId, 'shirt-1');
  assert.equal(plan[0].suggestedQuantity, 23);
  assert.equal(plan[0].hasCustomSetting, true);
  assert.equal(plan[1].productId, 'shoe-1');
  assert.equal(plan[1].isLowStock, false);
  assert.equal(plan[1].suggestedQuantity, 0);
});

test('uses safe defaults of five and twenty and computes refill quantity', () => {
  const plan = buildInventoryReplenishmentPlan([
    { id: 'zero', name: 'Zero', stock: 0 },
    { id: 'five', name: 'Five', stock: 5 },
    { id: 'six', name: 'Six', stock: 6 }
  ]);
  assert.deepEqual(plan.map(row => [row.threshold, row.target, row.suggestedQuantity]), [
    [5, 20, 20], [5, 20, 15], [5, 20, 0]
  ]);
});

test('rejects invalid stock and invalid saved threshold/target pairs', () => {
  const plan = buildInventoryReplenishmentPlan([
    { id: 'missing' },
    { id: 'negative', stock: -1 },
    { id: 'fraction', stock: 1.5 },
    { id: 'valid', stock: 2 }
  ], [{ product_id: 'valid', low_stock_threshold: 10, target_stock: 10 }]);
  assert.equal(plan.length, 0);
});

test('filters by product, SKU, category, variant name and variant ID', () => {
  const plan = buildInventoryReplenishmentPlan([{
    id: 'shoe-1', name: 'Sneaker', sku: 'SN-001', category: 'shoes',
    variants: [{ id: 'black-40', name: 'Black / 40', stock: 2 }]
  }]);
  assert.equal(filterInventoryReplenishmentPlan(plan, 'SN-001').length, 1);
  assert.equal(filterInventoryReplenishmentPlan(plan, 'black').length, 1);
  assert.equal(filterInventoryReplenishmentPlan(plan, 'black-40').length, 1);
  assert.equal(filterInventoryReplenishmentPlan(plan, 'not-found').length, 0);
});

test('uses collision-safe stable keys for base and variant positions', () => {
  assert.equal(getInventoryPositionKey('p1', null), '["p1",null]');
  assert.equal(getInventoryPositionKey('p1', 'v1'), '["p1","v1"]');
  assert.notEqual(getInventoryPositionKey('p1', null), getInventoryPositionKey('p1', 'v1'));
});

test('preserves saved row revision for conflict-safe edits and null for new settings', () => {
  const plan = buildInventoryReplenishmentPlan([
    { id: 'existing', name: 'Existing', stock: 3 },
    { id: 'new', name: 'New', stock: 2 }
  ], [{
    product_id: 'existing', variant_id: null, id: 42,
    low_stock_threshold: 5, target_stock: 20,
    updated_at: '2026-11-20T10:00:00.123456+00:00'
  }]);
  const existing = plan.find(row => row.productId === 'existing');
  const newlyCreated = plan.find(row => row.productId === 'new');
  assert.equal(existing.updatedAt, '2026-11-20T10:00:00.123456+00:00');
  assert.equal(existing.settingId, 42);
  assert.equal(newlyCreated.updatedAt, null);
  assert.equal(newlyCreated.hasCustomSetting, false);
});

test('draft preview immediately recalculates low-stock status after a threshold edit', () => {
  assert.deepEqual(calculateReplenishmentDraftPreview(8, 10, 20), {
    valid: true, isLowStock: true, suggestedQuantity: 12
  });
  assert.deepEqual(calculateReplenishmentDraftPreview(8, 5, 20), {
    valid: true, isLowStock: false, suggestedQuantity: 0
  });
  assert.deepEqual(calculateReplenishmentDraftPreview(0, 0, 1), {
    valid: true, isLowStock: true, suggestedQuantity: 1
  });
});

test('draft preview refuses incomplete, invalid and conflicting thresholds and targets', () => {
  for (const [threshold, target] of [
    ['', 20], [0, ''], [' ', 20], [5, 5], [8, 7],
    [-1, 20], [100001, 100002], [1.5, 20], [0, 1000001], [3, 4.5]
  ]) {
    const preview = calculateReplenishmentDraftPreview(2, threshold, target);
    assert.equal(preview.valid, false, 'Rejected threshold/target ' + JSON.stringify([threshold, target]));
    assert.equal(preview.suggestedQuantity, null);
  }
  assert.equal(calculateReplenishmentDraftPreview(-1, 5, 20).valid, false);
});
