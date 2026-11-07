import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCheckoutContact,
  validateCheckoutItems
} from '../src/utils/checkoutValidation.js';
import { getCheckoutErrorMessage } from '../src/utils/checkoutMessages.js';

const validContact = {
  name: 'Test Customer',
  phone: '+995 555 12-34-56',
  email: 'customer@example.com',
  address: 'Tbilisi, Rustaveli 10'
};

test('accepts valid Georgian/international phone formatting', () => {
  assert.deepEqual(validateCheckoutContact(validContact), { valid: true });
});

test('rejects phone numbers with misplaced or repeated plus signs', () => {
  for (const phone of ['995+555123456', '++995555123456', '+995+555123456']) {
    assert.deepEqual(
      validateCheckoutContact({ ...validContact, phone }),
      { valid: false, field: 'phone' }
    );
  }
});

test('rejects phone control characters and digit counts outside 9–15', () => {
  for (const phone of ['+995 555\n123456', '12345678', '1234567890123456']) {
    assert.deepEqual(
      validateCheckoutContact({ ...validContact, phone }),
      { valid: false, field: 'phone' }
    );
  }
});

test('validates name, address and optional/required email consistently', () => {
  assert.deepEqual(validateCheckoutContact({ ...validContact, name: 'A' }), { valid: false, field: 'name' });
  assert.deepEqual(validateCheckoutContact({ ...validContact, address: '  ' }), { valid: false, field: 'address' });
  assert.deepEqual(validateCheckoutContact({ ...validContact, email: 'bad-email' }), { valid: false, field: 'email' });
  assert.deepEqual(validateCheckoutContact({ ...validContact, email: '', requireEmail: false }), { valid: true });
  assert.deepEqual(validateCheckoutContact({ ...validContact, email: '', requireEmail: true }), { valid: false, field: 'email' });
});

test('rejects malformed cart collections and product quantities', () => {
  assert.deepEqual(validateCheckoutItems(null), { valid: false, reason: 'count' });
  assert.deepEqual(validateCheckoutItems([]), { valid: false, reason: 'count' });
  assert.deepEqual(validateCheckoutItems(Array.from({ length: 51 }, (_, i) => ({ id: String(i), quantity: 1 }))), { valid: false, reason: 'count' });
  assert.deepEqual(validateCheckoutItems([{ id: 'p1', quantity: 0 }]), { valid: false, reason: 'item' });
  assert.deepEqual(validateCheckoutItems([{ id: 'p1', quantity: 1.5 }]), { valid: false, reason: 'item' });
  assert.deepEqual(validateCheckoutItems([{ id: 'p1', quantity: 101 }]), { valid: false, reason: 'item' });
});

test('enforces aggregate quantity per product across selected variants', () => {
  assert.deepEqual(validateCheckoutItems([
    { id: 'p1', quantity: 60, selected_size: 'M' },
    { id: 'p1', quantity: 41, selected_size: 'L' }
  ]), { valid: false, reason: 'quantity' });

  assert.deepEqual(validateCheckoutItems([
    { id: 'p1', quantity: 60, selected_size: 'M' },
    { id: 'p1', quantity: 40, selected_size: 'L' }
  ]), { valid: true });
});

test('rejects excessively long selected variants', () => {
  assert.deepEqual(validateCheckoutItems([
    { id: 'p1', quantity: 1, selected_size: 'M'.repeat(41) }
  ]), { valid: false, reason: 'variant' });
});

test('validates structured gift wrap and VIP warranty options', () => {
  assert.deepEqual(validateCheckoutItems([{
    id: 'p1', quantity: 1, gift_wrap: true, vip_warranty: true, gift_message: 'Happy birthday'
  }]), { valid: true });
  assert.deepEqual(validateCheckoutItems([{
    id: 'p1', quantity: 1, gift_wrap: false, gift_message: 'not allowed'
  }]), { valid: false, reason: 'addons' });
  assert.deepEqual(validateCheckoutItems([{
    id: 'p1', quantity: 1, gift_wrap: 'true'
  }]), { valid: false, reason: 'addons' });
  assert.deepEqual(validateCheckoutItems([{
    id: 'p1', quantity: 1, gift_wrap: true, gift_message: 'x'.repeat(241)
  }]), { valid: false, reason: 'addons' });
});

test('translates known checkout errors and safely falls back for unknown errors', () => {
  assert.equal(
    getCheckoutErrorMessage('ტელეფონის ნომერი უნდა შეიცავდეს 9–15 ციფრს.', 'en'),
    'Enter a phone number containing 9–15 digits.'
  );
  assert.match(getCheckoutErrorMessage('unknown server error', 'ru'), /Не удалось оформить заказ/);
  assert.equal(getCheckoutErrorMessage('server error', 'ka'), 'server error');
});
