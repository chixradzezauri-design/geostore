import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateCheckoutTotals,
  reconcileCartWithCatalog,
  createSecureOrderId,
  groupCheckoutItems,
  isReusableCheckout
} from './orderSafety.js';

test('groups identical product and option combinations', () => {
  assert.deepEqual(
    groupCheckoutItems([
      { id: 'p-1', selected_size: 'M', selected_color: 'შავი', quantity: 1 },
      { id: 'p-1', selected_size: 'M', selected_color: 'შავი', quantity: 2 }
    ]),
    [{ id: 'p-1', selected_size: 'M', selected_color: 'შავი', quantity: 3 }]
  );
});

test('keeps different sizes and colors as separate order lines', () => {
  assert.equal(
    groupCheckoutItems([
      { id: 'p-1', selected_size: 'M', selected_color: 'შავი', quantity: 1 },
      { id: 'p-1', selected_size: 'L', selected_color: 'შავი', quantity: 1 },
      { id: 'p-1', selected_size: 'M', selected_color: 'თეთრი', quantity: 1 }
    ]).length,
    3
  );
});

test('does not merge different product IDs', () => {
  assert.equal(
    groupCheckoutItems([
      { id: 'p-1', quantity: 1 },
      { id: 'p-2', quantity: 1 }
    ]).length,
    2
  );
});

test('returns an empty list for non-array input', () => {
  assert.deepEqual(groupCheckoutItems(null), []);
});

test('normalizes missing option values consistently', () => {
  assert.deepEqual(
    groupCheckoutItems([
      { id: 12, quantity: 1 },
      { id: '12', selected_size: null, selected_color: null, quantity: 2 }
    ]),
    [{ id: '12', selected_size: null, selected_color: null, quantity: 3 }]
  );
});

test('accepts only a matching fingerprint and a valid secure order ID for retry', () => {
  const entry = { fingerprint: 'digest-123', orderId: `ORD-${'A'.repeat(32)}` };
  assert.equal(isReusableCheckout(entry, 'digest-123'), true);
  assert.equal(isReusableCheckout(entry, 'different-digest'), false);
  assert.equal(isReusableCheckout({ ...entry, orderId: 'ORD-not-valid' }, 'digest-123'), false);
  assert.equal(isReusableCheckout(entry, ''), false);
});

test('creates a 128-bit uppercase hexadecimal order ID', () => {
  const cryptoApi = {
    getRandomValues(bytes) {
      bytes.fill(0xab);
      return bytes;
    }
  };
  assert.equal(createSecureOrderId(cryptoApi), `ORD-${'AB'.repeat(16)}`);
});

test('fails closed when a secure random source is unavailable', () => {
  assert.throws(
    () => createSecureOrderId(null),
    /უსაფრთხო შეკვეთის ნომრის გენერირება/
  );
});


test('rounds coupon discount to cents before adding delivery, matching server checkout', () => {
  assert.deepEqual(
    calculateCheckoutTotals({ subtotal: 100.05, discountPercent: 10, deliveryFee: 10 }),
    { subtotalGEL: 100.05, discountGEL: 10.01, deliveryGEL: 10, totalGEL: 100.04 }
  );
});

test('keeps a zero-discount total and supports a full discount', () => {
  assert.equal(
    calculateCheckoutTotals({ subtotal: 100, discountPercent: 0, deliveryFee: 15 }).totalGEL,
    115
  );
  assert.equal(
    calculateCheckoutTotals({ subtotal: 100, discountPercent: 100, deliveryFee: 0 }).totalGEL,
    0
  );
});

test('clamps invalid discount and delivery values safely', () => {
  assert.deepEqual(
    calculateCheckoutTotals({ subtotal: 50, discountPercent: 150, deliveryFee: -5 }),
    { subtotalGEL: 50, discountGEL: 50, deliveryGEL: 0, totalGEL: 0 }
  );
});


test('reconciles stale cart prices and stock against the latest catalogue', () => {
  const result = reconcileCartWithCatalog(
    [
      { id: 'p1', name: 'Old name', priceGEL: 100, quantity: 2, selectedSize: 'M' },
      { id: 'p1', name: 'Old name', priceGEL: 100, quantity: 1, selectedSize: 'L' },
      { id: 'p2', name: 'Missing item', priceGEL: 25, quantity: 1 }
    ],
    [
      { id: 'p1', name: 'Current name', price_gel: 110, stock: 2 }
    ]
  );

  assert.equal(result.hasChanges, true);
  assert.deepEqual(result.changes.map((change) => change.type), ['price', 'stock', 'price', 'unavailable']);
  assert.equal(result.cartItems[0].priceGEL, 110);
  assert.equal(result.cartItems[1].priceGEL, 110);
  assert.equal(result.cartItems[0].stock, 2);
  assert.equal(result.cartItems[2].priceGEL, 25);
});

test('does not report a change when cart price and aggregate stock are current', () => {
  const result = reconcileCartWithCatalog(
    [{ id: 'p1', name: 'Current', priceGEL: 35, quantity: 2 }],
    [{ id: 'p1', name: 'Current', price_gel: 35, stock: 2 }]
  );
  assert.equal(result.hasChanges, false);
  assert.deepEqual(result.changes, []);
});


test('flags cart variants that are no longer offered by the latest catalogue', () => {
  const result = reconcileCartWithCatalog(
    [
      { id: 'p1', name: 'Jacket', priceGEL: 120, quantity: 1, selectedSize: 'XXL', selectedColor: 'Red' }
    ],
    [
      { id: 'p1', name: 'Jacket', price_gel: 120, stock: 4, available_sizes: ['S', 'M', 'L'], available_colors: ['Black'] }
    ]
  );
  assert.deepEqual(result.changes.map((change) => change.type), ['variant_size', 'variant_color']);
  assert.equal(result.hasChanges, true);
});

test('accepts currently offered cart variants from snake_case catalogue fields', () => {
  const result = reconcileCartWithCatalog(
    [
      { id: 'p1', name: 'Jacket', priceGEL: 120, quantity: 1, selectedSize: 'M', selectedColor: 'Black' }
    ],
    [
      { id: 'p1', name: 'Jacket', price_gel: 120, stock: 4, available_sizes: ['S', 'M', 'L'], available_colors: ['Black'] }
    ]
  );
  assert.equal(result.hasChanges, false);
});
