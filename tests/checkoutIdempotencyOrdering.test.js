import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261117160000_stable_checkout_idempotency_ordering.sql', import.meta.url),
  'utf8'
);

test('checkout variant snapshots use a deterministic custom-variant tie-breaker', () => {
  assert.match(
    migration,
    /order by grouped\.product_id, grouped\.selected_size nulls first, grouped\.selected_color nulls first, grouped\.custom_variant_id nulls first/
  );
});

test('checkout customization snapshots use the same deterministic variant tie-breaker', () => {
  assert.match(
    migration,
    /grouped\.selected_color nulls first, grouped\.custom_variant_id nulls first,\s+grouped\.gift_wrap/
  );
});

test('the idempotency ordering migration only replaces the checkout function', () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION private\.create_order_with_stock\(p_order jsonb\)/);
  assert.match(migration, /BEGIN;[\s\S]*COMMIT;/);
  assert.doesNotMatch(migration, /INSERT INTO public\.orders|UPDATE public\.products|DELETE FROM public\.orders/i);
});
