import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

// Source SQL has BEGIN/COMMIT wrappers. Execute the exact inner statements
// inside a caller-owned ROLLBACK-only disposable transaction; never rewrite
// the historical migration file or connect to a real Supabase database.
export const STAGE66_LEGACY_CHECKOUT_SQL = '/tmp/stage66_original_checkout_validator_only.sql';
export function extractLegacyCheckoutValidator(sql) {
  if (typeof sql !== 'string') throw new Error('Stage66 requires original SQL text');
  const trimmed = sql.trim();
  const found = /^begin;\s*([\s\S]+)\s*commit;$/i.exec(trimmed);
  if (!found) throw new Error('Stage66 original migration transaction boundaries changed');
  const inner = found[1].trim();
  for (const expected of [
    'create or replace function private.validate_order_checkout_input()',
    'create trigger validate_order_checkout_input_before_insert',
    "if coalesce(new.user_email, 'guest') = 'guest' and",
    "new.customer_email is null",
    "execute function private.validate_order_checkout_input();"
  ]) {
    if (!inner.includes(expected)) throw new Error('Stage66 original validator structure changed: ' + expected);
  }
  if (/(^|\n)\s*(?:begin|commit|rollback)\s*;/i.test(inner)) {
    throw new Error('Stage66 nested top-level transaction statement was found');
  }
  return '-- Source-exact transaction body, Stage66 temporary PG17 rollback fixture only\n' + inner + '\n';
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const source = readFileSync(
    new URL('../supabase/migrations/20261106210000_validate_checkout_input_on_order_insert.sql', import.meta.url),
    'utf8'
  );
  writeFileSync(STAGE66_LEGACY_CHECKOUT_SQL, extractLegacyCheckoutValidator(source), { mode: 0o600 });
  process.stdout.write('Stage66: original checkout validator extracted for rollback-only PG17 suite; no live database access\n');
}
