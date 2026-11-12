import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261112120000_restrict_authenticated_product_cost_select_again.sql', import.meta.url),
  'utf8'
);

test('authenticated catalogue SELECT is column-scoped and excludes private purchase cost', () => {
  assert.match(migration, /REVOKE\s+SELECT\s+ON\s+TABLE\s+public\.products\s+FROM\s+anon\s*,\s*authenticated/i);
  const grant = migration.match(/GRANT\s+SELECT\s*\(([\s\S]*?)\)\s*ON\s+TABLE\s+public\.products\s+TO\s+anon\s*,\s*authenticated/i);
  assert.ok(grant, 'public catalogue columns must be explicitly allow-listed');
  assert.doesNotMatch(grant[1], /purchase_cost|margin|vendor_cost/i);
  assert.match(grant[1], /price_gel/i);
  assert.match(grant[1], /stock/i);
});

test('private procurement cost remains available to protected admin RPCs, not public direct SELECT', () => {
  assert.match(migration, /Admin full-row reads continue through the protected admin_list_products RPC/i);
  assert.doesNotMatch(migration, /GRANT\s+SELECT\s+ON\s+TABLE\s+public\.products\s+TO\s+authenticated/i);
});
