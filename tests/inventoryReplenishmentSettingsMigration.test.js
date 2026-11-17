import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261117210000_inventory_replenishment_settings.sql', import.meta.url), 'utf8');

test('replenishment settings are private, bounded and protected by RLS', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS private\\.inventory_replenishment_settings/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON TABLE private\\.inventory_replenishment_settings FROM PUBLIC, anon, authenticated, service_role/);
  assert.match(migration, /low_stock_threshold BETWEEN 0 AND 100000/);
  assert.match(migration, /target_stock > low_stock_threshold/);
  assert.match(migration, /inventory_replenishment_position_uidx/);
});

test('both settings RPCs enforce the existing primary-admin identity and app metadata role', () => {
  assert.equal((migration.match(/auth\\.uid\\(\\) IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid/g) || []).length, 2);
  assert.equal((migration.match(/auth\\.jwt\\(\\)->'app_metadata'->>'role', ''\\) <> 'admin'/g) || []).length, 2);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\\.admin_list_inventory_replenishment_settings\\(integer\\) TO authenticated/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\\.admin_save_inventory_replenishment_setting\\(text, text, integer, integer\\) TO authenticated/);
});

test('save RPC locks and validates the product and exact variant without mutating stock', () => {
  assert.match(migration, /FROM public\\.products AS p[\\s\\S]*?WHERE p\\.id = p_product_id[\\s\\S]*?FOR UPDATE/);
  assert.match(migration, /jsonb_array_elements/);
  assert.match(migration, /v\\.item->>'id' = p_variant_id/);
  assert.doesNotMatch(migration, /UPDATE public\\.products/);
});

test('concurrent first-time settings saves use the unique position index atomically', () => {
  assert.match(migration, /ON CONFLICT \\(product_id, \\(coalesce\\(variant_id, ''\\)\\)\\)\\s+DO UPDATE/);
  assert.match(migration, /RETURNING \\* INTO v_saved/);
  assert.doesNotMatch(migration, /SELECT s\\.id INTO v_existing_id/);
});

test('blank variant IDs are rejected instead of colliding with the base-product key', () => {
  assert.match(migration, /p_variant_id IS NOT NULL AND trim\\(p_variant_id\\) = ''/);
});
