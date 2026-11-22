import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration=readFileSync(new URL('../supabase/migrations/20261117231459_staff_orders_permission.sql',import.meta.url),'utf8');
const contract=readFileSync(new URL('./sql/stage59_order_status_compat_contract.sql',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/stage52-isolated-postgres.yml',import.meta.url),'utf8');
const finalAcl=readFileSync(new URL('../supabase/migrations/20261121213000_revoke_legacy_order_snapshot_reads.sql',import.meta.url),'utf8');
const projected=readFileSync(new URL('../supabase/migrations/20261121210000_scope_admin_order_ledger_permissions.sql',import.meta.url),'utf8');

test('Stage59 uses real staff status and note implementations after Stage57 sensitive-column revocation',()=>{
  assert.match(migration,/CREATE OR REPLACE FUNCTION private\.admin_update_order_status\(p_order_id text, p_new_status text\)/);
  assert.match(migration,/CREATE OR REPLACE FUNCTION private\.admin_save_order_note\(p_order_id text, p_admin_note text\)/);
  assert.match(contract,/\\ir \.\.\/\.\.\/supabase\/migrations\/20261117231459_staff_orders_permission\.sql/);
  assert.match(contract,/CREATE TABLE public\.products/);
  assert.match(contract,/CREATE FUNCTION public\.admin_update_order_status/);
  assert.match(contract,/SECURITY INVOKER SET search_path TO ''/);
  assert.match(finalAcl,/REVOKE SELECT \(items,checkout_result,checkout_request\)/);
  assert.match(projected,/CREATE OR REPLACE FUNCTION public\.admin_order_ledger_page/);
});

test('Stage59 retains status/note, stock restoration and authorization across role types',()=>{
  for(const expected of [
    'direct status update bypassed protected RPC',
    'admin note writer failed',
    'protected ledger lost status/note or exposed costs',
    'stock count drifted on cancelled/replayed orders',
    'cancelled order was illegally reactivated',
    'products-only staff wrote orders',
    'unverified staff wrote orders',
    'internal purchase-cost snapshot was modified',
    'checkout idempotency snapshot was altered',
    'status RPC grants/security mode drifted'
  ]) assert.ok(contract.includes(expected),expected);
  assert.match(workflow,/psql -v ON_ERROR_STOP=1 -f tests\/sql\/stage59_order_status_compat_contract\.sql/);
  assert.doesNotMatch(workflow,/DATABASE_URL|SUPABASE_SERVICE_ROLE|SUPABASE_ACCESS_TOKEN/);
});
