import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateCheckoutTotals,
  reconcileCartWithCatalog,
  createSecureOrderId,
  groupCheckoutItems,
  isReusableCheckout,
  normalizeOrderItems,
  normalizeOrderTotal
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

test('includes paid add-ons in checkout fingerprints while keeping plain-order shape stable', () => {
  const grouped = groupCheckoutItems([
    { id: 'p1', selected_size: 'M', selected_color: 'Black', quantity: 1 },
    { id: 'p1', selected_size: 'M', selected_color: 'Black', quantity: 2, gift_wrap: true, gift_message: 'Happy birthday', vip_warranty: true },
    { id: 'p1', selected_size: 'M', selected_color: 'Black', quantity: 1, gift_wrap: true, gift_message: 'Happy birthday', vip_warranty: true },
    { id: 'p1', selected_size: 'M', selected_color: 'Black', quantity: 1, vip_warranty: true }
  ]);
  assert.equal(grouped.length, 3);
  const plain = grouped.find(item => item.gift_wrap === undefined && item.vip_warranty === undefined);
  const wrapped = grouped.find(item => item.gift_wrap === true);
  const vipOnly = grouped.find(item => item.vip_warranty === true && item.gift_wrap === false);
  assert.deepEqual(plain, { id: 'p1', selected_size: 'M', selected_color: 'Black', quantity: 1 });
  assert.equal(wrapped.quantity, 3);
  assert.equal(wrapped.gift_message, 'Happy birthday');
  assert.equal(wrapped.vip_warranty, true);
  assert.equal(vipOnly.quantity, 1);
  assert.equal(vipOnly.gift_message, null);
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

test('reconciles the base price without losing server-priced cart add-ons', () => {
  const result = reconcileCartWithCatalog(
    [{
      id: 'p1', name: 'Jacket', priceGEL: 140, basePriceGEL: 120,
      giftWrap: true, vipWarranty: true, giftMessage: 'Happy birthday', quantity: 1
    }],
    [{ id: 'p1', name: 'Jacket', price_gel: 130, stock: 3 }]
  );
  assert.equal(result.hasChanges, true);
  assert.equal(result.cartItems[0].basePriceGEL, 130);
  assert.equal(result.cartItems[0].priceGEL, 150);
  assert.equal(result.cartItems[0].giftWrap, true);
  assert.equal(result.cartItems[0].vipWarranty, true);
  assert.equal(result.cartItems[0].giftMessage, 'Happy birthday');
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

test('rejects selected variants when catalogue explicitly configures no options', () => {
  const result = reconcileCartWithCatalog(
    [{ id: 'p1', name: 'Jacket', priceGEL: 120, quantity: 1, selectedSize: 'M', selectedColor: 'Black' }],
    [{ id: 'p1', name: 'Jacket', price_gel: 120, stock: 4, available_sizes: [], available_colors: [] }]
  );
  assert.deepEqual(result.changes.map((change) => change.type), ['variant_size', 'variant_color']);
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


test('normalizes malformed legacy order item arrays without dropping valid lines', () => {
  const valid = { id: 'p-1', name: 'Jacket', quantity: 1 };
  assert.deepEqual(normalizeOrderItems([null, 'invalid', 4, [], valid, { id: 'p-2' }]), [valid, { id: 'p-2' }]);
  assert.deepEqual(normalizeOrderItems({ items: [] }), []);
  assert.deepEqual(normalizeOrderItems(null), []);
});


test('normalizes server order totals to finite nonnegative GEL values', () => {
  assert.equal(normalizeOrderTotal('123.45'), 123.45);
  assert.equal(normalizeOrderTotal(0), 0);
  for (const value of [-1, NaN, Infinity, -Infinity, 'Infinity', 'not-money', null, undefined]) {
    assert.equal(normalizeOrderTotal(value), 0);
  }
});
