import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const migration = await readFile(new URL('../supabase/migrations/20261117180000_private_inventory_movement_ledger.sql', import.meta.url), 'utf8');
test('private append-only inventory movement migration safeguards', () => {
 assert.match(migration, /CREATE TABLE IF NOT EXISTS private\\.inventory_movements/);
 assert.match(migration, /BEFORE UPDATE OR DELETE ON private\\.inventory_movements/);
 assert.match(migration, /AFTER INSERT OR UPDATE OR DELETE ON public\\.products/i);
 assert.match(migration, /auth\\.uid\\(\\) IS DISTINCT FROM/);
 assert.match(migration, /order_deduction/);
 assert.match(migration, /order_cancellation/);
 assert.match(migration, /order_reactivation/);
});
