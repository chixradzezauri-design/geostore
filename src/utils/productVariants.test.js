import test from 'node:test';
import assert from 'node:assert/strict';
import { getAvailableProductColors, getAvailableProductSizes, hasProductVariantOptions, getCustomProductVariants, getCustomProductVariant, getProductAvailableStock, getProductStartingPrice } from './productVariants.js';

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


test('normalizes custom variants and calculates starting price and aggregate stock', () => {
  const product = {
    priceGEL: 5,
    variants: [
      { id: 'v1', name: 'Small pack', priceGEL: 25, stock: 2 },
      { id: 'v2', name: 'Large pack', priceGEL: 40, stock: 3 },
      { id: '', name: 'Invalid', priceGEL: 1, stock: 1 }
    ]
  };
  assert.equal(getCustomProductVariants(product).length, 2);
  assert.equal(getCustomProductVariant(product, 'v2').name, 'Large pack');
  assert.equal(getProductStartingPrice(product), 25);
  assert.equal(getProductAvailableStock(product), 5);
  assert.equal(hasProductVariantOptions(product), true);
});

test('fails closed for malformed custom variants instead of falling back to base stock or price', () => {
  const product = { priceGEL: 10, stock: 9, variants: [{ id: 'bad', name: 'Broken', priceGEL: -1, stock: 2 }] };
  assert.equal(getProductStartingPrice(product), null);
  assert.equal(getProductAvailableStock(product), 0);
  assert.equal(hasProductVariantOptions(product), true);
  assert.equal(getCustomProductVariants({ variants: [{ id: 'v1', name: 'No price', priceGEL: null, stock: 2 }] }).length, 0);
  assert.equal(getCustomProductVariants({ variants: [{ id: 'v1', name: 'No stock', priceGEL: 10, stock: null }] }).length, 0);
  assert.equal(getProductStartingPrice({ priceGEL: null }), null);
});
