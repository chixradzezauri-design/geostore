import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const sql=readFileSync(new URL('./sql/stage52_checkout_contract.sql',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/stage52-isolated-postgres.yml',import.meta.url),'utf8');

test('Stage52 executes the actual Stage51 migration in disposable Postgres, not Production', () => {
  assert.match(workflow,/postgres:17-alpine/);
  assert.match(workflow,/POSTGRES_DB: stage52_checkout/);
  assert.match(workflow,/psql -v ON_ERROR_STOP=1 -f tests\/sql\/stage52_checkout_contract\.sql/);
  assert.match(sql,/\\ir \.\.\/\.\.\/supabase\/migrations\/20261121170000_strip_private_costs_from_checkout_rpc\.sql/);
  assert.doesNotMatch(workflow,/SUPABASE_DB_URL|SUPABASE_ACCESS_TOKEN|DATABASE_URL|apply_migration/);
});

test('Stage52 test includes customer/finance permission boundaries and idempotency', () => {
  assert.match(sql,/SET ROLE anon/);
  assert.match(sql,/SET ROLE authenticated/);
  assert.match(sql,/idempotent_replay/);
  assert.match(sql,/purchase_cost/);
  assert.match(sql,/has_table_privilege\('anon'/);
  assert.match(sql,/has_function_privilege\('authenticated'/);
  assert.match(sql,/pg_proc/);
  assert.match(sql,/invalid phone was passed/);
  assert.match(sql,/count\(\*\) INTO total FROM private\.stage52_snapshots/);
});
