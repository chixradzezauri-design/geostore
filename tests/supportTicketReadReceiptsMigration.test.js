import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261116130000_support_ticket_read_receipts.sql', import.meta.url),
  'utf8'
);

test('read receipts are additive and preserve historical unknown state', () => {
  assert.match(migration, /ADD COLUMN IF NOT EXISTS admin_read_at timestamptz/i);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS customer_read_at timestamptz/i);
  assert.match(migration, /admin_read_at is null/i);
  assert.match(migration, /customer_read_at is null/i);
  assert.doesNotMatch(migration, /DROP TABLE|TRUNCATE|DELETE FROM public\.support_ticket_messages/i);
});

test('read receipt RPC explicitly denies NULL authorization for both ticket owners and admins', () => {
  const readFn = migration.split(/create or replace function public\.mark_support_ticket_messages_read/i)[1]?.split(/\$function\$;/i)[0] || '';
  assert.match(readFn, /v_is_admin is not true and v_is_customer is not true/i);
  assert.match(readFn, /using errcode = '42501'/i);
  assert.match(readFn, /coalesce\(p_access_token, ''\) ~ '\^\[A-Fa-f0-9\]\{64\}\$'/i);
  assert.match(readFn, /v_ticket\.access_token_hash/i);
});

test('read receipts only mark messages from the other participant as read', () => {
  const readFn = migration.split(/create or replace function public\.mark_support_ticket_messages_read/i)[1]?.split(/\$function\$;/i)[0] || '';
  assert.match(readFn, /if v_is_admin then[\s\S]*sender_role = 'customer'[\s\S]*admin_read_at is null/i);
  assert.match(readFn, /else[\s\S]*sender_role = 'admin'[\s\S]*customer_read_at is null/i);
});

test('only the authenticated primary admin can enumerate unread ticket counts', () => {
  const countFn = migration.split(/create or replace function public\.get_support_ticket_unread_counts/i)[1]?.split(/\$function\$;/i)[0] || '';
  assert.match(countFn, /auth\.uid\(\) is distinct from '[0-9a-f-]{36}'::uuid/i);
  assert.match(countFn, /app_metadata/);
  assert.match(countFn, /using errcode = '42501'/i);
  assert.match(migration, /revoke all on function public\.get_support_ticket_unread_counts\(\) from public, anon/i);
  assert.match(migration, /grant execute on function public\.get_support_ticket_unread_counts\(\) to authenticated/i);
});

test('read receipt RPC permissions are explicit and migration is transactional', () => {
  assert.match(migration, /^begin;/i);
  assert.match(migration, /revoke all on function public\.mark_support_ticket_messages_read\(text, text\) from public/i);
  assert.match(migration, /grant execute on function public\.mark_support_ticket_messages_read\(text, text\) to anon, authenticated/i);
  assert.match(migration, /commit;\s*$/i);
});
