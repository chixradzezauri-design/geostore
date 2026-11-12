import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('product deletion guard preserves both current and legacy order item references', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/20261112133000_guard_legacy_order_product_references.sql', import.meta.url),
    'utf8'
  );
  assert.match(migration, /order_item\.item->>'id'\s*=\s*p_product_id/);
  assert.match(migration, /order_item\.item->>'product_id'\s*=\s*p_product_id/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /jsonb_typeof\(o\.items\) = 'array'/);
  assert.match(migration, /auth\.uid\(\) IS DISTINCT FROM/);
});

test('direct authenticated product DELETE is revoked and its RLS policy removed', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/20261112140000_revoke_direct_product_delete.sql', import.meta.url),
    'utf8'
  );
  assert.match(migration, /DROP POLICY IF EXISTS "Admin can delete products" ON public\.products/i);
  assert.match(migration, /REVOKE DELETE ON TABLE public\.products FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /REVOKE ALL ON FUNCTION private\.admin_delete_product\(text\) FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.admin_delete_product\(text\) TO authenticated/i);
});
