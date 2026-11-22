import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractLegacyCheckoutValidator } from '../scripts/stage66LegacyCheckoutFixture.mjs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const original = read('../supabase/migrations/20261106210000_validate_checkout_input_on_order_insert.sql');
const checkout = read('../supabase/migrations/20261117160000_stable_checkout_idempotency_ordering.sql');
const wrapper = read('../supabase/migrations/20261121170000_strip_private_costs_from_checkout_rpc.sql');
const integration = read('./sql/stage66_legacy_checkout_insert_compat_gate.sql');
const workflow = read('../.github/workflows/stage52-isolated-postgres.yml');

test('Stage66 extracts exact historical checkout trigger SQL but never runs its COMMIT', () => {
  const extracted = extractLegacyCheckoutValidator(original);
  assert.equal(extracted.split('\n').slice(1).join('\n').trim(),
    original.trim().replace(/^begin;\s*/i, '').replace(/\s*commit;$/i, '').trim());
  assert.match(extracted, /create trigger validate_order_checkout_input_before_insert/i);
  assert.match(extracted, /new\.customer_email is null/i);
  assert.doesNotMatch(extracted, /(^|\n)\s*(begin|commit|rollback)\s*;/im);
  assert.throws(() => extractLegacyCheckoutValidator(original.replace(/commit;\s*$/i, '')), /transaction boundaries changed/);
  assert.throws(() => extractLegacyCheckoutValidator(original.replace('new.customer_email is null','false')), /structure changed/);
});

test('Stage66 demonstrates the genuine source contract mismatch rather than guessing', () => {
  assert.match(checkout, /v_customer_email := nullif\(lower\(trim\(coalesce\(p_order->>'customer_email', ''\)\)\), ''\)/);
  assert.match(checkout, /if auth\.uid\(\) is null then[\s\S]*?if v_user_email <> 'guest'/i);
  assert.doesNotMatch(checkout, /if v_customer_email is null then/i);
  assert.match(wrapper, /IF coalesce\(length\(p_order->>'customer_email'\), 0\) > 254/);
  assert.match(original, /if coalesce\(new\.user_email, 'guest'\) = 'guest' and\s*\(new\.customer_email is null/i);
  assert.match(integration, /'id','STG66-NO-EMAIL-BASELINE'/);
  assert.match(integration, /'id','STG66-NO-EMAIL-BLOCKED'/);
  assert.match(integration, /'id','STG66-WITH-EMAIL-VALID'/);
  assert.match(integration, /GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT/);
  assert.match(integration, /სტუმრის შეკვეთისთვის მიუთითეთ სწორი ელფოსტა/);
});

test('Stage66 added no-cost rollback-only PostgreSQL test after all earlier contracts', () => {
  const stage65 = workflow.indexOf('psql -v ON_ERROR_STOP=1 -f tests/sql/stage65_expenses_order_role_matrix.sql');
  const stage66 = workflow.indexOf('psql -v ON_ERROR_STOP=1 -f tests/sql/stage66_legacy_checkout_insert_compat_gate.sql');
  assert.ok(stage65 >= 0 && stage66 > stage65);
  assert.match(workflow, /node scripts\/stage66LegacyCheckoutFixture\.mjs/);
  assert.match(workflow, /'supabase\/migrations\/20261106210000_validate_checkout_input_on_order_insert\.sql'/);
  assert.match(workflow, /postgres:17-alpine/);
  assert.doesNotMatch(workflow, /SUPABASE_SERVICE_ROLE|SUPABASE_ACCESS_TOKEN|DATABASE_URL/);
  assert.match(integration, /SAVEPOINT stage66_clean_baseline/);
  assert.match(integration, /ROLLBACK TO SAVEPOINT stage66_clean_baseline/);
  assert.match(integration, /\\i \/tmp\/stage66_original_checkout_validator_only\.sql/);
  assert.match(integration, /\nROLLBACK;/);
  assert.match(integration, /Stage66 rollback left legacy SQL/);
});

test('Stage66 documentation keeps production migration replay blocked', () => {
  const doc = read('../docs/stage66-free-legacy-insert-compat.md');
  assert.match(doc, /NO Production release/);
  assert.match(doc, /optional guest email/);
  assert.match(doc, /42 migration/);
  assert.match(doc, /isolated PostgreSQL 17/);
  assert.match(doc, /full-schema Supabase staging/);
});
