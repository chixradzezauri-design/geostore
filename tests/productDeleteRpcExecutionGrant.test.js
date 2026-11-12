import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('authenticated users can reach the guarded private delete RPC through the invoker wrapper', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/20261112150000_restore_private_product_delete_rpc_execute.sql', import.meta.url),
    'utf8'
  );
  assert.match(migration, /GRANT EXECUTE ON FUNCTION private\.admin_delete_product\(text\) TO authenticated/i);
  assert.doesNotMatch(migration, /GRANT EXECUTE ON FUNCTION private\.admin_delete_product\(text\) TO PUBLIC/i);
  assert.match(migration, /primary-admin UID and role/i);
});
