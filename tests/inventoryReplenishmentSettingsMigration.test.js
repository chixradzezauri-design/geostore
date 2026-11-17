import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261117210000_inventory_replenishment_settings.sql', import.meta.url), 'utf8');

test('replenishment settings are private, bounded and protected by RLS', () => {
  assert.ok(migration.includes('CREATE TABLE IF NOT EXISTS private.inventory_replenishment_settings'));
  assert.ok(migration.includes('ENABLE ROW LEVEL SECURITY'));
  assert.ok(migration.includes('REVOKE ALL ON TABLE private.inventory_replenishment_settings FROM PUBLIC, anon, authenticated, service_role'));
  assert.ok(migration.includes('low_stock_threshold BETWEEN 0 AND 100000'));
  assert.ok(migration.includes('target_stock > low_stock_threshold'));
  assert.ok(migration.includes('inventory_replenishment_position_uidx'));
});

test('both settings RPCs enforce the existing primary-admin identity and app metadata role', () => {
  assert.equal(migration.split("auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid").length - 1, 2);
  assert.equal(migration.split("coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'admin'").length - 1, 2);
  assert.ok(migration.includes('GRANT EXECUTE ON FUNCTION public.admin_list_inventory_replenishment_settings(integer) TO authenticated'));
  assert.ok(migration.includes('GRANT EXECUTE ON FUNCTION public.admin_save_inventory_replenishment_setting(text, text, integer, integer) TO authenticated'));
});

test('save RPC locks and validates the product and exact variant without mutating stock', () => {
  assert.ok(migration.includes('FROM public.products AS p'));
  assert.ok(migration.includes('WHERE p.id = p_product_id'));
  assert.ok(migration.includes('FOR UPDATE'));
  assert.ok(migration.includes('jsonb_array_elements'));
  assert.ok(migration.includes("v.item->>'id' = p_variant_id"));
  assert.ok(!migration.includes('UPDATE public.products'));
});

test('concurrent first-time settings saves use the unique position index atomically', () => {
  assert.ok(migration.includes("ON CONFLICT (product_id, (coalesce(variant_id, '')))"));
  assert.ok(migration.includes('DO UPDATE SET'));
  assert.ok(migration.includes('RETURNING * INTO v_saved'));
  assert.ok(!migration.includes('SELECT s.id INTO v_existing_id'));
});

test('blank variant IDs are rejected instead of colliding with the base-product key', () => {
  assert.ok(migration.includes("p_variant_id IS NOT NULL AND trim(p_variant_id) = ''"));
});
