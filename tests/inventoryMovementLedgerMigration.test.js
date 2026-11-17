import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const migration = await readFile(new URL('../supabase/migrations/20261117180000_private_inventory_movement_ledger.sql', import.meta.url), 'utf8');
test('private append-only inventory movement safeguards', () => {
  assert.ok(migration.includes('CREATE TABLE IF NOT EXISTS private.inventory_movements'));
  assert.ok(migration.includes('BEFORE UPDATE OR DELETE ON private.inventory_movements'));
  assert.ok(migration.includes('AFTER INSERT OR UPDATE OR DELETE ON public.products'));
  assert.ok(migration.includes('ENABLE ROW LEVEL SECURITY'));
  assert.ok(migration.includes('REVOKE ALL ON TABLE private.inventory_movements'));
  assert.ok(migration.includes('order_deduction'));
  assert.ok(migration.includes('order_cancellation'));
  assert.ok(migration.includes('order_reactivation'));
  assert.ok(migration.includes('auth.uid() IS DISTINCT FROM'));
  assert.ok(migration.includes('Expected checkout stock marker was not found'));
  assert.ok(migration.includes('Expected cancellation stock marker was not found'));
  assert.ok(migration.includes('Expected reactivation stock marker was not found'));
});
