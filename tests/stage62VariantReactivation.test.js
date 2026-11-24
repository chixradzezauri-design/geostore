import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractOriginalVariantReactivation } from '../scripts/stage62ReactivationFixture.mjs';

const source=readFileSync(new URL('../supabase/migrations/20261107170000_integrate_custom_product_variants.sql',import.meta.url),'utf8');
const ledger=readFileSync(new URL('../supabase/migrations/20261117084403_private_inventory_movement_ledger_stage92.sql',import.meta.url),'utf8');
const fixture=readFileSync(new URL('./sql/stage62_cancelled_order_variant_reactivation.sql',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/stage52-isolated-postgres.yml',import.meta.url),'utf8');

test('Stage62 extracts true versioned reactivation function with original ledger movement markers',()=>{
 const actual=extractOriginalVariantReactivation(source,ledger);
 assert.match(actual,/CREATE OR REPLACE FUNCTION private\.admin_reactivate_cancelled_order/);
 assert.match(actual,/group by item->>'id', nullif\(trim\(item->>'customVariantId'\), ''\)/);
 assert.match(actual,/perform set_config\('geostore\.inventory_reason', 'order_reactivation', true\);/);
 assert.match(actual,/perform set_config\('geostore\.inventory_order_id', p_order_id, true\);/);
 assert.match(actual,/perform set_config\('geostore\.order_reactivation', 'on', true\);/);
 assert.throws(()=>extractOriginalVariantReactivation(source+source,ledger),/boundaries/);
 assert.throws(()=>extractOriginalVariantReactivation(source,'wrong ledger source'),/patch boundaries/);
});

test('Stage62 exact extracted RPC runs after Stage61 variant checkout and handles negative/positive rights',()=>{
 assert.match(workflow,/node scripts\/stage62ReactivationFixture\.mjs/);
 assert.match(workflow,/psql -v ON_ERROR_STOP=1 -f tests\/sql\/stage62_cancelled_order_variant_reactivation\.sql/);
 assert.match(workflow,/postgres:17-alpine/);
 assert.match(fixture,/\\i \/tmp\/stage62_original_variant_reactivation\.sql/);
 for(const key of [
  'fake staff admin role bypassed owner UUID',
  'ignored missing recent password AMR',
  'reactivation accepted insufficient Blue/M stock',
  'partial reactivation escaped transaction rollback',
  'owner reactivation double-deducted parent or wrong variant',
  'variant reactivation movement ledger missing or duplicated',
  'reactivation replay double-deducted stock',
  'second cancellation did not restore just variants once',
  'lifecycle inventory ledger does not reconcile to zero',
  'reactivation modified private purchase costs or sale totals'
 ])assert.ok(fixture.includes(key),key);
 assert.doesNotMatch(workflow,/DATABASE_URL|SUPABASE_SERVICE_ROLE|SUPABASE_ACCESS_TOKEN/);
});
