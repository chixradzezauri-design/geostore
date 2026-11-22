import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261117231504_reopen_completed_orders.sql', import.meta.url), 'utf8');
const permissionMigration = await readFile(new URL('../supabase/migrations/20261119094446_revoke_anon_completed_order_reactivation.sql', import.meta.url), 'utf8');
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
  assert.match(functionBody, /RETURNING status_changed_at INTO v_status_changed_at/);
  assert.match(functionBody, /'status_changed_at', v_status_changed_at/);
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
test('completed and cancelled order reactivation controls are clear, mobile-accessible and owner-gated', () => {
  assert.match(admin, /isOwner \? \([\s\S]*?admin-order-reactivate-button min-h-11 w-full sm:w-auto/);
  assert.match(admin, /aria-label=\{\`შეკვეთა #\$\{o\.id\} ხელახლა გააქტიურება\`\}/);
  assert.match(admin, /ხელახლა გააქტიურება მხოლოდ მთავარ ადმინისტრატორს შეუძლია/);
  assert.match(admin, /დასრულებულის ხელახლა გააქტიურება/);
  assert.match(admin, /გაუქმებულის ხელახლა გააქტიურება/);
});

test('completed-order reactivation wrapper explicitly revokes anon execution', () => {
  assert.ok(permissionMigration.includes('REVOKE ALL ON FUNCTION public.admin_reopen_completed_order(text) FROM PUBLIC, anon;'));
  assert.ok(permissionMigration.includes('GRANT EXECUTE ON FUNCTION public.admin_reopen_completed_order(text) TO authenticated;'));
});

test('completed-order row action uses the guarded status handler instead of opening the dialog directly', () => {
  assert.ok(admin.includes("onClick={() => handleUpdateOrderStatus(o.id, 'ახალი')}"));
  assert.ok(!admin.includes('setReactivationOrder(o);'));
});
