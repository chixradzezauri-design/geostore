import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const source = new URL('../supabase/migrations/20261117084403_private_inventory_movement_ledger_stage92.sql', import.meta.url);
export const STAGE60_LEDGER_FIXTURE_PATH = '/tmp/stage60_original_inventory_trigger_prefix.sql';

// The existing versioned ledger migration includes later dynamic RPC rewrites
// for a fully provisioned Supabase project. Stage60 only exercises its original
// append-only table and stock-trigger definitions, unchanged and in order.
// Never silently fall back to a handwritten substitute if the source changes.
export function extractOriginalInventoryLedgerTriggers(sql) {
  const marker = '-- Add trustworthy reason/order context to the existing stock RPCs without';
  if (typeof sql !== 'string' || sql.split(marker).length !== 2) {
    throw new Error('Stage60: original inventory migration marker is absent or duplicated');
  }
  const prefix = sql.split(marker)[0].trimEnd() + '\n';
  for (const required of [
    'CREATE TABLE IF NOT EXISTS private.inventory_movements',
    'CREATE TRIGGER inventory_movements_append_only',
    'CREATE OR REPLACE FUNCTION private.record_product_inventory_movement()',
    'CREATE TRIGGER products_inventory_movement_after_change',
    'CREATE OR REPLACE FUNCTION private.list_inventory_movements'
  ]) if (!prefix.includes(required)) throw new Error('Stage60: original ledger trigger missing ' + required);
  if (/CREATE OR REPLACE FUNCTION private\.admin_update_order_status/i.test(prefix)) {
    throw new Error('Stage60: unexpected status RPC replacement in ledger prefix');
  }
  return prefix;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const prefix = extractOriginalInventoryLedgerTriggers(readFileSync(source, 'utf8'));
  writeFileSync(STAGE60_LEDGER_FIXTURE_PATH, prefix, { mode: 0o600 });
  console.log('Stage60: extracted exact inventory trigger definitions from the versioned migration, no live database access');
}
