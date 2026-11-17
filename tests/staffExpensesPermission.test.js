import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261117143000_staff_expenses_permission.sql', import.meta.url), 'utf8');
const foundation = await readFile(new URL('../supabase/migrations/20261117100000_admin_staff_auth_foundation.sql', import.meta.url), 'utf8');
const products = await readFile(new URL('../supabase/migrations/20261117140000_staff_products_permission.sql', import.meta.url), 'utf8');

test('expenses table is protected by the active expenses module permission', () => {
  assert.match(migration, /Staff with expenses permission can manage expenses/);
  assert.match(migration, /FOR ALL\s+TO authenticated/);
  assert.match(migration, /USING \(public\.has_staff_permission\('expenses'\)\)/);
  assert.match(migration, /WITH CHECK \(public\.has_staff_permission\('expenses'\)\)/);
  assert.match(foundation, /'expenses'/);
});

test('purchase-cost reads remain separate from ordinary products access', () => {
  assert.match(products, /admin_list_products/);
  assert.match(products, /has_staff_permission\(''expenses''\)/);
  assert.match(products, /REVOKE INSERT \(purchase_cost\), UPDATE \(purchase_cost\), SELECT \(purchase_cost\)/);
});
