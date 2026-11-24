import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const admin=readFileSync(new URL('../src/components/AdminDashboardPro.jsx',import.meta.url),'utf8');

test('admin orders must be verified by live permission both before and after pagination',()=>{
  const part=app.slice(app.indexOf('  const fetchOrders = async () => {'),app.indexOf('  const fetchProductsFromDatabase = async () => {'));
  const safety=readFileSync(new URL('../src/utils/adminOrderLedgerSafety.js',import.meta.url),'utf8');
  const verifiedLoader=safety.slice(safety.indexOf('export async function fetchVerifiedAdminOrderLedger'));
  assert.equal((verifiedLoader.match(/await requireAdminOrderPermission\(/g)||[]).length,2);
  assert.match(verifiedLoader,/expectedUserId: initialSession\.userId/);
  assert.match(verifiedLoader,/hasVerifiedAdminOrderLedgerRows\(allOrderRows\)/);
  assert.ok(verifiedLoader.indexOf('await requireAdminOrderPermission(')<verifiedLoader.indexOf('for (let offset'));
  assert.ok(verifiedLoader.lastIndexOf('await requireAdminOrderPermission(')>verifiedLoader.indexOf('if (!completed)'));
  assert.match(part,/const data = await fetchVerifiedAdminOrderLedger\(\{/);
  assert.match(part,/setAdminOrdersReady\(true\)/);
  assert.match(part,/setAdminOrdersReady\(false\);\s*setAdminOrdersError\(/);
  assert.match(app,/ordersReady=\{adminOrdersReady && adminOrdersVerifiedPrincipal === currentUser\?\.id\}/);
});
test('unverified order ledger cannot produce certified finance metrics or CSV',()=>{
  assert.match(admin,/const ordersVerifiedForReports = hasOrdersPermission && ordersReady && !ordersError/);
  assert.match(admin,/const verifiedFinanceSnapshot = ordersVerifiedForReports && expensesVerifiedForReports/);
  assert.match(admin,/ordersVerifiedForReportsRef\.current/);
  assert.match(admin,/disabled=\{expenseExportBusy \|\| !verifiedFinanceSnapshot \|\| expensesLoading \|\| Boolean\(expenseMutationBusy\)\}/);
  assert.match(admin,/admin-finance-orders-warning/);
  assert.match(admin,/!verifiedFinanceSnapshot \|\| financialOverview\.netProfit === null/);
});
