import test from 'node:test';
import assert from 'node:assert/strict';
import { getOrderDeliveryCharge } from './adminAnalytics.js';

test('uses the trusted checkout breakdown for current orders', () => {
  assert.equal(getOrderDeliveryCharge({
    address: 'თბილისი, მიწოდება: 20 ₾',
    checkoutBreakdown: { deliveryGEL: 8 }
  }), 8);
});

test('preserves an explicit zero delivery charge from checkout', () => {
  assert.equal(getOrderDeliveryCharge({
    address: 'თბილისი, მიწოდება: 20 ₾',
    checkoutBreakdown: { deliveryGEL: 0 }
  }), 0);
});

test('supports raw checkout result snapshots', () => {
  assert.equal(getOrderDeliveryCharge({ checkout_result: { delivery_gel: '12.50' } }), 12.5);
});

test('falls back to the legacy address format when no financial snapshot exists', () => {
  assert.equal(getOrderDeliveryCharge({ address: 'ქუთაისი, მიწოდება: 5,50 ₾' }), 5.5);
});

test('returns zero for missing or invalid delivery information', () => {
  assert.equal(getOrderDeliveryCharge({ address: 'თბილისი' }), 0);
  assert.equal(getOrderDeliveryCharge({ address: 'თბილისი, მიწოდება: 20 ₾', checkoutBreakdown: { deliveryGEL: '-3' } }), 0);
});
