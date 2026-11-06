import test from 'node:test';
import assert from 'node:assert/strict';

import {
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
