import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
const orderStatusSql = await readFile(new URL('../supabase/migrations/20261107084940_harden_order_status_stock_transitions.sql', import.meta.url), 'utf8');

test('cancelled orders are reported separately and never included in delivered sales', () => {
  assert.match(admin, /const cancelledOrders = periodOrders\.filter\(isCancelled\)/);
  assert.match(admin, /const cancelledOrderValue = cancelledOrders\.reduce\([\s\S]*?normalizeOrderTotal\(order\.totalGEL \?\? order\.total_gel\)/);
  assert.match(admin, /const deliveredOrders = periodOrders\.filter\(order => !isCancelled\(order\) && isDelivered\(order\)\)/);
  assert.match(admin, /totalSalesRevenue \+= orderTotal/);
  assert.match(admin, /cancelledOrders, cancelledOrderValue/);
});

test('cancelled-order reporting labels nominal order value, not a confirmed refund', () => {
  assert.match(admin, /არ არის დადასტურებული დაბრუნება/);
  assert.match(admin, /არ არის დაბრუნების თანხა/);
  assert.match(admin, /არ ითვლება გაყიდვად ან დადასტურებულ დაბრუნებად/);
});

test('completed and shipped orders cannot be rolled back as a substitute for a return workflow', () => {
  assert.match(orderStatusSql, /v_order\.status in \('დასრულებული', 'ჩაბარებულია'\)[\s\S]*?p_new_status not in \('დასრულებული', 'ჩაბარებულია'\)/);
  assert.match(orderStatusSql, /v_order\.status in \('გაგზავნილი', 'გზაშია'\)[\s\S]*?p_new_status not in \('გაგზავნილი', 'გზაშია', 'დასრულებული', 'ჩაბარებულია'\)/);
});

test('cancelled orders count by transition date, falling back to historic creation date', () => {
  assert.match(admin, /const closed = isCancelled\(order\) \|\| isDelivered\(order\)/);
  assert.match(admin, /getFinancialOrderEventDate\(order, closed\)/);
});
