import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeCrmCustomersFromOrders } from '../src/utils/adminCrm.js';

test('CRM directory aggregates repeated orders for one customer', () => {
  const result = mergeCrmCustomersFromOrders([], [
    { id: 'o-1', customer_name: 'ანა', customer_email: 'ANA@example.com', phone: '+995 555 12 34 56', total_gel: 40, created_at: '2026-11-10T10:00:00Z' },
    { id: 'o-2', customer_name: 'ანა ბ.', customer_email: 'ana@example.com', phone: '+995555123456', total_gel: 60, created_at: '2026-11-12T10:00:00Z' }
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].orderCount, 2);
  assert.equal(result[0].totalSpent, 100);
  assert.equal(result[0].name, 'ანა ბ.');
  assert.equal(result[0].lastOrderId, 'o-2');
  assert.equal(result[0].isOrderDerived, true);
});

test('CRM directory preserves legacy VIP, discount, and notes by email', () => {
  const legacy = [{ id: 'legacy-1', name: 'Old Name', email: 'buyer@example.com', phone: '5551234', isVip: true, discountPercent: 12, adminNotes: 'Keep note' }];
  const result = mergeCrmCustomersFromOrders(legacy, [
    { id: 'o-1', customer_name: 'Buyer', customer_email: 'BUYER@example.com', phone: '5551234', total_gel: 25, created_at: '2026-11-12T10:00:00Z' }
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'legacy-1');
  assert.equal(result[0].isVip, true);
  assert.equal(result[0].discountPercent, 12);
  assert.equal(result[0].adminNotes, 'Keep note');
  assert.equal(result[0].orderCount, 1);
  assert.equal(result[0].isLocalCrmRecord, true);
});

test('CRM directory matches a returning customer by phone when their email changes', () => {
  const result = mergeCrmCustomersFromOrders([], [
    { id: 'o-1', customer_name: 'Giorgi', customer_email: 'old@example.com', phone: '555111222', total_gel: 10, created_at: '2026-11-10T10:00:00Z' },
    { id: 'o-2', customer_name: 'Giorgi', customer_email: 'new@example.com', phone: '+995 555 111 222', total_gel: 15, created_at: '2026-11-11T10:00:00Z' }
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].orderCount, 2);
  assert.equal(result[0].totalSpent, 25);
  assert.equal(result[0].email, 'new@example.com');
});

test('CRM directory ignores duplicate order IDs and invalid records', () => {
  const orders = [{ id: 'o-1', customer_email: 'x@example.com', total_gel: 9 }, { id: 'o-1', customer_email: 'x@example.com', total_gel: 9 }, null];
  const result = mergeCrmCustomersFromOrders([], orders);
  assert.equal(result.length, 1);
  assert.equal(result[0].orderCount, 1);
  assert.equal(orders.length, 3);
});

test('legacy-only CRM records remain visible without order history', () => {
  const result = mergeCrmCustomersFromOrders([{ id: 'old', name: 'Legacy', email: 'legacy@example.com', isVip: true }], []);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'Legacy');
  assert.equal(result[0].isVip, true);
  assert.equal(result[0].orderCount, 0);
});
