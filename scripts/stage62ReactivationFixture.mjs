import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const STAGE62_REACTIVATION_FIXTURE_PATH = '/tmp/stage62_original_variant_reactivation.sql';

// Execute the exact version-controlled Stage71 private variant-aware
// reactivation function, and reproduce the Stage92 ledger migration's
// two inserted inventory-context SET statements. This is NOT new Production
// SQL: it constructs a temporary test artifact only.
export function extractOriginalVariantReactivation(sql, ledgerMigration) {
  const startMarker = 'CREATE OR REPLACE FUNCTION private.admin_reactivate_cancelled_order(p_order_id text)';
  const endMarker = ';\nCREATE OR REPLACE FUNCTION private.preserve_product_variant_stock()';
  if (typeof sql !== 'string' || sql.split(startMarker).length !== 2 ||
      sql.split(endMarker).length !== 2) {
    throw new Error('Stage62 original variant reactivation function boundaries changed');
  }
  const start = sql.indexOf(startMarker);
  const end = sql.indexOf(endMarker, start);
  if (end <= start) throw new Error('Stage62 original variant reactivation function order changed');
  const definition = sql.slice(start, end + 1).trim() + '\n';
  const marker = "  perform set_config('geostore.variant_stock_adjustment', 'on', true);";
  if (definition.split(marker).length !== 2) {
    throw new Error('Stage62 original stock-deduction marker changed');
  }
  const ledgerStart = "v_definition := pg_get_functiondef('private.admin_reactivate_cancelled_order(text)'::regprocedure);";
  const ledgerEnd = "v_definition := pg_get_functiondef('private.admin_set_product_variant_stocks(text,jsonb)'::regprocedure);";
  if (typeof ledgerMigration !== 'string' ||
      ledgerMigration.split(ledgerStart).length !== 2 ||
      ledgerMigration.split(ledgerEnd).length !== 2) {
    throw new Error('Stage62 original ledger patch boundaries changed');
  }
  const ledgerPatch = ledgerMigration.split(ledgerStart)[1].split(ledgerEnd)[0];
  for (const expected of [
    "v_old := '  perform set_config(''geostore.variant_stock_adjustment'', ''on'', true);';",
    "perform set_config(''geostore.inventory_reason'', ''order_reactivation'', true);",
    "perform set_config(''geostore.inventory_order_id'', p_order_id, true);",
    'EXECUTE replace(v_definition, v_old, v_new);'
  ]) if (!ledgerPatch.includes(expected)) {
    throw new Error('Stage62 real Stage92 ledger patch changed: ' + expected);
  }
  const replacement = [
    "  perform set_config('geostore.inventory_reason', 'order_reactivation', true);",
    "  perform set_config('geostore.inventory_order_id', p_order_id, true);",
    marker
  ].join('\n');
  return definition.replace(marker,replacement);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const reactivation = readFileSync(
    new URL('../supabase/migrations/20261107170000_integrate_custom_product_variants.sql',import.meta.url),'utf8'
  );
  const ledger = readFileSync(
    new URL('../supabase/migrations/20261117084403_private_inventory_movement_ledger_stage92.sql',import.meta.url),'utf8'
  );
  writeFileSync(STAGE62_REACTIVATION_FIXTURE_PATH,
    extractOriginalVariantReactivation(reactivation,ledger),{mode:0o600});
  console.log('Stage62: extracted original variant reactivation and exact original inventory-context patch, no Production SQL');
}
