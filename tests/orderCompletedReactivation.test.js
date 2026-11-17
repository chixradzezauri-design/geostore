import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261117093000_order_reactivate_completed_orders.sql', import.meta.url), 'utf8');
const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('completed orders can only reactivate through the guarded password-confirmed RPC', () => {
  assert.match(migration, /OLD\.status IN \('დასრულებული', 'ჩაბარებულია'\)/);
  assert.match(migration, /NEW\.status <> 'ახალი'/);
  assert.match(migration, /geostore\.order_reactivation/);
  assert.match(migration, /auth\.jwt\(\)->'amr'/);
  assert.match(migration, /extract\(epoch FROM now\(\)\)::bigint - v_password_auth_time > 300/i);
  assert.match(admin, /ხელახლა გააქტიურება/);
  assert.match(admin, /admin_reactivate_cancelled_order/);
});

test('completed-order reactivation never deducts stock a second time', () => {
  const completedBranch = migration.slice(
    migration.indexOf("IF v_order.status IN ('დასრულებული', 'ჩაბარებულია')"),
    migration.indexOf("IF v_order.status <> 'გაუქმებული'")
  );
  assert.match(completedBranch, /stock_deducted_at IS NULL/);
  assert.match(completedBranch, /stock_restored_at IS NOT NULL/);
  assert.match(completedBranch, /stock_unchanged', true/);
  assert.doesNotMatch(completedBranch, /UPDATE public\.products/i);
  assert.match(completedBranch, /status_changed_at = now\(\)/);
});

test('cancelled-order reactivation still validates stock and custom variants atomically', () => {
  assert.match(migration, /v_order\.status <> 'გაუქმებული'/);
  assert.match(migration, /jsonb_array_elements\(v_order\.items\)/);
  assert.match(migration, /customVariantId/);
  assert.match(migration, /coalesce\(stock, 0\) >= v_item\.quantity/);
  assert.match(migration, /set_config\('geostore\.variant_stock_adjustment', 'on', true\)/);
  assert.match(migration, /stock_restored_at = NULL/i);
  assert.match(migration, /stock_deducted_at = now\(\)/);
});

test('direct status changes cannot bypass completed-order reactivation guard', () => {
  assert.match(migration, /OR NEW\.stock_deducted_at IS DISTINCT FROM OLD\.stock_deducted_at/);
  assert.match(migration, /OR NEW\.stock_restored_at IS DISTINCT FROM OLD\.stock_restored_at/);
  assert.match(migration, /Only|მხოლოდ|ხელახლა გააქტიურება/);
});
