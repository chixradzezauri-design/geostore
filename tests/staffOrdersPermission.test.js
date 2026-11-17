import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261117103000_staff_orders_permission.sql', import.meta.url), 'utf8');
const foundation = await readFile(new URL('../supabase/migrations/20261117100000_admin_staff_auth_foundation.sql', import.meta.url), 'utf8');

test('orders RLS grants active staff only when the orders permission is enabled', () => {
  assert.match(migration, /Staff with orders permission can read orders/);
  assert.match(migration, /USING \(public\.has_staff_permission\('orders'\)\)/);
  assert.match(migration, /WITH CHECK \(public\.has_staff_permission\('orders'\)\)/);
  assert.match(foundation, /staff\.is_active IS TRUE/);
  assert.match(foundation, /staff\.permissions->>p_permission = 'true'/);
});

test('order status and admin note RPCs enforce the server-side orders permission', () => {
  assert.match(migration, /FUNCTION private\.admin_update_order_status/);
  assert.match(migration, /FUNCTION private\.admin_save_order_note/);
  assert.equal((migration.match(/public\.has_staff_permission\('orders'\)/g) || []).length, 5);
});

test('staff order operations preserve status and stock safeguards', () => {
  assert.match(migration, /v_order\.status IN \('დასრულებული', 'ჩაბარებულია'\)/);
  assert.match(migration, /v_order\.status IN \('გაგზავნილი', 'გზაშია'\)/);
  assert.match(migration, /v_order\.status = 'გაუქმებული'/);
  assert.match(migration, /stock_restored_at = now\(\)/);
  assert.match(migration, /customVariantId/);
  assert.match(migration, /get diagnostics v_updated = row_count/i);
});

test('order status RPC returns the database status timestamp for UI synchronization', () => {
  assert.match(migration, /SELECT status_changed_at\\s+INTO v_status_changed_at/);
  assert.match(migration, /'status_changed_at', v_status_changed_at/);
});

test('completed/cancelled order reactivation remains owner-only', () => {
  assert.match(migration, /ხელახლა გააქტიურება მხოლოდ მთავარ ადმინისტრატორს შეუძლია/);
  assert.match(migration, /trigger guard[\s\S]*not modified/i);
});
