import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const obsolete = read('../supabase/migrations/20261106120000_validate_order_item_variants.sql');
const historical = read('./sql/stage69_legacy_variant_history_replay.sql');
const stage61 = read('./sql/stage61_variant_checkout_contract.sql');
const stage62 = read('./sql/stage62_cancelled_order_variant_reactivation.sql');
const workflow = read('../.github/workflows/stage52-isolated-postgres.yml');

test('Stage69 captures unmodified historical order-size trigger that ignores custom_variant_id', () => {
  assert.match(obsolete, /CREATE OR REPLACE FUNCTION private\.validate_order_item_variants\(\)/i);
  assert.match(obsolete, /BEFORE INSERT OR UPDATE OF items\s+ON public\.orders/i);
  assert.match(obsolete, /v_item->>'selectedSize'/);
  assert.match(obsolete, /v_item->>'selectedColor'/);
  assert.match(obsolete, /FROM public\.products/i);
  assert.match(obsolete, /v_allowed_sizes/);
  assert.match(obsolete, /v_allowed_colors/);
  assert.doesNotMatch(obsolete, /custom_variant_id|customVariantId/);
  assert.match(historical,/\\ir \.\.\/\.\.\/supabase\/migrations\/20261106120000_validate_order_item_variants\.sql/);
});

test('Stage69 uses existing genuine checkout/cancellation/re-activation order fixture', () => {
  assert.match(stage61, /'id','STG61-VARIANTS-001'/);
  assert.match(stage61, /'STG61-SHOE'/);
  assert.match(stage61, /'selected_size','S'/);
  assert.match(stage61, /'selected_color','Red'/);
  assert.match(stage62, /admin_reactivate_cancelled_order\('STG61-VARIANTS-001'\)/);
  assert.match(stage62, /'STG61-VARIANTS-001','გაუქმებული'/);
  assert.match(historical, /FROM public\.orders WHERE id='STG61-VARIANTS-001'/);
  assert.match(historical, /UPDATE public\.orders SET items=items WHERE id='STG61-VARIANTS-001'/);
  assert.match(historical, /available_sizes='\[\]'::jsonb/);
  assert.match(historical, /available_colors='\[\]'::jsonb/);
});

test('Stage69 demonstrates expected exact legacy error and full transaction rollback without live writes', () => {
  for (const invariant of [
    'Stage69 original historical no-op order update failed',
    'Stage69 unexpected error, not a legacy variant regression',
    'არჩეული ზომა ამ პროდუქტისთვის ხელმისაწვდომი არ არის.',
    'Stage69 blocked legacy update damaged historical order or stock ledger',
    'Stage69 transaction rollback did not restore original schema/history/stock',
    'orders_validate_item_variants',
    'STG61-VARIANTS-001',
    'SAVEPOINT stage69_before_order_touch',
    'ROLLBACK TO SAVEPOINT stage69_before_order_touch'
  ]) assert.ok(historical.includes(invariant),'Stage69 fixture invariant absent: '+invariant);
  assert.match(historical, /\nROLLBACK;\n/);
  assert.match(historical, /CREATE TEMP TABLE stage69_snapshot ON COMMIT DROP/);
  assert.match(historical, /v_message IS DISTINCT FROM/);
  assert.doesNotMatch(historical, /SUPABASE_URL|DATABASE_URL|service_role|https?:\/\/[^ \n]+/i);
});

test('Stage69 is appended only to existing no-cost PostgreSQL17 job', () => {
  const prev = workflow.indexOf('psql -v ON_ERROR_STOP=1 -f tests/sql/stage68_legacy_admin_product_scope_replay.sql');
  const next = workflow.indexOf('psql -v ON_ERROR_STOP=1 -f tests/sql/stage69_legacy_variant_history_replay.sql');
  assert.ok(prev >= 0 && next > prev);
  assert.match(workflow, /'tests\/sql\/stage69_legacy_variant_history_replay\.sql'/);
  assert.match(workflow, /'supabase\/migrations\/20261106120000_validate_order_item_variants\.sql'/);
  assert.match(workflow, /postgres:17-alpine/);
  assert.doesNotMatch(workflow, /SUPABASE_SERVICE_ROLE|SUPABASE_ACCESS_TOKEN|DATABASE_URL/);
});

test('Stage69 reviews all seven unmatched older SQL files, without equating metadata to SQL', () => {
  const doc = read('../docs/stage69-seven-legacy-migrations-review.md');
  for (const token of [
    'NOT RELEASE-READY', '20261106120000_validate_order_item_variants.sql',
    '20261106210000_validate_checkout_input_on_order_insert.sql',
    '20261106220000_harden_support_ticket_public_insert.sql',
    '20261107153000_enable_rls_order_tracking_rate_limits.sql',
    '20261107170000_integrate_custom_product_variants.sql',
    '20261107172000_stabilize_admin_product_order.sql',
    '20261110050000_enable_support_ticket_status_realtime.sql',
    'full-schema staging', '42', 'no paid staging', 'ROLLBACK'
  ]) assert.ok(doc.includes(token),'Stage69 report missing '+token);
  assert.match(doc, /read-only/);
  assert.match(doc, /not proof of SQL equivalence/i);
});
