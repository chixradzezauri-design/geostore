import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const safety = await readFile(new URL('../src/utils/adminOrderLedgerSafety.js', import.meta.url), 'utf8');

test('admin order refresh uses the shared complete ledger loader rather than a partial PostgREST page', () => {
  assert.match(app, /const data = await fetchVerifiedAdminOrderLedger\(\{/);
  assert.match(app, /if \(data === null\) return;/);
  assert.match(app, /setOrders\(data\.map/);
  assert.match(safety, /pageSize = 1000, maxRows = 100000/);
  assert.match(safety, /for \(let offset = 0; offset < maxRows; offset \+= pageSize\)/);
  assert.match(safety, /rest\/v1\/rpc\/admin_order_ledger_page/);
  assert.match(safety, /body: JSON\.stringify\(\{ p_offset: offset, p_limit: pageSize \}\)/);
  assert.match(safety, /allOrderRows\.push\(\.\.\.page\.map/);
  assert.match(safety, /redactCustomerCheckoutItems\(order\.items\)/);
});

test('partial order pagination never certifies an incomplete admin order snapshot', () => {
  assert.match(safety, /if \(page\.length < pageSize\) \{/);
  assert.match(safety, /შეკვეთების სრული ისტორიის შემოწმება ვერ დასრულდა/);
  assert.match(safety, /if \(!completed\) throw new Error\('შეკვეთების სრული ისტორიის ჩატვირთვა ვერ დასრულდა\.'\)/);
  assert.match(safety, /hasVerifiedAdminOrderLedgerRows\(allOrderRows\)/);
  assert.match(app, /if \(!adminOrdersSessionActive\.current \|\| requestSessionVersion !== adminOrdersSessionVersion\.current\) return;[\s\S]*?setOrders\(data\.map/);
  assert.match(app, /finally \{\s*adminOrdersFetchLock\.current = false;/);
});
