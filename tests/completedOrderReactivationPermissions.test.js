import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261119090000_revoke_anon_completed_order_reactivation.sql', import.meta.url), 'utf8');

test('completed-order reactivation is not executable by anonymous clients', () => {
  assert.ok(migration.includes('REVOKE ALL ON FUNCTION public.admin_reopen_completed_order(text) FROM PUBLIC, anon;'));
  assert.ok(migration.includes('GRANT EXECUTE ON FUNCTION public.admin_reopen_completed_order(text) TO authenticated, service_role;'));
  assert.ok(migration.includes('BEGIN;'));
  assert.ok(migration.includes('COMMIT;'));
});
