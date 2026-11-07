import test from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateCartSubtotalGEL,
  isValidGELAmount,
  calculateCheckoutTotals,
  calculateOrderLineRevenueGEL,
  normalizeOrderQuantity,
  reconcileCartWithCatalog,
  classifyCartReconciliationChanges,
  createSecureOrderId,
  groupCheckoutItems,
  buildCheckoutFingerprintPayload,
  isReusableCheckout,
  findReusablePendingCheckout,
  parsePendingCheckoutEntries,
  removePendingCheckoutEntry,
  upsertPendingCheckoutEntry,
  mergePendingCheckoutStores,
  PENDING_CHECKOUT_TTL_MS,
  normalizeOrderItems,
  normalizeOrderTotal,
  validateOrderCreationResponse,
  CHECKOUT_CATALOG_SELECT
} from './orderSafety.js';

test('checkout retry fingerprints are isolated by authenticated owner identity', () => {
  const base = {
    customerName: 'Test Customer',
    phone: '555123456',
    address: 'Test address',
    userEmail: 'customer@example.com',
    customerEmail: 'customer@example.com',
    items: [{ id: 'p-1', quantity: 1 }],
    couponCode: '',
    deliveryRegion: 'tbilisi'
  };
  const accountA = buildCheckoutFingerprintPayload({ ...base, ownerId: 'user-a' });
  const accountB = buildCheckoutFingerprintPayload({ ...base, ownerId: 'user-b' });
  const guest = buildCheckoutFingerprintPayload({ ...base, ownerId: null });
  assert.equal(accountA.owner_id, 'user-a');
  assert.equal(accountB.owner_id, 'user-b');
  assert.equal(guest.owner_id, 'guest');
  assert.notEqual(JSON.stringify(accountA), JSON.stringify(accountB));
  assert.notEqual(JSON.stringify(accountA), JSON.stringify(guest));
});

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

test('calculates the confirmed total from add-on-inclusive subtotal, coupon, and delivery', () => {
  const subtotal = calculateCartSubtotalGEL([{
    priceGEL: 140,
    basePriceGEL: 120,
    giftWrap: true,
    vipWarranty: true,
    quantity: 2
  }]);
  assert.deepEqual(
    calculateCheckoutTotals({ subtotal, discountPercent: 10, deliveryFee: 7 }),
    { subtotalGEL: 280, discountGEL: 28, deliveryGEL: 7, totalGEL: 259 }
  );
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
  assert.equal(calculateOrderLineRevenueGEL({ price: 25, quantity: 0 }), 0);
  assert.equal(calculateOrderLineRevenueGEL({ price: 25, quantity: -2 }), 0);
  assert.equal(calculateOrderLineRevenueGEL({ price: 25, quantity: 1.5 }), 0);
  assert.equal(calculateOrderLineRevenueGEL({ price: 25 }), 25);
  assert.equal(normalizeOrderQuantity('3'), 3);
  assert.equal(normalizeOrderQuantity('0'), 0);
  assert.equal(normalizeOrderQuantity('1.5'), 0);
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

test('reuses only matching secure pending checkouts within the 24-hour recovery window', () => {
  const now = 1_800_000_000_000;
  const entry = { fingerprint: 'digest-123', orderId: `ORD-${'A'.repeat(32)}`, createdAt: now };
  assert.equal(isReusableCheckout(entry, 'digest-123', now), true);
  assert.equal(isReusableCheckout({ ...entry, createdAt: now - PENDING_CHECKOUT_TTL_MS }, 'digest-123', now), true);
  assert.equal(isReusableCheckout({ ...entry, createdAt: now - PENDING_CHECKOUT_TTL_MS - 1 }, 'digest-123', now), false);
  assert.equal(isReusableCheckout({ ...entry, createdAt: now + 1 }, 'digest-123', now), false);
  assert.equal(isReusableCheckout({ ...entry, createdAt: undefined }, 'digest-123', now), false);
  assert.equal(isReusableCheckout(entry, 'different-digest', now), false);
  assert.equal(isReusableCheckout({ ...entry, orderId: 'ORD-not-valid' }, 'digest-123', now), false);
  assert.equal(isReusableCheckout(entry, '', now), false);
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

test('matches PostgreSQL half-up discount rounding using integer basis points', () => {
  assert.deepEqual(
    calculateCheckoutTotals({ subtotal: 3.75, discountPercent: 34.8, deliveryFee: 0 }),
    { subtotalGEL: 3.75, discountGEL: 1.31, deliveryGEL: 0, totalGEL: 2.44 }
  );
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


test('classifies unavailable products, option changes, stock limits, and price changes separately', () => {
  assert.equal(classifyCartReconciliationChanges([{ type: 'unavailable' }]), 'unavailable');
  assert.equal(classifyCartReconciliationChanges([{ type: 'invalid_price' }]), 'unavailable');
  assert.equal(classifyCartReconciliationChanges([{ type: 'variant_custom_unavailable' }]), 'unavailable');
  assert.equal(classifyCartReconciliationChanges([{ type: 'variant_size_missing' }]), 'options');
  assert.equal(classifyCartReconciliationChanges([{ type: 'variant_color' }]), 'options');
  assert.equal(classifyCartReconciliationChanges([{ type: 'unavailable_stock' }]), 'stock');
  assert.equal(classifyCartReconciliationChanges([{ type: 'stock' }]), 'stock');
  assert.equal(classifyCartReconciliationChanges([{ type: 'price' }]), 'price');
  assert.equal(classifyCartReconciliationChanges([]), 'review');
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


test('groups the same custom variant across separate cart lines for aggregate stock checks', () => {
  const grouped = groupCheckoutItems([
    { id: 'p-variant', custom_variant_id: 'v-1', quantity: 2 },
    { id: 'p-variant', custom_variant_id: 'v-1', quantity: 3 },
    { id: 'p-variant', custom_variant_id: 'v-2', quantity: 1 }
  ]);
  assert.deepEqual(grouped, [
    { id: 'p-variant', selected_size: null, selected_color: null, custom_variant_id: 'v-1', quantity: 5 },
    { id: 'p-variant', selected_size: null, selected_color: null, custom_variant_id: 'v-2', quantity: 1 }
  ]);
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

test('reconciles snake_case custom variant prices accepted by the server RPC', () => {
  const result = reconcileCartWithCatalog(
    [{ id: 'p-variant', name: 'Pack', priceGEL: 20, basePriceGEL: 20, quantity: 1, customVariantId: 'v-small' }],
    [{ id: 'p-variant', name: 'Pack', price_gel: 5, stock: 10, variants: [{ id: 'v-small', name: 'Small pack', price_gel: 24.5, stock: 3 }] }]
  );
  assert.deepEqual(result.changes.map(change => change.type), ['price']);
  assert.equal(result.cartItems[0].basePriceGEL, 24.5);
  assert.equal(result.cartItems[0].priceGEL, 24.5);
  assert.equal(result.cartItems[0].stock, 3);
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


const pendingEntry = (fingerprint, suffix, createdAt = 1_000) => ({
  fingerprint,
  orderId: `ORD-${suffix.repeat(32)}`,
  createdAt
});

test('migrates a valid legacy single pending checkout entry', () => {
  const legacy = JSON.stringify(pendingEntry('fingerprint-a', 'A'));
  assert.deepEqual(parsePendingCheckoutEntries(legacy, 1_000), [pendingEntry('fingerprint-a', 'A')]);
  assert.equal(
    findReusablePendingCheckout(legacy, 'fingerprint-a', 1_000).orderId,
    pendingEntry('fingerprint-a', 'A').orderId
  );
});

test('keeps multiple different checkout fingerprints without overwriting prior retries', () => {
  const first = pendingEntry('fingerprint-a', 'A');
  const second = pendingEntry('fingerprint-b', 'B', 1_100);
  const withFirst = upsertPendingCheckoutEntry('', first, 1_100);
  const withBoth = upsertPendingCheckoutEntry(withFirst, second, 1_100);
  assert.deepEqual(
    parsePendingCheckoutEntries(withBoth, 1_100).map((saved) => saved.fingerprint),
    ['fingerprint-a', 'fingerprint-b']
  );
  assert.equal(findReusablePendingCheckout(withBoth, 'fingerprint-a', 1_100).orderId, first.orderId);
  assert.equal(findReusablePendingCheckout(withBoth, 'fingerprint-b', 1_100).orderId, second.orderId);
});

test('updating one fingerprint does not erase another checkout entry', () => {
  const first = pendingEntry('fingerprint-a', 'A');
  const second = pendingEntry('fingerprint-b', 'B');
  const initial = upsertPendingCheckoutEntry(upsertPendingCheckoutEntry('', first, 1_000), second, 1_000);
  const refreshedFirst = { ...first, orderId: pendingEntry('fingerprint-a', 'C').orderId, createdAt: 1_050 };
  const updated = upsertPendingCheckoutEntry(initial, refreshedFirst, 1_050);
  assert.equal(findReusablePendingCheckout(updated, 'fingerprint-a', 1_050).orderId, refreshedFirst.orderId);
  assert.equal(findReusablePendingCheckout(updated, 'fingerprint-b', 1_050).orderId, second.orderId);
});

test('removes only the confirmed order and preserves other pending checkouts', () => {
  const first = pendingEntry('fingerprint-a', 'A');
  const second = pendingEntry('fingerprint-b', 'B');
  const initial = upsertPendingCheckoutEntry(upsertPendingCheckoutEntry('', first, 1_000), second, 1_000);
  const remaining = removePendingCheckoutEntry(initial, first.orderId, 1_000);
  assert.equal(findReusablePendingCheckout(remaining, 'fingerprint-a', 1_000), null);
  assert.equal(findReusablePendingCheckout(remaining, 'fingerprint-b', 1_000).orderId, second.orderId);
});

test('drops expired and malformed entries while retaining the 24-hour retry window', () => {
  const now = 50_000_000;
  const fresh = pendingEntry('fresh', 'A', now - PENDING_CHECKOUT_TTL_MS);
  const expired = pendingEntry('expired', 'B', now - PENDING_CHECKOUT_TTL_MS - 1);
  const malformed = { fingerprint: 'bad', orderId: 'not-an-order-id', createdAt: now };
  const raw = JSON.stringify({ version: 3, entries: [fresh, expired, malformed] });
  assert.deepEqual(parsePendingCheckoutEntries(raw, now), [fresh]);
});

test('merges legacy pending retry with existing v3 entries without losing either', () => {
  const legacy = JSON.stringify(pendingEntry('legacy-fingerprint', 'A', 1_000));
  const current = upsertPendingCheckoutEntry(
    '',
    pendingEntry('current-fingerprint', 'B', 1_100),
    1_100
  );

  const merged = mergePendingCheckoutStores(current, legacy, 1_100);
  assert.deepEqual(
    parsePendingCheckoutEntries(merged, 1_100).map((entry) => entry.fingerprint),
    ['legacy-fingerprint', 'current-fingerprint']
  );
  assert.equal(
    findReusablePendingCheckout(merged, 'legacy-fingerprint', 1_100).orderId,
    pendingEntry('legacy-fingerprint', 'A').orderId
  );
});

test('prefers v3 version of duplicate fingerprint while merging legacy store', () => {
  const legacy = JSON.stringify(pendingEntry('same-fingerprint', 'A', 1_000));
  const currentEntry = pendingEntry('same-fingerprint', 'B', 1_050);
  const current = upsertPendingCheckoutEntry('', currentEntry, 1_050);
  const merged = mergePendingCheckoutStores(current, legacy, 1_100);
  assert.deepEqual(parsePendingCheckoutEntries(merged, 1_100), [currentEntry]);
});
