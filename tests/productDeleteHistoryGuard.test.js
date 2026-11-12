import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('product deletion preserves history for both current and legacy order product identifiers', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261112133000_guard_legacy_order_product_references.sql', import.meta.url), 'utf8');
  assert.match(sql, /order_item\.item->>'id'\s*=\s*p_product_id/);
  assert.match(sql, /order_item\.item->>'product_id'\s*=\s*p_product_id/);
  assert.match(sql, /FROM public\.products[\s\S]*?WHERE id = p_product_id[\s\S]*?FOR UPDATE/);
  assert.match(sql, /FROM public\.orders AS o[\s\S]*?jsonb_array_elements[\s\S]*?WHERE order_item\.item->>'id'[\s\S]*?OR order_item\.item->>'product_id'/);
  assert.match(sql, /auth\.uid\(\) IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid/);
  assert.match(sql, /SECURITY DEFINER[\s\S]*?SET search_path TO ''/);
});
