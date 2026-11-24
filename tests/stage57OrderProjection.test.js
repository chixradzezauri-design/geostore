import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const migration=readFileSync(new URL('../supabase/migrations/20261121210000_scope_admin_order_ledger_permissions.sql',import.meta.url),'utf8');
const finalAcl=readFileSync(new URL('../supabase/migrations/20261121213000_revoke_legacy_order_snapshot_reads.sql',import.meta.url),'utf8');
const contract=readFileSync(new URL('./sql/stage57_order_ledger_scope_contract.sql',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/stage52-isolated-postgres.yml',import.meta.url),'utf8');
const admin=readFileSync(new URL('../src/components/AdminDashboardPro.jsx',import.meta.url),'utf8');
const ledger=readFileSync(new URL('../src/utils/adminOrderLedgerSafety.js',import.meta.url),'utf8');

test('Stage57 admin ledger is projected server-side, with costs gated by expenses, no full row JSON',()=>{
 assert.match(migration,/CREATE OR REPLACE FUNCTION private\.admin_order_ledger_page/);
 assert.match(migration,/public\.has_staff_permission\('orders'\)/);
 assert.match(migration,/public\.has_staff_permission\('expenses'\)/);
 assert.match(migration,/CASE\s+WHEN v_finance THEN/);
 assert.match(migration,/line\.value - ARRAY\[/);
 assert.match(migration,/SECURITY DEFINER SET search_path TO ''/);
 assert.match(migration,/SECURITY INVOKER SET search_path TO ''/);
 assert.doesNotMatch(migration,/to_jsonb\(o\)|to_jsonb\(row\)/);
 assert.match(finalAcl,/REVOKE SELECT ON TABLE public\.orders FROM PUBLIC, anon, authenticated/);
 assert.match(finalAcl,/REVOKE SELECT \(items,checkout_result,checkout_request\)/);
 assert.match(finalAcl,/GRANT SELECT \([\s\S]*?\) ON TABLE public\.orders TO authenticated/);
});

test('Stage57 all admin order read paths switched to paged guarded RPCs',()=>{
 assert.match(ledger,/rest\/v1\/rpc\/admin_order_ledger_page/);
 assert.match(ledger,/body: JSON\.stringify\(\{ p_offset: offset, p_limit: pageSize \}\)/);
 assert.doesNotMatch(ledger,/rest\/v1\/orders\?select/);
 assert.match(admin,/rest\/v1\/rpc\/admin_order_image_refs_page/);
 assert.doesNotMatch(admin,/rest\/v1\/orders\?select=items/);
 assert.match(admin,/collectReferencedOrderImageUrls\(orderRows\)/);
 assert.match(admin,/collectOrderProductIdsWithoutImageSnapshot\(orderRows\)/);
});

test('Stage57 actual migration executes after Stage56 synthetic roles in the same disposable PG17',()=>{
 assert.match(contract,/\\ir \.\.\/\.\.\/supabase\/migrations\/20261121210000_scope_admin_order_ledger_permissions\.sql/);
 assert.match(workflow,/psql -v ON_ERROR_STOP=1 -f tests\/sql\/stage57_order_ledger_scope_contract\.sql/);
 assert.match(contract,/SET ROLE authenticated/);
 for(const guard of [
  'orders-only leaked financial fields','finance-authorized snapshots missing',
  'products-only staff read orders','historical image snapshot was lost',
  'raw finance-bearing columns remain exposed','no-session read succeeded',
  'finance/idempotency snapshots were altered'
 ]) assert.ok(contract.includes(guard),guard);
 assert.doesNotMatch(workflow,/DATABASE_URL|SUPABASE_SERVICE_ROLE|SUPABASE_ACCESS_TOKEN/);
});
