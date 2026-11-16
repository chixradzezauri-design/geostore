import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261107084940_harden_order_status_stock_transitions.sql', import.meta.url), 'utf8');
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
