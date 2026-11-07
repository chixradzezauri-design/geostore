import test from 'node:test';
import assert from 'node:assert/strict';
import { getAvailableProductColors, getAvailableProductSizes, hasProductVariantOptions, getCustomProductVariants, getCustomProductVariant, getProductAvailableStock, getProductStartingPrice, hasValidProductOptionSelection } from './productVariants.js';

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

test('requires every configured size, color, and custom variant before purchase', () => {
  const product = {
    availableSizes: ['S', 'M'],
    availableColors: ['Black', 'White'],
    variants: [{ id: 'v1', name: 'Standard', priceGEL: 20, stock: 2 }]
  };
  const complete = { size: 'M', color: 'Black', customVariantId: 'v1' };
  assert.equal(hasValidProductOptionSelection(product, complete), true);
  assert.equal(hasValidProductOptionSelection(product, { ...complete, size: '' }), false);
  assert.equal(hasValidProductOptionSelection(product, { ...complete, color: 'Green' }), false);
  assert.equal(hasValidProductOptionSelection(product, { ...complete, customVariantId: 'missing' }), false);
});

test('does not require options for products without configured variants', () => {
  assert.equal(hasValidProductOptionSelection({ id: 'simple-product' }), true);
});

test('rejects out-of-stock custom variants before opening checkout', () => {
  const product = { variants: [{ id: 'v1', name: 'Sold out', priceGEL: 10, stock: 0 }] };
  assert.equal(hasValidProductOptionSelection(product, { customVariantId: 'v1' }), false);
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


test('fails closed when custom variants contain duplicate IDs or names', () => {
  assert.deepEqual(getCustomProductVariants({ variants: [
    { id: 'same', name: 'Small', priceGEL: 10, stock: 2 },
    { id: 'same', name: 'Large', priceGEL: 20, stock: 3 }
  ] }), []);
  assert.deepEqual(getCustomProductVariants({ variants: [
    { id: 'v1', name: 'Small', priceGEL: 10, stock: 2 },
    { id: 'v2', name: ' small ', priceGEL: 20, stock: 3 }
  ] }), []);
});

test('falls back to raw Supabase size/color fields when normalized fields contain no usable values', () => {
  assert.deepEqual(getAvailableProductSizes({
    availableSizes: [' ', ''],
    available_sizes: ['S', 'M']
  }), ['S', 'M']);
  assert.deepEqual(getAvailableProductColors({
    availableColors: [' '],
    available_colors: ['Blue', 'White'],
    colors: ['Red']
  }), ['Blue', 'White']);
});

test('starting price uses the cheapest in-stock custom variant when one is available', () => {
  const product = {
    variants: [
      { id: 'v1', name: 'Unavailable cheap option', priceGEL: 10, stock: 0 },
      { id: 'v2', name: 'Available option', priceGEL: 20, stock: 3 },
      { id: 'v3', name: 'Available premium option', priceGEL: 35, stock: 1 }
    ]
  };
  assert.equal(getProductStartingPrice(product), 20);
});

test('starting price falls back to configured variant prices when every variant is out of stock', () => {
  const product = {
    variants: [
      { id: 'v1', name: 'Unavailable cheap option', priceGEL: 10, stock: 0 },
      { id: 'v2', name: 'Unavailable expensive option', priceGEL: 20, stock: 0 }
    ]
  };
  assert.equal(getProductStartingPrice(product), 10);
});
