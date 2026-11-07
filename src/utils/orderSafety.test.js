import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateCartSubtotalGEL,
  isValidGELAmount,
  calculateCheckoutTotals,
  calculateOrderLineRevenueGEL,
  reconcileCartWithCatalog,
  createSecureOrderId,
  groupCheckoutItems,
  isReusableCheckout,
  normalizeOrderItems,
  normalizeOrderTotal,
  validateOrderCreationResponse,
  CHECKOUT_CATALOG_SELECT
} from './orderSafety.js';

test('accepts only non-negative GEL values with at most two decimal places', () => {
  for (const value of ['0', '10', '10.5', '10.50', 0, 10.25, '1000000000.00']) {
    assert.equal(isValidGELAmount(value), true, String(value));
  }
  for (const value of ['', '-1', '1.001', '1,25', '1e2', '1000000000.01', null, undefined]) {
    assert.equal(isValidGELAmount(value), false, String(value));
  }
  assert.equal(isValidGELAmount('0.01', { min: 0.01, max: 100 }), true);
  assert.equal(isValidGELAmount('0', { min: 0.01, max: 100 }), false);
  assert.equal(isValidGELAmount('100.01', { min: 0.01, max: 100 }), false);
});

test('GEL amount validation accepts valid integer and decimal amounts', () => {
  assert.equal(isValidGELAmount('15'), true);
  assert.equal(isValidGELAmount('15.5'), true);
  assert.equal(isValidGELAmount('15.50'), true);
  assert.equal(isValidGELAmount('0.01'), true);
  assert.equal(isValidGELAmount('15.500'), false);
  assert.equal(isValidGELAmount('15,50'), false);
  assert.equal(isValidGELAmount('-15'), false);
});

test('cart subtotal uses the already-inclusive server-priced add-on line amount', () => {
  assert.equal(calculateCartSubtotalGEL([{
    priceGEL: 140,
    basePriceGEL: 120,
    giftWrap: true,
    vipWarranty: true,
    quantity: 2
  }]), 280);
});

test('uses the final server-priced unit amount without double-counting paid add-ons', () => {
  assert.equal(calculateOrderLineRevenueGEL({
    price: 140,
    base_price: 120,
    gift_wrap: true,
    vip_warranty: true,
    quantity: 2
  }), 280);
  assert.equal(calculateOrderLineRevenueGEL({
    priceGEL: 100,
    base_price: 90,
    gift_wrap: true,
    quantity: 1
  }), 100);
  assert.equal(calculateOrderLineRevenueGEL({ price: -5, quantity: 2 }), 0);
  assert.equal(calculateOrderLineRevenueGEL({ price: 'invalid', quantity: 0 }), 0);
});

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

test('flags missing required size and color selections before checkout', () => {
  const result = reconcileCartWithCatalog(
    [{ id: 'p1', name: 'Jacket', priceGEL: 120, quantity: 1 }],
    [{
      id: 'p1', name: 'Jacket', price_gel: 120, stock: 4,
      available_sizes: ['S', 'M', 'L'],
      available_colors: ['Black', 'White']
    }]
  );
  assert.deepEqual(result.changes.map(change => change.type), [
    'variant_size_missing',
    'variant_color_missing'
  ]);
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


test('does not merge different custom product variants into one order line', () => {
  const grouped = groupCheckoutItems([
    { id: 'p-variant', custom_variant_id: 'v-small', quantity: 1 },
    { id: 'p-variant', custom_variant_id: 'v-large', quantity: 2 },
    { id: 'p-variant', custom_variant_id: 'v-small', quantity: 3 }
  ]);
  assert.equal(grouped.length, 2);
  assert.deepEqual(grouped, [
    { id: 'p-variant', selected_size: null, selected_color: null, custom_variant_id: 'v-large', quantity: 2 },
    { id: 'p-variant', selected_size: null, selected_color: null, custom_variant_id: 'v-small', quantity: 4 }
  ]);
});

test('keeps paid add-ons attached to the exact custom variant in checkout fingerprints', () => {
  const grouped = groupCheckoutItems([
    { id: 'p-variant', custom_variant_id: 'v-small', quantity: 1, gift_wrap: true, vip_warranty: true, gift_message: 'Gift' },
    { id: 'p-variant', custom_variant_id: 'v-small', quantity: 2, gift_wrap: true, vip_warranty: true, gift_message: 'Gift' },
    { id: 'p-variant', custom_variant_id: 'v-large', quantity: 1, gift_wrap: true, vip_warranty: true, gift_message: 'Gift' }
  ]);
  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].custom_variant_id, 'v-large');
  assert.equal(grouped[0].quantity, 1);
  assert.equal(grouped[1].custom_variant_id, 'v-small');
  assert.equal(grouped[1].quantity, 3);
  assert.equal(grouped[1].gift_wrap, true);
  assert.equal(grouped[1].vip_warranty, true);
  assert.equal(grouped[1].gift_message, 'Gift');
});

test('reconciles selected custom variant price and stock against the current catalogue', () => {
  const result = reconcileCartWithCatalog(
    [{ id: 'p-variant', name: 'Pack', priceGEL: 20, basePriceGEL: 20, quantity: 2, customVariantId: 'v-small', customVariantName: 'Small pack' }],
    [{ id: 'p-variant', name: 'Pack', price_gel: 5, stock: 99, variants: [{ id: 'v-small', name: 'Small pack', priceGEL: 24, stock: 1 }] }]
  );
  assert.deepEqual(result.changes.map(change => change.type), ['price', 'stock']);
  assert.equal(result.changes[0].customVariantId, 'v-small');
  assert.equal(result.changes[1].customVariantId, 'v-small');
  assert.equal(result.cartItems[0].basePriceGEL, 24);
  assert.equal(result.cartItems[0].priceGEL, 24);
  assert.equal(result.cartItems[0].stock, 1);
});

test('requires a custom variant selection when the catalogue defines custom variants', () => {
  const result = reconcileCartWithCatalog(
    [{ id: 'p-variant', name: 'Pack', priceGEL: 20, quantity: 1 }],
    [{ id: 'p-variant', name: 'Pack', price_gel: 5, stock: 99, variants: [{ id: 'v1', name: 'One', priceGEL: 20, stock: 2 }] }]
  );
  assert.deepEqual(result.changes.map(change => change.type), ['variant_custom_missing']);
});


test('accepts a complete, internally consistent server checkout snapshot', () => {
  const orderId = `ORD-${'A1B2C3D4'.repeat(4)}`;
  assert.deepEqual(validateOrderCreationResponse({
    order_id: orderId,
    items: [{ id: 'p1', price: 100, quantity: 1 }],
    subtotal_gel: 100,
    discount_gel: 10,
    delivery_gel: 5,
    total_gel: 95
  }, orderId), { valid: true, orderId });
});

test('rejects missing, malformed, or mismatched checkout order IDs', () => {
  const orderId = `ORD-${'A1B2C3D4'.repeat(4)}`;
  assert.deepEqual(validateOrderCreationResponse(null, orderId), {
    valid: false,
    reason: 'missing_order_id'
  });
  assert.deepEqual(validateOrderCreationResponse({ order_id: 'ORD-123' }, orderId), {
    valid: false,
    reason: 'order_id_mismatch'
  });
  assert.deepEqual(validateOrderCreationResponse({ order_id: orderId.toLowerCase() }, orderId), {
    valid: false,
    reason: 'order_id_mismatch'
  });
  assert.deepEqual(validateOrderCreationResponse({ order_id: orderId }, 'ORD-not-secure'), {
    valid: false,
    reason: 'invalid_expected_id'
  });
});

test('rejects incomplete, negative, or internally inconsistent server totals', () => {
  const orderId = `ORD-${'A1B2C3D4'.repeat(4)}`;
  const valid = {
    order_id: orderId,
    items: [{ id: 'p1', price: 100, quantity: 1 }],
    subtotal_gel: 100,
    discount_gel: 10,
    delivery_gel: 5,
    total_gel: 95
  };
  assert.deepEqual(validateOrderCreationResponse({ ...valid, total_gel: undefined }, orderId), {
    valid: false,
    reason: 'invalid_totals'
  });
  assert.deepEqual(validateOrderCreationResponse({ ...valid, discount_gel: -1 }, orderId), {
    valid: false,
    reason: 'invalid_totals'
  });
  assert.deepEqual(validateOrderCreationResponse({ ...valid, delivery_gel: null }, orderId), {
    valid: false,
    reason: 'invalid_totals'
  });
  assert.deepEqual(validateOrderCreationResponse({ ...valid, total_gel: 94.99 }, orderId), {
    valid: false,
    reason: 'inconsistent_totals'
  });
  assert.deepEqual(validateOrderCreationResponse({ ...valid, items: [] }, orderId), {
    valid: false,
    reason: 'missing_items'
  });
});


test('checkout catalogue selection includes custom variants for live cart reconciliation', () => {
  for (const field of ['id', 'name', 'price_gel', 'stock', 'available_sizes', 'available_colors', 'variants']) {
    assert.ok(CHECKOUT_CATALOG_SELECT.split(',').includes(field), `missing ${field}`);
  }
});


test('sums cart line prices in integer tetri without floating-point drift', () => {
  assert.equal(calculateCartSubtotalGEL([
    { priceGEL: 0.1, quantity: 1 },
    { priceGEL: 0.2, quantity: 1 },
    { priceGEL: 0.1, quantity: 3 }
  ]), 0.6);
  assert.equal(calculateCartSubtotalGEL([
    { priceGEL: 9.9, quantity: 1 },
    { priceGEL: 0.1, quantity: 1 }
  ]), 10);
  assert.equal(calculateCartSubtotalGEL([
    { priceGEL: 10, quantity: 2 },
    { priceGEL: -5, quantity: 1 },
    { priceGEL: 'invalid', quantity: 1 }
  ]), 20);
});

test('includes per-unit gift and VIP add-ons exactly once in cart totals', () => {
  const subtotal = calculateCartSubtotalGEL([
    { priceGEL: 140, basePriceGEL: 120, giftWrap: true, vipWarranty: true, quantity: 2 },
    { priceGEL: 105, basePriceGEL: 100, giftWrap: true, vipWarranty: false, quantity: 3 }
  ]);

  // (120 + 5 + 15) * 2 + (100 + 5) * 3 = 595 GEL.
  assert.equal(subtotal, 595);
  assert.deepEqual(
    calculateCheckoutTotals({ subtotal, discountPercent: 15, deliveryFee: 12.5 }),
    { subtotalGEL: 595, discountGEL: 89.25, deliveryGEL: 12.5, totalGEL: 518.25 }
  );
});

test('rounds subtotal and delivery to exact tetri before discount calculation', () => {
  assert.deepEqual(
    calculateCheckoutTotals({
      subtotal: 0.1 + 0.2,
      discountPercent: 10,
      deliveryFee: 0.1 + 0.2
    }),
    { subtotalGEL: 0.3, discountGEL: 0.03, deliveryGEL: 0.3, totalGEL: 0.57 }
  );
});
