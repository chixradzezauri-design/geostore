import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261120123000_replenishment_optimistic_concurrency.sql', import.meta.url), 'utf8');

test('versioned replenishment RPC is additive and checks saved revision under a row lock', () => {
  assert.match(migration, /p_expected_updated_at timestamptz/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /v_existing\.updated_at IS DISTINCT FROM p_expected_updated_at/);
  assert.match(migration, /p_expected_updated_at IS NULL/);
  assert.match(migration, /USING ERRCODE = '40001'/);
  assert.match(migration, /greatest\(clock_timestamp\(\), v_existing\.updated_at \+ interval '1 microsecond'\)/);
  assert.doesNotMatch(migration, /DROP FUNCTION|DROP TABLE|TRUNCATE/i);
});

test('versioned replenishment RPC retains staff permission checks and invoker wrapper', () => {
  assert.match(migration, /public\.has_staff_permission\('products'\)/);
  assert.match(migration, /SECURITY DEFINER SET search_path TO ''/);
  assert.match(migration, /SECURITY INVOKER SET search_path TO ''/);
  assert.match(migration, /TO authenticated, service_role/);
  assert.match(migration, /TO authenticated;/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.admin_save_inventory_replenishment_setting/);
});

test('concurrent first-time writes serialize on the parent product lock', () => {
  const productLock = migration.indexOf('WHERE p.id = p_product_id FOR UPDATE');
  const settingRead = migration.indexOf('FROM private.inventory_replenishment_settings AS s');
  const insert = migration.indexOf('INSERT INTO private.inventory_replenishment_settings');
  assert.ok(productLock > 0 && settingRead > productLock && insert > settingRead);
  assert.match(migration, /IF p_expected_updated_at IS NOT NULL THEN/);
});

test('legacy four-argument API is not revoked before existing clients migrate', () => {
  assert.match(migration, /legacy four-argument public RPC still permits last-write-wins saves/);
  assert.doesNotMatch(migration, /REVOKE ALL ON FUNCTION public\.admin_save_inventory_replenishment_setting\(text,text,integer,integer\)/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.admin_save_inventory_replenishment_setting\(text,text,integer,integer,timestamptz\)/);
});

test('migration requests PostgREST schema refresh before commit', () => {
  assert.match(migration, /NOTIFY pgrst, 'reload schema';/);
  assert.ok(migration.indexOf("NOTIFY pgrst, 'reload schema'") < migration.lastIndexOf('COMMIT;'));
});
