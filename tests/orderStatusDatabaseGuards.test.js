import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261107084940_harden_order_status_stock_transitions.sql', import.meta.url), 'utf8');
const completedReopenMigration = await readFile(new URL('../supabase/migrations/20261117110000_reopen_completed_orders_safely.sql', import.meta.url), 'utf8');
const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('order status RPC locks the target order and enforces server-side transitions', () => {
  assert.match(migration, /from public\.orders\s+where id = p_order_id\s+for update/i);
  assert.match(migration, /v_order\.status in \('დასრულებული', 'ჩაბარებულია'\)/);
  assert.match(migration, /v_order\.status in \('გაგზავნილი', 'გზაშია'\)/);
  assert.match(migration, /v_order\.status = 'გაუქმებული'/);
  assert.match(admin, /\/rest\/v1\/rpc\/admin_update_order_status/);
});

test('cancellation validates every stored item before restoring stock atomically', () => {
  assert.match(migration, /Validate each raw line before aggregation/);
  assert.match(migration, /stock = coalesce\(stock, 0\) \+ v_item\.quantity/);
  assert.match(migration, /stock_restored_at = now\(\)/);
  assert.match(migration, /get diagnostics v_updated = row_count/i);
});

test('reactivation requires fresh password authentication and sufficient stock', () => {
  assert.match(migration, /auth\.jwt\(\)->'amr'/);
  assert.match(migration, /extract\(epoch from now\(\)\)::bigint - v_password_auth_time > 300/i);
  assert.match(migration, /stock = coalesce\(stock, 0\) - v_item\.quantity/);
  assert.match(migration, /coalesce\(stock, 0\) >= v_item\.quantity/);
  assert.match(migration, /set_config\('geostore\.order_reactivation', 'on', true\)/);
});

test('order ledger deletion is blocked for client roles', () => {
  assert.match(migration, /REVOKE DELETE ON TABLE public\.orders FROM PUBLIC, anon, authenticated/i);
});


test('completed orders can be reopened only by the primary admin after fresh password authentication without changing stock', () => {
  assert.match(completedReopenMigration, /create or replace function private\\.admin_reopen_completed_order/i);
  assert.match(completedReopenMigration, /auth\\.uid\\(\\) is distinct from '1060de3d-d28a-45f8-9a64-5e0368cffc4b'/i);
  assert.match(completedReopenMigration, /auth\\.jwt\\(\\)->'amr'/i);
  assert.match(completedReopenMigration, /extract\\(epoch from now\\(\\)\\)::bigint - v_password_auth_time > 300/i);
  assert.match(completedReopenMigration, /v_order\\.status not in \\('დასრულებული', 'ჩაბარებულია'\\)/i);
  assert.match(completedReopenMigration, /v_order\\.stock_deducted_at is null/i);
  assert.match(completedReopenMigration, /v_order\\.stock_restored_at is not null/i);
  assert.match(completedReopenMigration, /set_config\\('geostore\\.completed_order_reopen', 'on', true\\)/i);
  assert.match(completedReopenMigration, /set status = 'ახალი'/i);
  assert.doesNotMatch(completedReopenMigration, /update public\\.products/i);
  assert.match(completedReopenMigration, /revoke all on function public\\.admin_reopen_completed_order\\(text\\) from public, anon/i);
  assert.match(completedReopenMigration, /grant execute on function public\\.admin_reopen_completed_order\\(text\\) to authenticated/i);
  assert.match(admin, /admin_reopen_completed_order/);
  assert.match(admin, /reactivationMode === 'completed'/);
});
