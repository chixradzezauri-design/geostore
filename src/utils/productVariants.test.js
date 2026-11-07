import test from 'node:test';
import assert from 'node:assert/strict';
import { getAvailableProductColors, getAvailableProductSizes, hasProductVariantOptions } from './productVariants.js';

test('normalizes configured size arrays without inventing fallback sizes', () => {
  assert.deepEqual(getAvailableProductSizes({ availableSizes: [' M ', '', 'L', 'M'] }), ['M', 'L']);
  assert.deepEqual(getAvailableProductSizes({}), []);
});

test('normalizes colors from either the array or legacy comma-separated field', () => {
  assert.deepEqual(getAvailableProductColors({ colors: 'Black, White, ,Black' }), ['Black', 'White']);
  assert.deepEqual(getAvailableProductColors({ availableColors: [' Blue ', 'Red'] }), ['Blue', 'Red']);
});

test('supports raw Supabase snake_case product fields', () => {
  const product = { available_sizes: [' S ', 'M', 'M'], available_colors: [' Black ', 'White'] };
  assert.deepEqual(getAvailableProductSizes(product), ['S', 'M']);
  assert.deepEqual(getAvailableProductColors(product), ['Black', 'White']);
  assert.equal(hasProductVariantOptions(product), true);
});

test('prefers explicitly configured Supabase colors over legacy fallback', () => {
  assert.deepEqual(getAvailableProductColors({ availableColors: [], available_colors: ['Blue'], colors: ['Red'] }), ['Blue']);
});

test('detects only explicitly configured variant options', () => {
  assert.equal(hasProductVariantOptions({ availableSizes: ['M'] }), true);
  assert.equal(hasProductVariantOptions({ colors: 'Black' }), true);
  assert.equal(hasProductVariantOptions({}), false);
});
