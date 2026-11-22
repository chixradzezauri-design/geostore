import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractLegacyVariantCheckout } from '../scripts/stage67LegacyCheckoutReplayFixture.mjs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const historical = read('../supabase/migrations/20261107170000_integrate_custom_product_variants.sql');
const current = read('../supabase/migrations/20261117160000_stable_checkout_idempotency_ordering.sql');
const fixture = read('./sql/stage67_legacy_checkout_ownership_replay.sql');
const pipeline = read('../.github/workflows/stage52-isolated-postgres.yml');

test('Stage67 isolates exact old checkout function; rejects altered boundaries or surprises', () => {
  const extracted=extractLegacyVariantCheckout(historical);
  const start='CREATE OR REPLACE FUNCTION private.create_order_with_stock(p_order jsonb)';
  const next='CREATE OR REPLACE FUNCTION private.admin_update_order_status(p_order_id text, p_new_status text)';
  const fromSource=historical.slice(historical.indexOf(start),historical.indexOf(next)).trim();
  assert.equal(extracted.split('\n').slice(1).join('\n').trim(),fromSource);
  assert.doesNotMatch(extracted,/CREATE OR REPLACE FUNCTION private\.admin_update_order_status/);
  assert.doesNotMatch(extracted,/(^|\n)\s*(BEGIN;|COMMIT;|ROLLBACK;)/i);
  assert.throws(()=>extractLegacyVariantCheckout(historical.replace(next,'-- function removed')), /boundaries changed/);
  assert.throws(()=>extractLegacyVariantCheckout(historical.replace(
    'insert into public.orders(id, customer_name, phone, address, user_email, customer_email, items,',
    'insert into public.orders(id, customer_name, phone, address, user_email, user_id, customer_email, items,'
  )), /verified regression/);
});

test('Stage67 existing checkout preserves user identity, stock-order audit and image snapshots',()=>{
  assert.match(current,/insert into public\.orders\(id, customer_name, phone, address, user_email, user_id, customer_email, items,/i);
  assert.match(current,/v_user_email, auth\.uid\(\), v_customer_email, v_items/);
  assert.match(current,/'gallery', coalesce\(v_product\.gallery, '\[\]'::jsonb\)/);
  assert.match(current,/set_config\('geostore\.inventory_reason', 'order_deduction', true\)/);
  assert.match(current,/set_config\('geostore\.inventory_order_id', v_order_id, true\)/);
  const old=extractLegacyVariantCheckout(historical);
  assert.match(old,/insert into public\.orders\(id, customer_name, phone, address, user_email, customer_email, items,/i);
  assert.doesNotMatch(old,/user_email, user_id, customer_email/);
  assert.doesNotMatch(old,/set_config\('geostore\.inventory_reason'/);
  assert.doesNotMatch(old,/'gallery',/);
});

test('Stage67 real PostgreSQL integration uses ROLLBACK, synthetic JWT, real variant and source SQL',()=>{
  for (const phrase of [
    "ROLLBACK TO SAVEPOINT stage67_clean_original",
    "\\i /tmp/stage67_original_legacy_variant_checkout.sql",
    "'id','STG67-CURRENT-AUTH-001'",
    "'id','STG67-LEGACY-AUTH-001'",
    "member@stage67.test",
    "Stage67 current function must preserve account ownership",
    "Stage67 old function no longer reproduces ownership/gallery/ledger regression",
    "Stage67 transaction rollback did not preserve the current checkout schema"
  ]) assert.ok(fixture.includes(phrase),'Stage67 fixture missing: '+phrase);
  assert.match(fixture,/\nROLLBACK;\n/);
  assert.match(fixture,/INSERT INTO auth\.users\(id,email_confirmed_at\)/);
  const stage66=pipeline.indexOf('psql -v ON_ERROR_STOP=1 -f tests/sql/stage66_legacy_checkout_insert_compat_gate.sql');
  const stage67=pipeline.indexOf('psql -v ON_ERROR_STOP=1 -f tests/sql/stage67_legacy_checkout_ownership_replay.sql');
  assert.ok(stage66>=0 && stage67>stage66);
  assert.match(pipeline,/node scripts\/stage67LegacyCheckoutReplayFixture\.mjs/);
  assert.match(pipeline,/postgres:17-alpine/);
  assert.doesNotMatch(pipeline,/DATABASE_URL|SUPABASE_ACCESS_TOKEN|SUPABASE_SERVICE_ROLE/);
});

test('Stage67 release gate documents no production merge or paid testing',()=>{
  const doc=read('../docs/stage67-historical-checkout-owner-compat.md');
  for (const phrase of [
    'NOT RELEASE-READY','full-schema Supabase staging','user_id',
    'gallery','inventory_reason','no paid staging'
  ]) assert.ok(doc.includes(phrase),'Stage67 report missing '+phrase);
});
