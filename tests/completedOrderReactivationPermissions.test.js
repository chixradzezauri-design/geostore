import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261119090000_revoke_anon_completed_order_reactivation.sql', import.meta.url), 'utf8');

test('completed-order reactivation is not executable by anonymous clients', () => {
  assert.match(migration, /REVOKE ALL ON FUNCTION public\\.admin_reopen_completed_order\\(text\\) FROM PUBLIC, anon/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\\.admin_reopen_completed_order\\(text\\) TO authenticated, service_role/);
  assert.match(migration, /BEGIN;[\\s\\S]*COMMIT;/);
});
