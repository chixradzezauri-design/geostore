import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { redactCustomerCheckoutItems } from '../src/utils/orderSafety.js';

const migration = readFileSync(new URL('../supabase/migrations/20261121170000_strip_private_costs_from_checkout_rpc.sql', import.meta.url), 'utf8');
const privateCheckout = readFileSync(new URL('../supabase/migrations/20261117160000_stable_checkout_idempotency_ordering.sql', import.meta.url), 'utf8');
const precedingWrapper = readFileSync(new URL('../supabase/migrations/20261107115218_persist_checkout_addons_server_pricing.sql', import.meta.url), 'utf8');

test('Stage51 public checkout wrapper excludes financial purchase cost from new orders and idempotent replays', () => {
  assert.match(privateCheckout, /'purchase_cost', v_product\.purchase_cost/);
  assert.match(privateCheckout, /v_existing\.checkout_result \|\| jsonb_build_object\('idempotent_replay', true\)/);
  assert.match(migration, /v_internal_result := private\.create_order_with_stock\(p_order\)/);
  assert.match(migration, /entry\.item - ARRAY\['purchase_cost', 'purchaseCost', 'cost_price', 'costPrice'\]::text\[\]/);
  assert.match(migration, /jsonb_agg\([\s\S]*ORDER BY entry\.line_no/);
  assert.match(migration, /RETURN jsonb_set\(v_internal_result, '\{items\}', v_public_items, false\)/);
  assert.doesNotMatch(migration, /UPDATE public\.orders|UPDATE public\.products|DELETE FROM public\.orders|INSERT INTO public\.orders/i);
});

test('Stage51 retains every existing customer input bound and public RPC privilege without exposing private tables', () => {
  const marker = '-- Bound the public guest-checkout payload before it reaches the stock/price transaction.';
  const earlier = precedingWrapper.slice(precedingWrapper.lastIndexOf(marker));
  assert.ok(earlier.startsWith(marker));
  const checks = [
    "octet_length(p_order::text) > 65536",
    "coalesce(length(trim(p_order->>'id')), 0) NOT BETWEEN 6 AND 64",
    "coalesce(length(trim(p_order->>'customer_name')), 0) NOT BETWEEN 2 AND 100",
    "coalesce(length(trim(p_order->>'address')), 0) NOT BETWEEN 3 AND 400",
    "length(v_phone) NOT BETWEEN 9 AND 15",
    "jsonb_array_length(p_order->'items') NOT BETWEEN 1 AND 50",
    "coalesce(length(item->>'selected_size'), 0) > 40",
    "coalesce(length(item->>'selected_color'), 0) > 60",
    "item ? 'gift_wrap'",
    "item ? 'vip_warranty'"
  ];
  for (const check of checks) {
    assert.ok(earlier.includes(check), 'Previous validation: ' + check);
    assert.ok(migration.includes(check), 'Preserved validation: ' + check);
  }
  assert.match(migration, /LANGUAGE plpgsql\s+SET search_path TO ''/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.create_order_with_stock\(jsonb\) FROM PUBLIC/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.create_order_with_stock\(jsonb\) TO anon, authenticated/);
  assert.match(migration, /BEGIN;[\s\S]*COMMIT;/);
  assert.equal((migration.match(/private\.create_order_with_stock\(p_order\)/g)||[]).length, 1);
});

test('Stage51 deliberately preserves the internal financial snapshot used by admin finance', () => {
  assert.match(privateCheckout, /'purchase_cost', v_product\.purchase_cost/);
  assert.match(privateCheckout, /insert into public\.orders\(id, customer_name, phone, address/);
  assert.match(migration, /The existing server transaction stores purchase_cost for authorized finance/);
  assert.match(migration, /Data API response is filtered/);
});


test('Stage51 customer receipt strips private cost fields without altering authoritative prices', () => {
  const original = [{
    id: 'p1', price: 150, base_price: 130, addon_total: 20, quantity: 2,
    purchase_cost: 51, purchaseCost: 52, cost_price: 53, costPrice: 54,
    selectedSize: 'M', gift_wrap: true
  }];
  const result = redactCustomerCheckoutItems(original);
  assert.deepEqual(result, [{
    id: 'p1', price: 150, base_price: 130, addon_total: 20,
    quantity: 2, selectedSize: 'M', gift_wrap: true
  }]);
  assert.equal(original[0].purchase_cost, 51, 'No mutation to original authoritative snapshot');
  assert.deepEqual(redactCustomerCheckoutItems(null), []);
});

test('Stage51 applies receipt redaction before customer normalization / local state', () => {
  const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(app, /const confirmedItems = normalizeOrderItems\(\s*redactCustomerCheckoutItems\(/);
  assert.match(app, /serverOrderResult\.items\) \? serverOrderResult\.items : itemsToOrder/);
});
