import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const admin=readFileSync(new URL('../src/components/AdminDashboardPro.jsx',import.meta.url),'utf8');

test('admin orders must be verified by live permission both before and after pagination',()=>{
  const part=app.slice(app.indexOf('  const fetchOrders = async () => {'),app.indexOf('  const fetchProductsFromDatabase = async () => {'));
  assert.equal((part.match(/await requireAdminOrderPermission\(/g)||[]).length,2);
  assert.match(part,/expectedUserId: initialSession\.userId/);
  assert.match(part,/hasVerifiedAdminOrderLedgerRows\(allOrderRows\)/);
  assert.ok(part.indexOf('await requireAdminOrderPermission(')<part.indexOf('for (let offset'));
  assert.ok(part.lastIndexOf('await requireAdminOrderPermission(')>part.indexOf('if (!completed)'));
  assert.ok(part.indexOf('setAdminOrdersReady(true)')>part.lastIndexOf('await requireAdminOrderPermission('));
  assert.match(part,/setAdminOrdersReady\(false\);\s*setAdminOrdersError\(/);
  assert.match(app,/ordersReady=\{adminOrdersReady && adminOrdersVerifiedPrincipal === currentUser\?\.id\}/);
});
test('unverified order ledger cannot produce certified finance metrics or CSV',()=>{
  assert.match(admin,/const ordersVerifiedForReports = hasOrdersPermission && ordersReady && !ordersError/);
  assert.match(admin,/const verifiedFinanceSnapshot = ordersVerifiedForReports && expensesVerifiedForReports/);
  assert.match(admin,/ordersVerifiedForReportsRef\.current/);
  assert.match(admin,/disabled=\{expenseExportBusy \|\| !ordersVerifiedForReports\}/);
  assert.match(admin,/admin-finance-orders-warning/);
  assert.match(admin,/!verifiedFinanceSnapshot \|\| financialOverview\.netProfit === null/);
});
