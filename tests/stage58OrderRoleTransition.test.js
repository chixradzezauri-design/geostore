import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const app=readFileSync(new URL('../src/App.jsx', import.meta.url),'utf8');
const helper=readFileSync(new URL('../src/utils/adminOrderLedgerSafety.js', import.meta.url),'utf8');

test('Stage58 App certifies principal with a component-scoped identifier, not helper local variable',()=>{
  const segment=app.slice(app.indexOf('  const fetchOrders = async () => {'),app.indexOf('  const fetchProductsFromDatabase = async () => {'));
  assert.match(segment,/setAdminOrdersVerifiedPrincipal\(requestPrincipal\)/);
  assert.doesNotMatch(segment,/setAdminOrdersVerifiedPrincipal\(initialSession\.userId\)/);
  assert.match(segment,/error instanceof AdminOrderLedgerAccessError[\s\S]*?setOrders\(\[\]\)/);
});

test('Stage58 finance permission must be re-checked during each page and after the final orders gate',()=>{
  assert.match(helper,/export async function readAdminOrderFinancePermission/);
  assert.match(helper,/initialFinancePermission = await readAdminOrderFinancePermission/);
  assert.match(helper,/pageFinancePermission = await readAdminOrderFinancePermission/);
  assert.match(helper,/finalFinancePermission = await readAdminOrderFinancePermission/);
  assert.match(helper,/throw new AdminOrderFinanceAccessChangedError\(\)/);
  assert.match(helper,/redactCustomerCheckoutItems\(order\.items\)/);
});
