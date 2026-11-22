import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const fixture = read('./sql/stage65_expenses_order_role_matrix.sql');
const workflow = read('../.github/workflows/stage52-isolated-postgres.yml');
const expenses = read('../supabase/migrations/20261117143000_staff_expenses_permission.sql');
const orderLedger = read('../supabase/migrations/20261121210000_scope_admin_order_ledger_permissions.sql');

test('Stage65 runs the exact existing staff expense migration, not fixture replacement', () => {
  assert.match(fixture, /\\ir \.\.\/\.\.\/supabase\/migrations\/20261117143000_staff_expenses_permission\.sql/);
  assert.match(expenses, /CREATE POLICY "Staff with expenses permission can manage expenses"/);
  assert.match(expenses, /USING \(public\.has_staff_permission\('expenses'\)\)/);
  assert.match(expenses, /WITH CHECK \(public\.has_staff_permission\('expenses'\)\)/);
  assert.match(fixture, /CREATE POLICY "Admin can manage expenses"/);
  assert.match(fixture, /policyname='Staff with expenses permission can manage expenses'/);
  assert.match(fixture, /policyname='Admin can manage expenses'/);
});

test('Stage65 tests orders-only, expenses-only, owner, inactive and JWT spoofing', () => {
  for (const check of [
    "public.has_staff_permission('orders')",
    "public.has_staff_permission('expenses')",
    "public.admin_order_ledger_page(0,100)",
    "public.admin_order_image_refs_page(0,100)",
    "has_column_privilege('authenticated','public.orders','items','SELECT')",
    '56000000-0000-4000-8000-000000000006',
    '56000000-0000-4000-8000-000000000007',
    '56000000-0000-4000-8000-000000000003',
    '56000000-0000-4000-8000-000000000002',
    '56000000-0000-4000-8000-000000000004',
    '1060de3d-d28a-45f8-9a64-5e0368cffc4b',
    'user_metadata',
    'app_metadata',
    'WHEN insufficient_privilege'
  ]) assert.ok(fixture.includes(check), 'Missing Stage65 contract: ' + check);
  assert.match(fixture, /SELECT count\(\*\) INTO count_expenses FROM public\.expenses/);
  assert.match(fixture, /GET DIAGNOSTICS changed = ROW_COUNT/);
  assert.match(fixture, /Stage65 unauthorized expense write altered fixture/);
});

test('Stage65 uses the existing isolated PostgreSQL17 CI runner after prior contracts', () => {
  const stage62Index = workflow.indexOf('psql -v ON_ERROR_STOP=1 -f tests/sql/stage62_cancelled_order_variant_reactivation.sql');
  const stage65Index = workflow.indexOf('psql -v ON_ERROR_STOP=1 -f tests/sql/stage65_expenses_order_role_matrix.sql');
  assert.ok(stage62Index > 0 && stage65Index > stage62Index);
  assert.match(workflow, /'supabase\/migrations\/20261117143000_staff_expenses_permission\.sql'/);
  assert.match(workflow, /'tests\/sql\/stage65_expenses_order_role_matrix\.sql'/);
  assert.doesNotMatch(workflow, /SUPABASE_SERVICE_ROLE|DATABASE_URL|SUPABASE_ACCESS_TOKEN/);
  assert.match(workflow, /postgres:17-alpine/);
  assert.match(orderLedger, /public\.has_staff_permission\('orders'\)/);
  assert.match(orderLedger, /public\.has_staff_permission\('expenses'\)/);
});

test('Stage65 never claims fixture replaces full isolated Supabase staging', () => {
  const doc = read('../docs/stage65-finance-permission-staging-gate.md');
  assert.match(doc, /full-schema Supabase staging/);
  assert.match(doc, /NOT RELEASE-READY/);
  assert.match(doc, /isolated PostgreSQL 17/);
  assert.match(doc, /staging JWT/);
});
