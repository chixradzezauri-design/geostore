import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
const sql = await readFile(new URL('../supabase/migrations/20261107115218_persist_checkout_addons_server_pricing.sql', import.meta.url), 'utf8');
const safety = await readFile(new URL('../src/utils/orderSafety.js', import.meta.url), 'utf8');

test('finance uses checkout snapshots to split base product and add-on amounts', () => {
  assert.match(sql, /'base_price', v_product\.price_gel/);
  assert.match(sql, /'addon_total', v_item\.addon_fee/);
  assert.match(admin, /splitOrderRevenue\(items, orderTotal, deliveryCharge\)/);
  assert.match(admin, /totalAddonRevenue \+= revenueSplit\.addonRevenue/);
  assert.match(admin, /revenueSplit\.itemProductRevenue\[itemIndex\]/);
  assert.match(safety, /const discountFactor = itemGross > 0 \? Math\.min\(1, paidForItems \/ itemGross\) : 0/);
});

test('un-costed add-on revenue is disclosed separately and excluded from calculated profit', () => {
  assert.match(admin, /totalProductRevenue \+= revenueSplit\.productRevenue/);
  assert.match(admin, /totalAddonRevenue,\s*totalExpenses, totalCogs, grossProfit, netProfit/);
  assert.match(admin, /const grossProfit = unknownCogsItems === 0 && estimatedCogsItems === 0 && unreconciledDeliveredOrders === 0 \? totalProductRevenue - totalCogs : null/);
  assert.match(admin, /const netProfit = grossProfit === null \? null : grossProfit \+ totalDeliveryRevenue - totalExpenses/);
  assert.match(admin, /დამატებითი მომსახურებების შემოსავალი \(მოგებაში არ არის ჩათვლილი\)/);
  assert.match(admin, /პროდუქტი, დამატებითი მომსახურება და მიწოდება/);
});

test('historical order purchase-cost snapshot remains preferred over current catalogue cost', () => {
  assert.match(admin, /const snapshotCost = item\.purchase_cost \?\? item\.purchaseCost/);
  assert.match(admin, /if \(hasSnapshotCost\) itemCost = Number\(snapshotCost\)/);
  assert.match(admin, /else if \(isEstimatedCost\)/);
  assert.match(admin, /estimatedCogsItems \+= quantity/);
});

test('confirmed checkout delivery and per-order revenue must reconcile before profit', () => {
  assert.match(admin, /getFinancialDeliveryCharge\(order\)/);
  assert.match(admin, /isReconciledOrderRevenue\(rawOrderTotal, revenueSplit, order\.checkoutBreakdown\)/);
  assert.match(admin, /unreconciledDeliveredOrders === 0/);
  assert.match(admin, /financialOverview\.unreconciledDeliveredOrders/);
});
