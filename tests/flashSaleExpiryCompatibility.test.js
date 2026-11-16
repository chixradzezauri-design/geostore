import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL('../supabase/migrations/20261116133134_flash_sale_expiry_compatibility.sql', import.meta.url),
  'utf8'
);
const admin = readFileSync(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
const store = readFileSync(new URL('../src/components/StoreView.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

test('the scheduled expiry worker restores product prices when the persisted deadline passes', () => {
  assert.match(migration, /p\.flash_sale_ends_at IS NOT NULL/);
  assert.match(migration, /p\.flash_sale_ends_at <= now\(\)/);
  assert.match(migration, /price_gel = CASE[\s\S]*?p\.old_price_gel/);
  assert.match(migration, /old_price_gel = NULL/);
  assert.match(migration, /flash_sale_started_at = NULL/);
  assert.match(migration, /flash_sale_ends_at = NULL/);
  assert.match(migration, /flash_sale_percent = NULL/);
});

test('the expiry worker avoids overwriting products tracked by a campaign snapshot', () => {
  assert.match(migration, /NOT EXISTS \([\s\S]*?FROM public\.flash_sale_items AS i[\s\S]*?i\.product_id = p\.id/);
});

test('only one automatic minute-level flash-sale expiry job remains scheduled', () => {
  assert.match(migration, /cron\.unschedule\(v_job_id\)/);
  assert.match(migration, /geostore-expire-flash-sales/);
});

test('unused parallel campaign RPCs cannot compete with product-level flash-sale state', () => {
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.admin_create_flash_sale/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.get_active_flash_sale/);
});

test('admin can see how many flash-sale products remain and when the next one expires', () => {
  assert.match(admin, /flashSaleAdminSummary\.count/);
  assert.match(admin, /flashSaleAdminSummary\.nextEndsAt/);
  assert.match(admin, /მოქმედი ფლეშ-აქცია/);
});

test('storefront countdown is announced accessibly without continuous screen-reader interruption', () => {
  assert.match(store, /role="timer" aria-live="off"/);
  assert.match(store, /gs-flash-sale-title/);
  assert.match(css, /GEOSTORE — stage 42: admin flash-sale status and accessible countdown/);
});
