import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261112063136_product_base_payload_validation.sql', import.meta.url),
  'utf8'
);

const saveStart = migration.indexOf('CREATE OR REPLACE FUNCTION private.admin_save_product');
const updateStart = migration.indexOf('CREATE OR REPLACE FUNCTION private.admin_update_product_with_stock', saveStart);
assert.notEqual(saveStart, -1, 'product creation RPC must exist in the migration');
assert.notEqual(updateStart, -1, 'product update RPC must follow the creation RPC');

const saveFunction = migration.slice(saveStart, updateStart);

test('new product creation applies safe defaults to omitted NOT NULL flags', () => {
  assert.match(
    saveFunction,
    /'is_featured'\s*,\s*coalesce\(\(p_product\s*->>\s*'is_featured'\)::boolean\s*,\s*false\)/i
  );
  assert.match(
    saveFunction,
    /'is_published'\s*,\s*coalesce\(\(p_product\s*->>\s*'is_published'\)::boolean\s*,\s*true\)/i
  );
});

test('explicit false product flags remain intact instead of being overwritten by defaults', () => {
  assert.match(saveFunction, /p_product\s*\|\|\s*jsonb_build_object\(/i);
  assert.match(saveFunction, /coalesce\(\(p_product\s*->>\s*'is_featured'\)::boolean\s*,\s*false\)/i);
  assert.match(saveFunction, /coalesce\(\(p_product\s*->>\s*'is_published'\)::boolean\s*,\s*true\)/i);
});
