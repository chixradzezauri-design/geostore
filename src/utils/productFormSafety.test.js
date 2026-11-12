import test from 'node:test';
import assert from 'node:assert/strict';
import { parseOptionalMoney, parseStockQuantity } from './productFormSafety.js';

test('blank purchase cost stays unknown instead of becoming zero', () => {
  assert.deepEqual(parseOptionalMoney(''), { valid: true, value: null, reason: null });
  assert.deepEqual(parseOptionalMoney('   '), { valid: true, value: null, reason: null });
});

test('explicit zero purchase cost remains a known zero', () => {
  assert.deepEqual(parseOptionalMoney('0'), { valid: true, value: 0, reason: null });
});

test('purchase cost accepts GEL values with up to two decimals', () => {
  assert.deepEqual(parseOptionalMoney('125.50'), { valid: true, value: 125.5, reason: null });
});

test('purchase cost rejects invalid precision, negative values and values above the limit', () => {
  assert.equal(parseOptionalMoney('12.345').reason, 'format');
  assert.equal(parseOptionalMoney('-1').reason, 'format');
  assert.equal(parseOptionalMoney('1000000000.01').reason, 'range');
});

test('blank product stock defaults safely to zero', () => {
  assert.deepEqual(parseStockQuantity(''), { valid: true, value: 0, reason: null });
});

test('stock accepts whole quantities within the limit', () => {
  assert.deepEqual(parseStockQuantity('42'), { valid: true, value: 42, reason: null });
});

test('stock rejects fractions, negative values and values above the limit', () => {
  assert.equal(parseStockQuantity('1.5').reason, 'format');
  assert.equal(parseStockQuantity('-1').reason, 'format');
  assert.equal(parseStockQuantity('1000001').reason, 'range');
});
