import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PENDING_STAGE_MIGRATIONS } from '../scripts/stage64MigrationHistoryAudit.mjs';

const read = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8');
const bridge = read('../supabase/migrations/20261121210000_scope_admin_order_ledger_permissions.sql');
const lock = read('../supabase/migrations/20261121213000_revoke_legacy_order_snapshot_reads.sql');
const contract = read('./sql/stage57_order_ledger_scope_contract.sql');
const staging = read('./sql/stage63_full_schema_release_gate.sql');
const workflow = read('../.github/workflows/stage52-isolated-postgres.yml');
const frontend = read('../src/utils/adminOrderLedgerSafety.js');
const admin = read('../src/components/AdminDashboardPro.jsx');

test('Stage70 bridge adds BOTH order APIs without breaking legacy direct select', () => {
  assert.match(bridge,/CREATE OR REPLACE FUNCTION public\.admin_order_ledger_page/);
  assert.match(bridge,/CREATE OR REPLACE FUNCTION public\.admin_order_image_refs_page/);
  assert.match(bridge,/SECURITY INVOKER/);
  assert.match(bridge,/public\.has_staff_permission\('orders'\)/);
  assert.match(bridge,/public\.has_staff_permission\('expenses'\)/);
  assert.match(bridge,/public\.has_staff_permission\('products'\)/);
  assert.doesNotMatch(bridge,/REVOKE SELECT ON TABLE public\.orders/);
  assert.doesNotMatch(bridge,/REVOKE SELECT \(items,checkout_result,checkout_request\)/);
});

test('Stage70 restrictive ACL phase fails closed unless bridge is already active', () => {
  assert.match(lock,/to_regprocedure\('public\.admin_order_ledger_page\(integer,integer\)'\)/);
  assert.match(lock,/to_regprocedure\('public\.admin_order_image_refs_page\(integer,integer\)'\)/);
  assert.match(lock,/has_function_privilege\('authenticated', 'public\.admin_order_ledger_page/);
  assert.match(lock,/has_function_privilege\('anon', 'public\.admin_order_ledger_page/);
  assert.match(lock,/RAISE EXCEPTION 'Stage70: compatible order projection APIs are missing or unsafe/);
  assert.match(lock,/REVOKE SELECT ON TABLE public\.orders FROM PUBLIC, anon, authenticated/);
  assert.match(lock,/REVOKE SELECT \(items,checkout_result,checkout_request\)/);
  assert.match(lock,/GRANT SELECT \([\s\S]+?\) ON TABLE public\.orders TO authenticated/);
  assert.match(lock,/has_column_privilege\('authenticated','public\.orders','items','SELECT'\)/);
  assert.match(lock,/Stage70: raw order-snapshot ACL cutover did not reach safe state/);
  assert.match(lock,/^BEGIN;[\s\S]*COMMIT;\s*$/m);
});

test('Stage70 full isolated fixture tests both phases in order and validates backwards compatibility between', () => {
  const a=contract.indexOf('\\ir ../../supabase/migrations/20261121210000_scope_admin_order_ledger_permissions.sql');
  const b=contract.indexOf('Stage70 phase A broke live legacy admin order reads');
  const c=contract.indexOf('\\ir ../../supabase/migrations/20261121213000_revoke_legacy_order_snapshot_reads.sql');
  const d=contract.indexOf('Stage57: check grants');
  assert.ok(a>=0 && b>a && c>b && d>c);
  assert.match(contract,/GRANT SELECT ON TABLE public\.orders TO authenticated/);
  assert.match(workflow, /20261121213000_revoke_legacy_order_snapshot_reads\.sql/);
  assert.match(staging,/has_column_privilege\('authenticated','public\.orders','items','SELECT'\)/);
  assert.match(frontend,/rest\/v1\/rpc\/admin_order_ledger_page/);
  assert.match(admin,/rest\/v1\/rpc\/admin_order_image_refs_page/);
});

test('Stage70 pending migration tracker reflects four explicit staged files, not 42 historic replays', () => {
  assert.deepEqual(PENDING_STAGE_MIGRATIONS, [
    '20261121170000_strip_private_costs_from_checkout_rpc.sql',
    '20261121190000_redact_alternate_costs_from_order_history.sql',
    '20261121210000_scope_admin_order_ledger_permissions.sql',
    '20261121213000_revoke_legacy_order_snapshot_reads.sql',
  ]);
});

test('Stage70 release notes make cutover and paid staging limits explicit', () => {
  const doc=read('../docs/stage70-production-compatible-cutover.md');
  for (const phrase of [
    'NOT RELEASE-READY','Phase A','Phase B','full-schema Supabase staging',
    'no paid staging','43 unmatched', 'old browser tabs', 'Production unchanged',
    'PR #149', 'rollback'
  ]) assert.ok(doc.includes(phrase),'Stage70 missing release warning: '+phrase);
});
