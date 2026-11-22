import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const legacy = read('../supabase/migrations/20261107172000_stabilize_admin_product_order.sql');
const staff = read('../supabase/migrations/20261117231508_staff_products_permission.sql');
const scenario = read('./sql/stage68_legacy_admin_product_scope_replay.sql');
const pipeline = read('../.github/workflows/stage52-isolated-postgres.yml');
const client = read('../src/App.jsx');

test('Stage68 actual historical product listing is primary-owner-only', () => {
  assert.match(legacy, /CREATE OR REPLACE FUNCTION private\.admin_list_products\(\)/);
  assert.match(legacy, /RETURNS SETOF public\.products/);
  assert.match(legacy, /SECURITY DEFINER/);
  assert.match(legacy, /v_jwt -> 'app_metadata' ->> 'role'/);
  assert.match(legacy, /auth\.uid\(\) IS DISTINCT FROM/);
  assert.doesNotMatch(legacy, /has_staff_permission/);
});

test('Stage68 newer actual migration explicitly replaces owner-only listing with finance permission', () => {
  assert.match(staff, /SELECT pg_get_functiondef\('private\.admin_list_products\(\)'::regprocedure\)/);
  assert.match(staff, /v_definition := replace\(v_definition, v_guard_v_jwt,\s*'IF NOT public\.has_staff_permission\(''expenses''\) THEN'\)/);
  assert.match(staff, /Could not locate admin_list_products authorization guard/);
  assert.match(staff, /Full product listing includes purchase_cost and is finance-only/);
  assert.match(scenario, /'IF NOT public\.has_staff_permission\(''expenses''\) THEN'/);
  assert.match(client, /requestAdminLoggedIn && requestHasExpensesPermission/);
  assert.match(client, /rest\/v1\/rpc\/admin_list_products/);
});

test('Stage68 rollback-only test proves real failure for expense-authorized employee and preserves owner', () => {
  for (const phrase of [
    "\\ir ../../supabase/migrations/20261107172000_stabilize_admin_product_order.sql",
    "SAVEPOINT stage68_before_replay",
    "ROLLBACK TO SAVEPOINT stage68_before_replay",
    "Stage68 current finance-gated admin listing unexpectedly empty",
    "Stage68 old migration did not revoke legitimate finance staff listing",
    "Stage68 old function did not keep owner-only access",
    "Stage68 savepoint did not restore expenses authorization",
    "Stage68 rollback changed original product schema or stock",
    "56000000-0000-4000-8000-000000000005",
    "56000000-0000-4000-8000-000000000003",
    "1060de3d-d28a-45f8-9a64-5e0368cffc4b",
  ]) assert.ok(scenario.includes(phrase), 'Missing Stage68 compatibility invariant: ' + phrase);
  assert.match(scenario, /\nROLLBACK;\n/);
  assert.match(scenario, /EXCEPTION WHEN OTHERS THEN/);
  assert.match(scenario, /v_sqlstate <> '42501'/);
  assert.doesNotMatch(scenario, /supabase\.co|https?:\/\//);
});

test('Stage68 keeps CI isolated and after Stage67 without billable credentials', () => {
  const stage67 = pipeline.indexOf('psql -v ON_ERROR_STOP=1 -f tests/sql/stage67_legacy_checkout_ownership_replay.sql');
  const stage68 = pipeline.indexOf('psql -v ON_ERROR_STOP=1 -f tests/sql/stage68_legacy_admin_product_scope_replay.sql');
  assert.ok(stage67 >= 0 && stage68 > stage67);
  assert.match(pipeline, /'supabase\/migrations\/20261117231508_staff_products_permission\.sql'/);
  assert.match(pipeline, /'tests\/sql\/stage68_legacy_admin_product_scope_replay\.sql'/);
  assert.match(pipeline, /postgres:17-alpine/);
  assert.doesNotMatch(pipeline, /SUPABASE_ACCESS_TOKEN|SUPABASE_SERVICE_ROLE|DATABASE_URL/);
});

test('Stage68 release report distinguishes historical incompatibility from production approval', () => {
  const doc = read('../docs/stage68-admin-product-legacy-role-gate.md');
  for (const phrase of [
    'NOT RELEASE-READY', 'no paid staging', 'full-schema Supabase staging',
    'products', 'expenses', 'admin_list_products',
    '42 migration', 'ROLLBACK'
  ]) assert.ok(doc.includes(phrase), 'Stage68 report is missing ' + phrase);
});
