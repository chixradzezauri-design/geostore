import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261117130000_reopen_completed_orders.sql', import.meta.url), 'utf8');
const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('completed order reactivation is protected by the primary admin and fresh password authentication', () => {
  assert.match(migration, /private\.admin_reopen_completed_order\(p_order_id text\)/);
  assert.match(migration, /auth\.uid\(\) IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid/);
  assert.match(migration, /auth\.jwt\(\)->'amr'/);
  assert.match(migration, /extract\(epoch FROM now\(\)\)::bigint - v_password_auth_time > 300/i);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.admin_reopen_completed_order\(text\) TO authenticated/i);
});

test('reopening a completed order does not deduct stock a second time', () => {
  const functionBody = migration.split('CREATE OR REPLACE FUNCTION private.admin_reopen_completed_order')[1]?.split('$function$;')[0] || '';
  assert.match(functionBody, /stock_deducted_at IS NULL OR v_order\.stock_restored_at IS NOT NULL/);
  assert.match(functionBody, /SET status = 'ახალი'[\s\S]*?status_changed_at = now\(\)/);
  assert.doesNotMatch(functionBody, /UPDATE public\.products/i);
  assert.match(functionBody, /'stock_unchanged', true/);
});

test('completed-order transition guard only permits the protected reopen operation', () => {
  assert.match(migration, /geostore\.completed_order_reactivation/);
  assert.match(migration, /NEW\.stock_deducted_at IS DISTINCT FROM OLD\.stock_deducted_at/);
  assert.match(migration, /NEW\.stock_restored_at IS DISTINCT FROM OLD\.stock_restored_at/);
  assert.match(migration, /ხელახლა გააქტიურება მხოლოდ დაცული პროცედურით/);
});

test('admin uses the dedicated completed-order RPC after fresh password verification', () => {
  assert.match(admin, /const wasDelivered = isDeliveredOrderStatus\(reactivationOrder\.status\)/);
  assert.match(admin, /admin_reopen_completed_order/);
  assert.match(admin, /admin_reactivate_cancelled_order/);
  assert.match(admin, /Boolean\(o\.stock_deducted_at\) && !o\.stock_restored_at/);
});
