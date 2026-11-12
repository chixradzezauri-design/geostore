import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('guest order tracking includes the purchased size, color and custom variant in its safe item summary', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/20261110140000_include_variant_details_in_order_tracking.sql', import.meta.url),
    'utf8'
  );

  const summaryStart = migration.indexOf("'itemSummary'");
  assert.notEqual(summaryStart, -1, 'tracking RPC must return an item summary');
  const summary = migration.slice(summaryStart, migration.indexOf("'პროდუქტები')", summaryStart) + 30);

  for (const field of [
    "item->>'name'",
    "item->>'customVariantName'",
    "item->>'selectedSize'",
    "item->>'selectedColor'",
    "item->>'quantity'"
  ]) {
    assert.ok(summary.includes(field), `tracking summary must include ${field}`);
  }

  // Guest tracking must not expose procurement or margin information.
  for (const privateField of ['purchase_cost', 'vendor', 'profit', 'margin', 'supplier']) {
    assert.equal(summary.includes(privateField), false, `tracking summary must not expose ${privateField}`);
  }
});

test('the customer tracking modal displays the server-provided item summary', async () => {
  const modal = await readFile(new URL('../src/components/Modals.jsx', import.meta.url), 'utf8');
  assert.match(modal, /trackedOrder\.itemSummary\s*\|\|\s*copy\.products/);
});
