import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261117150000_staff_settings_permission.sql', import.meta.url), 'utf8');
const foundation = await readFile(new URL('../supabase/migrations/20261117100000_admin_staff_auth_foundation.sql', import.meta.url), 'utf8');

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

test('settings staff can edit drafts but cannot publish storefront configuration', () => {
  assert.match(migration, /REVOKE INSERT \(is_published, published_at, published_config\)/);
  assert.match(migration, /UPDATE \(is_published, published_at, published_config\)/);
  assert.match(migration, /private\.publish_storefront_config/);
  assert.match(migration, /Owner-only by design/);
});

test('activity logging accepts active module staff but activity-log viewing stays owner-only', () => {
  assert.match(migration, /private\.write_admin_activity_log/);
  for (const permission of ['products', 'orders', 'analytics', 'expenses', 'crm', 'support', 'settings']) {
    assert.match(migration, new RegExp(`has_staff_permission\\(''${permission}''\\)`));
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
