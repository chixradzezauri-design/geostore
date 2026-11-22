import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { extractOriginalInventoryLedgerTriggers } from '../scripts/stage60InventoryLedgerFixture.mjs';

const inventory=readFileSync(new URL('../supabase/migrations/20261117084403_private_inventory_movement_ledger_stage92.sql',import.meta.url),'utf8');
const fixture=readFileSync(new URL('./sql/stage60_triggers_inventory_contract.sql',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/stage52-isolated-postgres.yml',import.meta.url),'utf8');

test('Stage60 extracts unmodified real inventory ledger table/trigger prefix rather than a mock',()=>{
 const prefix=extractOriginalInventoryLedgerTriggers(inventory);
 assert.match(prefix,/CREATE TRIGGER products_inventory_movement_after_change/);
 assert.match(prefix,/CREATE TRIGGER inventory_movements_append_only/);
 assert.match(prefix,/CREATE TABLE IF NOT EXISTS private\.inventory_movements/);
 assert.doesNotMatch(prefix,/-- Add trustworthy reason\/order context to the existing stock RPCs/);
 assert.throws(()=>extractOriginalInventoryLedgerTriggers('unrecognized source'),/marker/);
 assert.throws(()=>extractOriginalInventoryLedgerTriggers(inventory+inventory),/marker/);
});

test('Stage60 executable Postgres fixture loads original order status/notification/guard and owner reopen definitions',()=>{
 for(const file of [
  '20261103155226_track_order_status_change_time.sql',
  '20261103122121_prevent_stock_restore_after_dispatch.sql',
  '20261107130302_add_order_status_notifications.sql',
  '20261117231504_reopen_completed_orders.sql'
 ]) assert.ok(fixture.includes('\\ir ../../supabase/migrations/'+file),file);
 assert.match(fixture,/\\i \/tmp\/stage60_original_inventory_trigger_prefix\.sql/);
 assert.match(workflow,/node scripts\/stage60InventoryLedgerFixture\.mjs/);
 assert.match(workflow,/psql -v ON_ERROR_STOP=1 -f tests\/sql\/stage60_triggers_inventory_contract\.sql/);
 assert.match(workflow,/postgres:17-alpine/);
 assert.doesNotMatch(workflow,/DATABASE_URL|SUPABASE_SERVICE_ROLE|SUPABASE_ACCESS_TOKEN/);
});

test('Stage60 checks real stock/finance/notification invariants including duplicate cancellation',()=>{
 for(const flag of [
 'initial synthetic checkout stock mismatch',
 'initial customer-vs-guest notification boundary changed',
 'completed order allowed cancellation',
 'completed-order reopening accepted stale/no password AMR',
 'owner completed-order reopening failed or duplicated deduction',
 'repeated cancel failed',
 'cancellation movement audit missing/duplicated',
 'inventory movement reconciliation failed',
 'notification events missing or duplicated',
 'status timestamp not persisted after reopening',
 'financial order amounts/snapshots changed',
 'finance-accessed ledger inconsistent with lifecycle',
 'orders-only ledger lost customer fields or leaked finance',
 'inventory movement history was mutable'
 ])assert.ok(fixture.includes(flag),flag);
});
