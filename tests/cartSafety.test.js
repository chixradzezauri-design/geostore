import test from 'node:test';
import assert from 'node:assert/strict';
import { addProductToCart, removeProductFromCart, updateProductCartQuantity, sanitizeCartSnapshot } from '../src/utils/cartSafety.js';

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

test('keeps separately customized gift and warranty options as distinct cart lines', () => {
  const plain = addProductToCart([], { ...product, name: 'Test jacket (Size: M)', selectedSize: 'M' }, 1);
  const wrapped = addProductToCart(plain.cart, {
    ...product,
    name: 'Test jacket (Size: M) + Premium gift wrapping',
    priceGEL: 125,
    selectedSize: 'M'
  }, 1);
  assert.equal(wrapped.valid, true);
  assert.equal(wrapped.cart.length, 2);
  assert.equal(wrapped.cart[0].priceGEL, 120);
  assert.equal(wrapped.cart[1].priceGEL, 125);
});

test('merges customized lines only when their name and price also match', () => {
  const first = addProductToCart([], { ...product, name: 'Test jacket + gift wrap', priceGEL: 125, selectedSize: 'M' }, 1);
  const second = addProductToCart(first.cart, { ...product, name: 'Test jacket + gift wrap', priceGEL: 125, selectedSize: 'M' }, 1);
  assert.equal(second.cart.length, 1);
  assert.equal(second.cart[0].quantity, 2);
});

test('removes only the exact customized cart line', () => {
  const plain = { ...product, name: 'Test jacket', selectedSize: 'M', quantity: 1 };
  const wrapped = { ...product, name: 'Test jacket + gift wrap', priceGEL: 125, selectedSize: 'M', quantity: 1 };
  const remaining = removeProductFromCart([plain, wrapped], wrapped);
  assert.deepEqual(remaining, [plain]);
});

test('updates cart quantity without exceeding shared stock across variants', () => {
  const cart = [
    { ...product, selectedSize: 'S', quantity: 2 },
    { ...product, selectedSize: 'M', quantity: 1 }
  ];
  const rejected = updateProductCartQuantity(cart, cart[0], 3);
  assert.equal(rejected.valid, false);
  assert.equal(rejected.reason, 'limit');
  assert.equal(rejected.cart, cart);
  const reduced = updateProductCartQuantity(cart, cart[0], 1);
  assert.equal(reduced.valid, true);
  assert.equal(reduced.cart[0].quantity, 1);
  assert.equal(reduced.cart[1].quantity, 1);
});

test('rejects invalid cart quantity updates and preserves the original cart', () => {
  const cart = [{ ...product, selectedSize: 'M', quantity: 1 }];
  assert.equal(updateProductCartQuantity(cart, cart[0], 0).reason, 'quantity');
  assert.equal(updateProductCartQuantity(cart, cart[0], 1.5).reason, 'quantity');
  assert.equal(cart[0].quantity, 1);
});


test('sanitizes persisted cart snapshots and keeps valid product variants', () => {
  const saved = [
    { ...product, selectedSize: ' M ', selectedColor: ' Black ', quantity: '2', priceGEL: '120' },
    null,
    { ...product, id: '', quantity: 1 },
    { ...product, quantity: 0 },
    { ...product, quantity: 1.5 },
    { ...product, quantity: 1, priceGEL: 'not-a-price' },
    { ...product, quantity: 101 },
    'not-an-item'
  ];
  const result = sanitizeCartSnapshot(saved);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'p-1');
  assert.equal(result[0].quantity, 2);
  assert.equal(result[0].priceGEL, 120);
  assert.equal(result[0].selectedSize, 'M');
  assert.equal(result[0].selectedColor, 'Black');
});

test('returns an empty cart for malformed snapshots and caps oversized snapshots', () => {
  assert.deepEqual(sanitizeCartSnapshot({ items: [] }), []);
  assert.deepEqual(sanitizeCartSnapshot(null), []);
  const oversized = Array.from({ length: 105 }, (_, index) => ({
    ...product,
    id: `p-${index}`,
    quantity: 1
  }));
  assert.equal(sanitizeCartSnapshot(oversized).length, 100);
});

test('normalizes invalid saved stock to zero without trusting it for checkout', () => {
  const [item] = sanitizeCartSnapshot([{ ...product, stock: 'bad', quantity: 1 }]);
  assert.equal(item.stock, 0);
});
