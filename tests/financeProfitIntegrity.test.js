import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const admin = readFileSync(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('historical delivered total is reconciled before normalization can mask malformed values', () => {
  const financialLoop = admin.slice(
    admin.indexOf('    deliveredOrders.forEach(order => {'),
    admin.indexOf('    const trendBuckets = new Map();')
  );
  assert.match(financialLoop, /const rawOrderTotal = Object\.prototype\.hasOwnProperty\.call\(order, 'rawTotalGEL'\)/);
  assert.match(financialLoop, /const orderTotal = normalizeOrderTotal\(rawOrderTotal\)/);
  assert.match(financialLoop, /if \(!isReconciledOrderRevenue\(rawOrderTotal, revenueSplit, order\.checkoutBreakdown\)\)/);
  assert.ok(financialLoop.indexOf('isReconciledOrderRevenue(rawOrderTotal') < financialLoop.indexOf('totalDeliveryRevenue += revenueSplit.deliveryRevenue'));
});

test('product and vendor gross profit and margin stay unknown when any delivered order is unreconciled', () => {
  const profitability = admin.slice(
    admin.indexOf('      productProfitability: Array.from(productProfitTotals.values())'),
    admin.indexOf('      expenseBreakdown: Array.from(expenseTotals.values())')
  );
  const guarded = profitability.match(/unreconciledDeliveredOrders > 0/g) || [];
  assert.equal(guarded.length, 4);
  assert.match(profitability, /grossProfit: item\.unknownCostItems > 0 \|\| item\.estimatedCostItems > 0 \|\| unreconciledDeliveredOrders > 0 \? null : item\.revenue - item\.cogs/);
  assert.match(profitability, /margin: item\.unknownCostItems > 0 \|\| item\.estimatedCostItems > 0 \|\| unreconciledDeliveredOrders > 0 \|\| item\.revenue <= 0 \? null/);
  assert.match(admin, /const grossProfit = unknownCogsItems === 0 && estimatedCogsItems === 0 && unreconciledDeliveredOrders === 0 \? totalProductRevenue - totalCogs : null/);
});
