import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
const migration = await readFile(
  new URL('../supabase/migrations/20261116132211_persist_flash_sale_expiry_and_auto_restore.sql', import.meta.url),
  'utf8'
);

test('mass flash-sale UI explains that individually priced variants are safely skipped', () => {
  assert.match(admin, /მასობრივი აქცია ვრცელდება მხოლოდ პროდუქტებზე, რომლებსაც ცალკე ვარიანტების ფასები არ აქვთ/);
  assert.match(admin, /ინდივიდუალური ვარიანტების მქონე პროდუქტები უსაფრთხოების მიზნით გამოტოვებულია/);
  assert.match(admin, /მასობრივი ფასდაკლებისთვის შესაფერისი პროდუქტები ვერ მოიძებნა[\s\S]*ინდივიდუალური ვარიანტების მქონე პროდუქტები ამ აქციაში არ შედის/);
});

test('the current database flash-sale RPC keeps variant products out of the base-price update', () => {
  assert.match(migration, /COALESCE\(variants,\s*'\[\]'::jsonb\)\s*=\s*'\[\]'::jsonb/);
  assert.match(migration, /private\.expire_flash_sales/);
  assert.match(migration, /old_price_gel/);
});
