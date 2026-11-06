import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSecureOrderId,
  groupCheckoutItems,
  isReusableCheckout
} from '../src/utils/orderSafety.js';

test('groups repeated product lines only when size and color also match', () => {
  const result = groupCheckoutItems([
    { id: 12, selected_size: 'M', selected_color: 'შავი', quantity: 2 },
    { id: '12', selected_size: 'M', selected_color: 'შავი', quantity: 3 },
    { id: 12, selected_size: 'L', selected_color: 'შავი', quantity: 1 },
    { id: 12, selected_size: 'M', selected_color: 'თეთრი', quantity: 4 }
  ]);

  assert.deepEqual(result, [
    { id: '12', selected_size: 'L', selected_color: 'შავი', quantity: 1 },
    { id: '12', selected_size: 'M', selected_color: 'შავი', quantity: 5 },
    { id: '12', selected_size: 'M', selected_color: 'თეთრი', quantity: 4 }
  ]);
});

test('empty or invalid item collections produce an empty list', () => {
  assert.deepEqual(groupCheckoutItems([]), []);
  assert.deepEqual(groupCheckoutItems(null), []);
});

test('reuses only an exact fingerprint with a well-formed generated order ID', () => {
  const valid = { fingerprint: 'digest-1', orderId: `ORD-${'A'.repeat(32)}` };

  assert.equal(isReusableCheckout(valid, 'digest-1'), true);
  assert.equal(isReusableCheckout(valid, 'digest-2'), false);
  assert.equal(isReusableCheckout({ ...valid, orderId: 'ORD-123' }, 'digest-1'), false);
  assert.equal(isReusableCheckout({ ...valid, orderId: valid.orderId.toLowerCase() }, 'digest-1'), false);
  assert.equal(isReusableCheckout(null, 'digest-1'), false);
});

test('generates a 128-bit uppercase hexadecimal order ID', () => {
  const fakeCrypto = {
    getRandomValues(bytes) {
      bytes.forEach((_, index) => { bytes[index] = index; });
      return bytes;
    }
  };

  assert.equal(createSecureOrderId(fakeCrypto), 'ORD-000102030405060708090A0B0C0D0E0F');
});

test('fails closed when secure random generation is unavailable', () => {
  assert.throws(() => createSecureOrderId(null), /უსაფრთხო შეკვეთის ნომრის გენერირება/);
});
