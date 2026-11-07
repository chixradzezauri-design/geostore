import test from 'node:test';
import assert from 'node:assert/strict';
import { addProductToCart } from '../src/utils/cartSafety.js';

const product = {
  id: 'p-1',
  name: 'Test jacket',
  stock: 3,
  priceGEL: 120,
  availableSizes: ['S', 'M', 'L'],
  availableColors: ['Black', 'Blue']
};

test('adds a product and preserves its selected variant', () => {
  const result = addProductToCart([], { ...product, selectedSize: 'M', selectedColor: 'Black' }, 1);
  assert.equal(result.valid, true);
  assert.equal(result.cart.length, 1);
  assert.equal(result.cart[0].quantity, 1);
  assert.equal(result.cart[0].selectedSize, 'M');
  assert.equal(result.cart[0].selectedColor, 'Black');
});

test('merges only identical product variants into one cart line', () => {
  const first = addProductToCart([], { ...product, selectedSize: 'M' }, 1);
  const second = addProductToCart(first.cart, { ...product, selectedSize: 'M' }, 1);
  const third = addProductToCart(second.cart, { ...product, selectedSize: 'L' }, 1);
  assert.equal(third.cart.length, 2);
  assert.equal(third.cart.find(item => item.selectedSize === 'M').quantity, 2);
  assert.equal(third.cart.find(item => item.selectedSize === 'L').quantity, 1);
});

test('enforces stock across all variants of the same product', () => {
  const first = addProductToCart([], { ...product, selectedSize: 'S' }, 2);
  const second = addProductToCart(first.cart, { ...product, selectedSize: 'M' }, 1);
  const rejected = addProductToCart(second.cart, { ...product, selectedSize: 'L' }, 1);
  assert.equal(second.valid, true);
  assert.equal(rejected.valid, false);
  assert.equal(rejected.reason, 'limit');
  assert.equal(rejected.remaining, 0);
  assert.equal(rejected.cart, second.cart);
});

test('does not allow invalid quantity or unavailable stock', () => {
  assert.equal(addProductToCart([], product, 0).reason, 'quantity');
  assert.equal(addProductToCart([], product, 1.5).reason, 'quantity');
  assert.equal(addProductToCart([], { ...product, stock: 0 }, 1).reason, 'stock');
});

test('treats malformed saved quantities as zero and does not mutate input cart', () => {
  const savedCart = [{ ...product, quantity: 'bad', selectedSize: 'S' }];
  const result = addProductToCart(savedCart, { ...product, selectedSize: 'M' }, 1);
  assert.equal(result.valid, true);
  assert.equal(result.cart.length, 2);
  assert.equal(savedCart.length, 1);
  assert.equal(savedCart[0].quantity, 'bad');
});

test('keeps different product IDs independent', () => {
  const first = addProductToCart([], product, 3);
  const second = addProductToCart(first.cart, { ...product, id: 'p-2', stock: 2 }, 2);
  assert.equal(second.valid, true);
  assert.equal(second.cart.length, 2);
});
