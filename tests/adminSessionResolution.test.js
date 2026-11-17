import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('admin session access is resolved from Supabase Auth and the server permission RPC', () => {
  assert.match(source, /supabase\.rpc\('get_my_admin_access'\)/);
  assert.match(source, /normalizeAdminAccess\(data, user\)/);
  assert.match(source, /isAuthorizedAdmin\(user\)\) return OWNER_ADMIN_ACCESS/);
  assert.match(source, /hasAnyAdminAccess\(access\)/);
});

test('product data is loaded with permission-aware paths and purchase cost is stripped for non-finance staff', () => {
  assert.match(source, /requestHasExpensesPermission/);
  assert.match(source, /requestHasProductPermission/);
  assert.match(source, /adminDashboardProducts = useMemo/);
  assert.match(source, /const \{ purchase_cost, purchaseCost, \.\.\.safeProduct \} = product/);
  assert.match(source, /adminAccess=\{adminAccess\}/);
});

test('active admin permissions are revalidated on an interval and when the app returns to foreground', () => {
  assert.match(source, /refreshAdminAccess/);
  assert.match(source, /window\.setInterval\(\(\) => void refreshAdminAccess\(\), 60000\)/);
  assert.match(source, /document\.addEventListener\('visibilitychange', refreshWhenVisible\)/);
  assert.match(source, /setAdminAccess\(EMPTY_ADMIN_ACCESS\)/);
  assert.match(source, /setAdminLoggedIn\(false\)/);
});
