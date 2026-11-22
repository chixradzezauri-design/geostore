import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(path,import.meta.url),'utf8');

const m51 = read('../supabase/migrations/20261121170000_strip_private_costs_from_checkout_rpc.sql');
const m54 = read('../supabase/migrations/20261121190000_redact_alternate_costs_from_order_history.sql');
const m57 = read('../supabase/migrations/20261121210000_scope_admin_order_ledger_permissions.sql');
const m70 = read('../supabase/migrations/20261121213000_revoke_legacy_order_snapshot_reads.sql');
const workflow = read('../.github/workflows/stage52-isolated-postgres.yml');

test('Stage71 guarded public checkout refuses absent or changed private contract', () => {
  assert.match(m51,/DO \$stage71_checkout_preflight\$/);
  assert.match(m51,/private\.create_order_with_stock\(jsonb\)/);
  assert.match(m51,/pg_get_function_result\(v_private\)/);
  assert.match(m51,/prosecdef/);
  assert.match(m51,/public checkout wrapper changed; do not overwrite/);
  assert.ok(m51.indexOf('stage71_checkout_preflight') < m51.indexOf('CREATE OR REPLACE FUNCTION public.create_order_with_stock'));
  assert.match(m51,/RETURN jsonb_set\(v_internal_result, '\{items\}'/);
});

test('Stage71 redacted customer history checks owner schema and Supabase auth before replace', () => {
  assert.match(m54,/DO \$stage71_history_preflight\$/);
  assert.match(m54,/to_regprocedure\('auth\.uid\(\)'\)/);
  assert.match(m54,/order-history schema drift/);
  assert.match(m54,/\('user_id','uuid'\)/);
  assert.match(m54,/\('items','jsonb'\)/);
  assert.ok(m54.indexOf('stage71_history_preflight') < m54.indexOf('CREATE OR REPLACE FUNCTION private.get_my_orders'));
  assert.match(m54,/WHERE o.user_id = auth.uid\(\)/);
});

test('Stage71 additive RPC bridge checks real order/staff RLS and full referenced column contract', () => {
  assert.match(m57,/DO \$stage71_order_bridge_preflight\$/);
  assert.match(m57,/to_regclass\('public\.admin_staff_members'\)/);
  assert.match(m57,/to_regprocedure\('private\.has_staff_permission\(text\)'\)/);
  assert.match(m57,/relrowsecurity/);
  for(const column of ['customer_name','phone','address','user_email','customer_email',
    'user_id','total_gel','status','admin_note','stock_deducted_at','stock_restored_at',
    'items','checkout_result','checkout_request']) {
    assert.ok(m57.includes("'"+column+"'"),column);
  }
  assert.match(m57,/live order projection schema mismatch; stop before deploying admin RPCs/);
  assert.ok(m57.indexOf('stage71_order_bridge_preflight') < m57.indexOf('CREATE OR REPLACE FUNCTION private.admin_order_ledger_page'));
  assert.doesNotMatch(m57,/REVOKE SELECT ON TABLE public\.orders/);
});

test('Stage71 only final post-frontend phase revokes finance-bearing order grants',()=>{
  assert.match(m70,/REVOKE SELECT ON TABLE public\.orders FROM PUBLIC, anon, authenticated/);
  assert.match(m70,/to_regprocedure\('public\.admin_order_ledger_page\(integer,integer\)'\)/);
  assert.match(m70,/RAISE EXCEPTION 'Stage70: compatible order projection APIs are missing or unsafe/);
  assert.match(workflow,/psql -v ON_ERROR_STOP=1 -f tests\/sql\/stage52_checkout_contract\.sql/);
  assert.match(workflow,/psql -v ON_ERROR_STOP=1 -f tests\/sql\/stage57_order_ledger_scope_contract\.sql/);
  assert.match(workflow,/postgres:17-alpine/);
});

test('Stage71 guard is source-verified but cannot certify Production without real-auth full-schema staging',()=>{
  const doc=read('../docs/stage71-migration-failclosed-preflight.md');
  for(const phrase of ['NOT RELEASE-READY','no paid staging','full-schema',
    'Production unchanged','PR #149','migration history','JWT','Phase A','Phase B']) {
      assert.ok(doc.includes(phrase),'Missing release condition: '+phrase);
  }
});
