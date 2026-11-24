import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Never apply this legacy migration to a real database. This helper extracts
// ONLY its original private checkout function into a disposable PG17 ROLLBACK
// transaction, to prove why replay would break newer schema contracts.
export const STAGE67_LEGACY_CHECKOUT_PATH = '/tmp/stage67_original_legacy_variant_checkout.sql';

export function extractLegacyVariantCheckout(sql) {
  if (typeof sql !== 'string') throw new Error('Stage67 historical SQL expected');
  const start = 'CREATE OR REPLACE FUNCTION private.create_order_with_stock(p_order jsonb)';
  const next = 'CREATE OR REPLACE FUNCTION private.admin_update_order_status(p_order_id text, p_new_status text)';
  if (sql.split(start).length !== 2 || sql.split(next).length !== 2) {
    throw new Error('Stage67 legacy checkout boundaries changed');
  }
  const body = sql.slice(sql.indexOf(start), sql.indexOf(next));
  if (!/^\s*CREATE OR REPLACE FUNCTION private\.create_order_with_stock\(p_order jsonb\)/.test(body) ||
      !/\$function\$\s*;\s*$/i.test(body) ||
      /\b(?:CREATE OR REPLACE FUNCTION|DROP FUNCTION|CREATE TRIGGER|DROP TRIGGER)\b/gi.test(body.slice(start.length))) {
    throw new Error('Stage67 source extraction cannot isolate one historical function safely');
  }
  if (!/insert into public\.orders\(id, customer_name, phone, address, user_email, customer_email, items,/i.test(body) ||
      !/perform set_config\('geostore\.variant_stock_adjustment', 'on', true\)/i.test(body) ||
      /geostore\.inventory_reason|geostore\.inventory_order_id|['"]gallery['"],/i.test(body)) {
    throw new Error('Stage67 historical SQL no longer has the verified regression');
  }
  return '-- Exact obsolete checkout function ONLY. PG17 disposable rollback fixture.\n' + body.trim() + '\n';
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const source = readFileSync(
    new URL('../supabase/migrations/20261107170000_integrate_custom_product_variants.sql', import.meta.url), 'utf8'
  );
  writeFileSync(STAGE67_LEGACY_CHECKOUT_PATH, extractLegacyVariantCheckout(source), { mode: 0o600 });
  process.stdout.write('Stage67: extracted source-exact old checkout for disposable ROLLBACK-only PG17 test\n');
}
