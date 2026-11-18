import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261118190000_admin_rpc_invoker_wrappers.sql', import.meta.url),
  'utf8'
);

const pairs = [
  ['admin_list_inventory_movements', 'list_inventory_movements'],
  ['admin_list_inventory_replenishment_settings', 'list_inventory_replenishment_settings'],
  ['admin_save_inventory_replenishment_setting', 'save_inventory_replenishment_setting'],
  ['get_my_admin_access', 'get_my_admin_access'],
  ['get_staff_analytics_summary', 'get_staff_analytics_summary'],
  ['has_staff_permission', 'has_staff_permission'],
];

test('all six privileged implementations are in the private schema', () => {
  for (const [, privateName] of pairs) {
    assert.match(migration, new RegExp('CREATE OR REPLACE FUNCTION private\\.' + privateName + '\\('));
  }
  assert.equal((migration.match(/\\bSECURITY\\s+DEFINER\\b/gi) || []).length, 6);
});

test('all six established public RPC names remain SECURITY INVOKER wrappers', () => {
  for (const [publicName, privateName] of pairs) {
    assert.match(migration, new RegExp('CREATE OR REPLACE FUNCTION public\\.' + publicName + '\\('));
    assert.match(migration, new RegExp('SELECT private\\.' + privateName + '\\('));
  }
  assert.equal((migration.match(/\\bSECURITY\\s+INVOKER\\b/gi) || []).length, 6);
});

test('RLS permission helper remains public under its existing name', () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.has_staff_permission\(p_permission text\)/);
  assert.match(migration, /SELECT private\.has_staff_permission\(p_permission\)/);
  assert.match(migration, /public\.has_staff_permission\('products'\)/);
  assert.match(migration, /public\.has_staff_permission\('analytics'\)/);
  assert.match(migration, /public\.has_staff_permission\('expenses'\)/);
});

test('staff permission and owner access logic are preserved in private implementations', () => {
  assert.match(migration, /staff\.permissions->>p_permission = 'true'/);
  assert.match(migration, /auth_user\.email_confirmed_at IS NOT NULL/);
  assert.match(migration, /1060de3d-d28a-45f8-9a64-5e0368cffc4b/);
  assert.match(migration, /public\.has_staff_permission\('products'\)/);
  assert.match(migration, /public\.has_staff_permission\('analytics'\)/);
  assert.match(migration, /public\.has_staff_permission\('expenses'\)/);
});

test('financial analytics remain permission-gated and hidden without expenses access', () => {
  assert.match(migration, /IF NOT public\.has_staff_permission\('analytics'\) THEN/);
  assert.match(migration, /v_can_view_financials boolean := public\.has_staff_permission\('expenses'\)/);
  assert.match(migration, /'financials_available', v_can_view_financials/);
  assert.match(migration, /'net_profit_estimate', CASE WHEN v_can_view_financials/);
});

test('public wrappers and private implementations grant only authenticated staff and service role', () => {
  for (const [publicName, privateName] of pairs) {
    assert.match(migration, new RegExp('GRANT EXECUTE ON FUNCTION public\\.' + publicName + '\\('));
    assert.match(migration, new RegExp('GRANT EXECUTE ON FUNCTION private\\.' + privateName + '\\('));
    assert.doesNotMatch(migration, new RegExp('GRANT EXECUTE ON FUNCTION (public|private)\\.' + publicName + '[^;]* TO anon', 'i'));
    assert.doesNotMatch(migration, new RegExp('GRANT EXECUTE ON FUNCTION (public|private)\\.' + privateName + '[^;]* TO anon', 'i'));
  }
});

test('migration is transactional and does not modify or delete application data', () => {
  assert.match(migration, /^--[\s\S]*?BEGIN;/i);
  assert.match(migration, /COMMIT;\s*$/i);
  assert.doesNotMatch(migration, /DROP TABLE|TRUNCATE|DELETE FROM|INSERT INTO|UPDATE public\./i);
});
