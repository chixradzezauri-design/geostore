import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL('../supabase/migrations/20261116135251_restore_single_flash_sale_expiry_job.sql', import.meta.url),
  'utf8'
);

test('only the canonical product-level flash-sale expiry job remains active', () => {
  assert.match(migration, /geostore-expire-flash-sales/);
  assert.match(migration, /geostore_expire_flash_sales/);
  assert.match(migration, /cron\.unschedule\(v_job_id\)/);
  assert.match(migration, /SELECT private\.expire_flash_sales\(\)/);
  assert.match(migration, /count\(\*\)[\s\S]*?Expected exactly one active GEOSTORE flash-sale expiry job/);
});

test('unused campaign RPCs remain inaccessible to client roles', () => {
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.admin_create_flash_sale/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.get_active_flash_sale/);
  assert.match(migration, /has_function_privilege\('anon'/);
  assert.match(migration, /has_function_privilege\('authenticated'/);
});

test('the existing guarded product-level flash-sale RPC remains available', () => {
  assert.match(migration, /public\.admin_apply_flash_sale\(numeric,text,integer\)/);
});
