import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const migrationDirectory = new URL('../supabase/migrations/', import.meta.url);
const migrationFiles = readdirSync(migrationDirectory);
const readMigration = (name) =>
  readFileSync(new URL('../supabase/migrations/' + name, import.meta.url), 'utf8');
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

const pending = [
  '20261121170000_strip_private_costs_from_checkout_rpc.sql',
  '20261121190000_redact_alternate_costs_from_order_history.sql',
  '20261121210000_scope_admin_order_ledger_permissions.sql',
];
const stagingGate = read('./sql/stage63_full_schema_release_gate.sql');
const partialFixtureWorkflow = read('../.github/workflows/stage52-isolated-postgres.yml');

test('Stage63 migration preflight preserves the three staged contracts in dependency order', () => {
  for (const file of pending) {
    assert.equal(migrationFiles.filter((name) => name === file).length, 1, file);
  }
  const versions = pending.map((name) => Number(name.slice(0, 14)));
  assert.ok(versions.every((version, index) => index === 0 || versions[index - 1] < version));
  // Read-only live schema inventory on 2026-11-22 last reported 20261120124250.
  // This is a baseline only: repeat a fresh remote migration-history diff at release.
  assert.ok(versions.every((version) => version > 20261120124250));

  const checkout = readMigration(pending[0]);
  const history = readMigration(pending[1]);
  const ledger = readMigration(pending[2]);
  assert.match(checkout, /CREATE OR REPLACE FUNCTION public\.create_order_with_stock\(p_order jsonb\)/);
  assert.match(checkout, /SECURITY INVOKER/);
  assert.match(checkout, /private\.create_order_with_stock\(p_order\)/);
  assert.match(history, /CREATE OR REPLACE FUNCTION private\.get_my_orders\(\)/);
  assert.match(history, /o\.user_id = auth\.uid\(\)/);
  assert.match(ledger, /CREATE OR REPLACE FUNCTION private\.admin_order_ledger_page/);
  assert.match(ledger, /public\.has_staff_permission\('orders'\)/);
  assert.match(ledger, /public\.has_staff_permission\('expenses'\)/);
  assert.match(ledger, /REVOKE SELECT \(items,checkout_result,checkout_request\)/);
  assert.match(ledger, /CREATE OR REPLACE FUNCTION public\.admin_order_image_refs_page/);
});

test('Stage63 full-schema gate validates types, grants, RLS, order ledger and stock triggers', () => {
  for (const name of [
    'public.orders', 'public.products', 'public.expenses',
    'public.admin_staff_members', 'public.admin_staff_pending_invites',
    'private.inventory_movements', 'public.create_order_with_stock(jsonb)',
    'private.get_my_orders()', 'public.admin_order_ledger_page(integer,integer)',
    'private.admin_order_image_refs_page(integer,integer)',
    'orders_guard_status_transition', 'products_inventory_movement_after_change',
    'has_column_privilege', 'has_function_privilege', 'relrowsecurity',
    'costPrice', 'purchase_cost',
  ]) assert.ok(stagingGate.includes(name), 'Stage63 gate missing: ' + name);

  assert.match(stagingGate, /BEGIN TRANSACTION READ ONLY;/);
  assert.match(stagingGate, /\bROLLBACK;/);
  assert.match(stagingGate, /RAISE EXCEPTION/);
  assert.doesNotMatch(stagingGate,
    /^\s*(?:INSERT|UPDATE|DELETE|TRUNCATE|DROP|ALTER|CREATE|GRANT|REVOKE|CALL)\b/im);
});

test('Stage63 does not misrepresent partial-schema PostgreSQL CI as full Supabase staging', () => {
  assert.match(partialFixtureWorkflow, /stage62_cancelled_order_variant_reactivation/);
  assert.doesNotMatch(partialFixtureWorkflow, /stage63_full_schema_release_gate/);
  assert.ok(
    read('../docs/stage63-supabase-release-preflight.md')
      .includes('authenticated owner/staff E2E'),
    'Full authenticated staging release gate must remain documented'
  );
});
