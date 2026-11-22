import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fixture=readFileSync(new URL('./sql/stage61_variant_checkout_contract.sql',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/stage52-isolated-postgres.yml',import.meta.url),'utf8');
const actualCheckout=readFileSync(new URL('../supabase/migrations/20261117160000_stable_checkout_idempotency_ordering.sql',import.meta.url),'utf8');
const actualAdmin=readFileSync(new URL('../supabase/migrations/20261109151847_move_variant_stock_security_definer_to_private.sql',import.meta.url),'utf8');

test('Stage61 executes the actual versioned private checkout and size/color stock editor',()=>{
 assert.match(fixture,/\\ir \.\.\/\.\.\/supabase\/migrations\/20261117160000_stable_checkout_idempotency_ordering\.sql/);
 assert.match(fixture,/\\ir \.\.\/\.\.\/supabase\/migrations\/20261109151847_move_variant_stock_security_definer_to_private\.sql/);
 assert.match(workflow,/psql -v ON_ERROR_STOP=1 -f tests\/sql\/stage61_variant_checkout_contract\.sql/);
 assert.match(workflow,/postgres:17-alpine/);
 assert.match(actualCheckout,/CREATE OR REPLACE FUNCTION private\.create_order_with_stock\(p_order jsonb\)/);
 assert.match(actualCheckout,/customVariantId/);
 assert.match(actualCheckout,/geostore\.inventory_reason/);
 assert.match(actualAdmin,/CREATE OR REPLACE FUNCTION private\.admin_set_product_variant_stocks/);
 assert.doesNotMatch(workflow,/DATABASE_URL|SUPABASE_SERVICE_ROLE|SUPABASE_ACCESS_TOKEN/);
});

test('Stage61 protects separate variant quantities, idempotent replay and finance data',()=>{
 for(const guard of [
  'real variant checkout totals or item count incorrect',
  'real checkout returned internal vendor or cost data',
  'size, color or addon line was incorrectly combined',
  'variant replay changed receipt or costs',
  'checkout double-deducted parent or variant stock',
  'variant deduction movement audit mismatch',
  'depleted color variant was oversold',
  'mismatched custom variant size was accepted',
  'failed checkout consumed stock or wrote phantom order',
  'variant cancellation failed to restore exact stock once',
  'variant stock movement reconciliation failed',
  'cancellation modified private financial history',
  'non-owner product staff changed size/color inventory',
  'duplicate variant stock IDs accepted',
  'incomplete size/color variant update accepted',
  'owner stock edit changed the wrong size/color'
 ])assert.ok(fixture.includes(guard),guard);
});
