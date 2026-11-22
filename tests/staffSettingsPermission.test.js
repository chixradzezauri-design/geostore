import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261117231538_staff_settings_permission.sql', import.meta.url), 'utf8');
const draftConcurrencyMigration = await readFile(new URL('../supabase/migrations/20261119181855_storefront_draft_concurrency.sql', import.meta.url), 'utf8');
const heroStorageMigration = await readFile(new URL('../supabase/migrations/20261119110000_add_storefront_hero_storage_scope.sql', import.meta.url), 'utf8');
const foundation = await readFile(new URL('../supabase/migrations/20261117231455_admin_staff_auth_foundation.sql', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('store settings, coupons, delivery fees and media are protected by settings permission', () => {
  for (const phrase of [
    'Staff with settings permission can delete store coupons',
    'Staff with settings permission can insert store coupons',
    'Staff with settings permission can update store coupons',
    'Staff with settings permission can insert delivery fees',
    'Staff with settings permission can update delivery fees',
    'Staff with settings permission can insert storefront drafts',
    'Staff with settings permission can update storefront drafts',
    'Staff with settings permission can insert storefront media',
    'Staff with settings permission can update storefront media',
    'Staff with settings permission can delete storefront media'
  ]) assert.ok(migration.includes(phrase), phrase);
  assert.match(migration, /public\.has_staff_permission\('settings'\)/);
  assert.match(foundation, /'settings'/);
});

test('storefront media uploads are permission-checked at the Storage RLS boundary while public reads remain public', () => {
  assert.match(migration, /Storefront media scoped upload/);
  assert.match(migration, /Storefront media scoped update/);
  assert.match(migration, /Storefront media scoped delete/);
  assert.match(migration, /bucket_id = 'storefront-media'/);
  assert.match(migration, /Public can read public storefront media/);
  assert.match(migration, /Public can read published storefront config/);
  assert.match(migration, /public read active coupons/);
});

test('storefront draft saves use a scoped optimistic-concurrency RPC and cannot mutate published fields', () => {
  const draftRpc = draftConcurrencyMigration.split('CREATE OR REPLACE FUNCTION private.save_storefront_draft')[1]?.split('CREATE OR REPLACE FUNCTION public.save_storefront_draft')[0] || '';
  for (const phrase of [
    "public.has_staff_permission('settings')",
    'p_expected_draft_updated_at timestamptz',
    'pg_advisory_xact_lock',
    'p_expected_draft_updated_at IS DISTINCT FROM v_current_updated_at',
    'draft_updated_at = GREATEST',
    "USING ERRCODE = '40001'"
  ]) assert.ok(draftRpc.includes(phrase), phrase);
  assert.equal(/published_config|is_published|published_at/.test(draftRpc), false);
  assert.ok(app.includes('/rest/v1/rpc/save_storefront_draft'));
  assert.ok(app.includes('p_expected_draft_updated_at: storefrontDraftUpdatedAtRef.current'));
  assert.equal(app.includes('/rest/v1/storefront_config?on_conflict=config_key'), false);
});
test('settings staff can edit drafts but cannot publish storefront configuration', () => {
  assert.match(migration, /REVOKE INSERT \(is_published, published_at, published_config\)/);
  assert.match(migration, /UPDATE \(is_published, published_at, published_config\)/);
  assert.match(migration, /private\.publish_storefront_config/);
  assert.match(migration, /Owner-only by design/);
});

test('activity logging accepts active module staff but activity-log viewing stays owner-only', () => {
  assert.match(migration, /private\.write_admin_activity_log/);
  for (const permission of ['products', 'orders', 'analytics', 'expenses', 'crm', 'support', 'settings']) {
    assert.ok(migration.includes(`has_staff_permission(''${permission}'')`));
  }
  assert.match(migration, /admin activity-log viewing/);
});


test('settings staff Storage access is limited to storefront banner and category paths', () => {
  for (const phrase of [
    "name LIKE 'storefront/categories/%'",
    "name LIKE 'storefront/banners/%'",
    "public.has_staff_permission('settings')",
    "name LIKE 'products/%'",
    "public.has_staff_permission('products')"
  ]) assert.ok(migration.includes(phrase), phrase);
});

test('hero image Storage operations are restricted to settings staff and preserve product staff scope', () => {
  for (const policy of ['Storefront media scoped upload', 'Storefront media scoped update', 'Storefront media scoped delete']) {
    assert.ok(heroStorageMigration.includes(policy), policy);
  }
  assert.equal((heroStorageMigration.match(/name LIKE 'storefront\/hero\/%'/g) || []).length, 4);
  assert.equal((heroStorageMigration.match(/name LIKE 'storefront\/categories\/%'/g) || []).length, 4);
  assert.equal((heroStorageMigration.match(/name LIKE 'storefront\/banners\/%'/g) || []).length, 4);
  assert.equal((heroStorageMigration.match(/name LIKE 'products\/%'/g) || []).length, 4);
  assert.equal((heroStorageMigration.match(/public\.has_staff_permission\('settings'\)/g) || []).length, 4);
  assert.equal((heroStorageMigration.match(/public\.has_staff_permission\('products'\)/g) || []).length, 4);
  assert.match(app, /safePath\.startsWith\('storefront\/hero\/'\)/);
  assert.match(app, /safePath\.startsWith\('storefront\/categories\/'\)/);
  assert.match(app, /safePath\.startsWith\('storefront\/banners\/'\)/);
});
