import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../supabase/migrations/20261116143000_persistent_flash_sale_campaigns.sql', import.meta.url), 'utf8');
const admin = readFileSync(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
const store = readFileSync(new URL('../src/components/StoreView.jsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

test('flash-sale campaigns persist their server-side start and end timestamps', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.flash_sale_campaigns/);
  assert.match(migration, /starts_at timestamptz NOT NULL DEFAULT now\(\)/);
  assert.match(migration, /ends_at timestamptz NOT NULL/);
  assert.match(migration, /p_duration_minutes integer/);
  assert.match(migration, /make_interval\(mins => p_duration_minutes\)/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.get_active_flash_sale\(\)/);
});

test('flash-sale expiry restores only unchanged campaign prices and is scheduled automatically', () => {
  assert.match(migration, /p\.price_gel = i\.sale_price_gel/);
  assert.match(migration, /p\.old_price_gel IS NOT DISTINCT FROM i\.sale_old_price_gel/);
  assert.match(migration, /SET price_gel = i\.original_price_gel,[\s\S]*?old_price_gel = i\.original_old_price_gel/);
  assert.match(migration, /cron\.schedule\([\s\S]*?'\* \* \* \* \*'/);
  assert.match(migration, /ALTER TABLE public\.flash_sale_campaigns ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /ALTER TABLE public\.flash_sale_items ENABLE ROW LEVEL SECURITY/);
});

test('admin flash-sale form sends a selectable duration to the guarded campaign RPC', () => {
  assert.match(admin, /p_duration_minutes: durationMinutes/);
  assert.match(admin, /admin_create_flash_sale/);
  assert.match(admin, /flashSaleForm\.durationMinutes/);
  assert.match(admin, /value="1440">24 საათი/);
  assert.match(admin, /მიმდინარე ფლეშ-აქცია/);
});

test('storefront countdown derives from the persisted campaign end time', () => {
  assert.match(store, /Date\.parse\(activeFlashSale\?\.ends_at/);
  assert.match(store, /activeFlashSale\.product_ids/);
  assert.match(store, /onFlashSaleExpired/);
  assert.doesNotMatch(store, /hours: 11, minutes: 45, seconds: 30/);
  assert.doesNotMatch(store, /return \{ hours: 12, minutes: 0, seconds: 0 \}/);
});

test('app refreshes campaign status and catalogue prices after expiry', () => {
  assert.match(app, /rpc\/get_active_flash_sale/);
  assert.match(app, /setActiveFlashSale\(campaign\)/);
  assert.match(app, /previousCampaign && !campaign/);
  assert.match(app, /onFlashSaleExpired=\{refreshActiveFlashSale\}/);
});

test('flash-sale presentation has responsive, accessible campaign styling', () => {
  const stage41 = css.slice(css.lastIndexOf('GEOSTORE — stage 41: persistent flash-sale campaign presentation'));
  assert.ok(stage41.length > 0);
  assert.match(stage41, /\.gs-flash-sale-discount-badge/);
  assert.match(stage41, /\.gs-flash-sale-countdown/);
  assert.match(stage41, /\.gs-flash-sale-product-badge/);
  assert.match(stage41, /@media\(max-width:700px\)/);
  assert.match(stage41, /:focus-visible/);
});
