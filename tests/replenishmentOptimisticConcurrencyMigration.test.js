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
