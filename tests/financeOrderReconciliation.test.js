import test from 'node:test';
import assert from 'node:assert/strict';
import { splitOrderRevenue } from '../src/utils/orderSafety.js';
import { getFinancialDeliveryCharge, getFinancialOrderEventDate, isReconciledOrderRevenue } from '../src/utils/financeOrderReconciliation.js';

const checkout = {
  items: [{ id: 'p1', price: 120, base_price: 100, addon_total: 20, quantity: 2 }],
  totalGEL: 197,
  checkoutBreakdown: { subtotalGEL: 240, discountGEL: 48, deliveryGEL: 5 },
  address: 'მიწოდება: 999 ₾'
};

test('server-confirmed checkout delivery fee wins over conflicting address display text', () => {
  assert.equal(getFinancialDeliveryCharge(checkout), 5);
  assert.equal(getFinancialDeliveryCharge({ checkoutBreakdown: { deliveryGEL: 0 }, address: 'მიწოდება: 9 ₾' }), 0);
  assert.equal(getFinancialDeliveryCharge({ address: 'მიწოდება: 8,50 ₾' }), 8.5);
  assert.equal(getFinancialDeliveryCharge({ address: 'მიწოდება: განუსაზღვრელი' }), 0);
});

test('delivered and cancelled orders use status-change date; pending uses creation date', () => {
  const order = { created_at: '2026-08-01T10:00:00Z', status_changed_at: '2026-11-21T11:00:00Z' };
  assert.equal(getFinancialOrderEventDate(order, true), order.status_changed_at);
  assert.equal(getFinancialOrderEventDate(order, false), order.created_at);
  assert.equal(getFinancialOrderEventDate({ created_at: order.created_at }, true), order.created_at);
  assert.equal(getFinancialOrderEventDate({ createdAt: 'old', statusChangedAt: 'new' }, true), 'new');
});

test('discounted server checkout reconciles all four financial revenue components', () => {
  const split = splitOrderRevenue(checkout.items, checkout.totalGEL, getFinancialDeliveryCharge(checkout));
  assert.equal(split.productRevenue, 160);
  assert.equal(split.addonRevenue, 32);
  assert.equal(split.deliveryRevenue, 5);
  assert.equal(isReconciledOrderRevenue(checkout.totalGEL, split, checkout.checkoutBreakdown), true);
});

test('invalid historical item revenue cannot be presented as reconciled profit', () => {
  const split = splitOrderRevenue([{ id: 'p1', price: 10, base_price: 10, quantity: 1 }], 100, 0);
  assert.equal(isReconciledOrderRevenue(100, split), false);
  assert.equal(isReconciledOrderRevenue(0, { productRevenue: 0, addonRevenue: 0, deliveryRevenue: 0, itemProductRevenue: [] }), true);
  assert.equal(isReconciledOrderRevenue(NaN, split), false);
  assert.equal(isReconciledOrderRevenue(100, { ...split, productRevenue: Infinity }), false);
});

test('checkout summary, allocation and line totals must all match to the tetri', () => {
  const split = splitOrderRevenue(checkout.items, checkout.totalGEL, getFinancialDeliveryCharge(checkout));
  const wrong = [
    { ...split, productRevenue: split.productRevenue + 3 },
    { ...split, itemProductRevenue: [0] },
    { ...split, deliveryRevenue: 5.1 }
  ];
  wrong.forEach(candidate => assert.equal(isReconciledOrderRevenue(checkout.totalGEL, candidate, checkout.checkoutBreakdown), false));
  assert.equal(isReconciledOrderRevenue(checkout.totalGEL, split, { ...checkout.checkoutBreakdown, deliveryGEL: 4 }), false);
  assert.equal(isReconciledOrderRevenue(checkout.totalGEL, split, { ...checkout.checkoutBreakdown, discountGEL: 60 }), false);
});

test('reported totals retain numeric-string currency support but cannot turn malformed values into zero', () => {
  const noRevenue = { productRevenue: 0, addonRevenue: 0, deliveryRevenue: 0, itemProductRevenue: [] };
  assert.equal(isReconciledOrderRevenue('0.00', noRevenue), true);
  assert.equal(isReconciledOrderRevenue('197.00', splitOrderRevenue(checkout.items, checkout.totalGEL, getFinancialDeliveryCharge(checkout)), checkout.checkoutBreakdown), true);
  for (const invalid of [null, undefined, '', '  ', -5, '-5', 'NaN', 'Infinity', '9abc', '1.234', {}, true]) {
    assert.equal(isReconciledOrderRevenue(invalid, noRevenue), false, JSON.stringify(invalid));
  }
});
