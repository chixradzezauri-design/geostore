import test from 'node:test';
import assert from 'node:assert/strict';
import { getAvailableProductColors, getAvailableProductSizes, hasProductVariantOptions, getCustomProductVariants, getCustomProductVariant, getProductAvailableStock, getProductStartingPrice, getSizeColorInventoryVariants, getProductSizeColorVariant, getAvailableSizeColorSizes, getAvailableSizeColorColors, getFirstAvailableSizeColorVariant, hasSizeColorInventory } from './productVariants.js';

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


test('keeps size/color inventory rows separate from custom product variants', () => {
  const product = {
    priceGEL: 79,
    stock: 0,
    availableSizes: ['S', 'M'],
    availableColors: ['Black', 'White'],
    variants: [
      { id: 'sc-s-black', name: 'S / Black', variantType: 'size_color', size: 'S', color: 'Black', priceGEL: 79, stock: 2 },
      { id: 'sc-s-white', name: 'S / White', variantType: 'size_color', size: 'S', color: 'White', priceGEL: 79, stock: 0 },
      { id: 'sc-m-black', name: 'M / Black', variantType: 'size_color', size: 'M', color: 'Black', priceGEL: 79, stock: 3 },
      { id: 'sc-m-white', name: 'M / White', variantType: 'size_color', size: 'M', color: 'White', priceGEL: 79, stock: 1 },
      { id: 'custom-pack', name: 'Gift pack', priceGEL: 99, stock: 4 }
    ]
  };

  assert.equal(hasSizeColorInventory(product), true);
  assert.equal(getSizeColorInventoryVariants(product).length, 4);
  assert.equal(getCustomProductVariants(product).length, 1);
  assert.equal(getCustomProductVariant(product, 'sc-s-black'), null);
  assert.equal(getProductSizeColorVariant(product, 'S', 'Black').stock, 2);
  assert.equal(getProductSizeColorVariant(product, 'S', 'White').stock, 0);
  assert.deepEqual(getAvailableSizeColorSizes(product, 'White'), ['M']);
  assert.deepEqual(getAvailableSizeColorColors(product, 'S'), ['Black']);
  assert.equal(getFirstAvailableSizeColorVariant(product).id, 'sc-s-black');
  assert.equal(getProductAvailableStock(product), 10);
  assert.equal(getProductStartingPrice(product), 99);
});

test('uses the base product price when only size/color inventory rows exist', () => {
  const product = {
    price_gel: 45,
    variants: [
      { id: 'sc-one', name: 'M / Black', variantType: 'size_color', size: 'M', color: 'Black', priceGEL: 45, stock: 6 }
    ]
  };
  assert.equal(getProductStartingPrice(product), 45);
  assert.equal(getProductAvailableStock(product), 6);
  assert.equal(hasProductVariantOptions(product), true);
});

test('fails closed when a requested size/color stock combination is missing', () => {
  const product = {
    availableSizes: ['S', 'M'],
    availableColors: ['Black'],
    variants: [
      { id: 'sc-s-black', name: 'S / Black', variantType: 'size_color', size: 'S', color: 'Black', priceGEL: 20, stock: 2 }
    ]
  };
  assert.equal(getProductSizeColorVariant(product, 'M', 'Black'), null);
  assert.deepEqual(getAvailableSizeColorSizes(product, 'Black'), ['S']);
  assert.deepEqual(getAvailableSizeColorColors(product, 'M'), []);
});
