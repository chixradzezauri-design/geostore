import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261117170000_move_support_ticket_status_rpcs_to_private.sql', import.meta.url),
  'utf8'
);

const rpcNames = [
  'get_my_support_tickets',
  'get_my_support_tickets_page',
  'get_support_ticket_status',
  'get_support_ticket_unread_counts',
  'mark_support_ticket_messages_read'
];

test('privileged support-ticket implementations live in the private schema', () => {
  for (const name of rpcNames) {
    assert.ok(migration.includes('CREATE OR REPLACE FUNCTION private.' + name));
    assert.ok(migration.includes('REVOKE ALL ON FUNCTION private.' + name));
  }
  assert.equal(migration.split('\n').filter((line) => line.trim().toUpperCase() === 'SECURITY DEFINER').length, 5);
  assert.match(migration, /SET search_path = ''/i);
});

test('public RPC contracts are invoker-only wrappers with unchanged function names', () => {
  for (const name of rpcNames) {
    assert.ok(migration.includes('CREATE OR REPLACE FUNCTION public.' + name));
    assert.ok(migration.includes('SECURITY INVOKER'));
    assert.ok(migration.includes('private.' + name));
  }
  assert.equal(migration.split('\n').filter((line) => line.trim().toUpperCase() === 'SECURITY INVOKER').length, 4);
});

test('anonymous access remains limited to ticket-token status and read-receipt RPCs', () => {
  assert.match(migration, /grant execute on function public\.get_support_ticket_status\(text, text\) to anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.mark_support_ticket_messages_read\(text, text\) to anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.get_my_support_tickets\(integer\) to authenticated/i);
  assert.match(migration, /grant execute on function public\.get_support_ticket_unread_counts\(\) to authenticated/i);
  assert.match(migration, /revoke all on function public\.get_my_support_tickets\(integer\) from public, anon, authenticated/i);
});

test('private implementation grants support the invoker wrappers without public exposure', () => {
  assert.match(migration, /grant execute on function private\.get_support_ticket_status\(text, text\) to anon, authenticated/i);
  assert.match(migration, /grant execute on function private\.mark_support_ticket_messages_read\(text, text\) to anon, authenticated/i);
  assert.match(migration, /grant execute on function private\.get_my_support_tickets\(integer\) to authenticated/i);
  assert.match(migration, /grant execute on function private\.get_support_ticket_unread_counts\(\) to authenticated/i);
  assert.match(migration, /revoke all on function private\.get_my_support_tickets\(integer\) from public, anon, authenticated/i);
});

test('the migration preserves ticket authorization checks and token hashing', () => {
  assert.match(migration, /auth\.uid\(\) is distinct from '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid/i);
  assert.match(migration, /auth\.jwt\(\) -> 'app_metadata' ->> 'role'/i);
  assert.match(migration, /v_is_admin is not true and v_is_customer is not true/i);
  assert.match(migration, /extensions\.digest\(lower\(p_access_token\), 'sha256'\)/i);
  assert.match(migration, /where t\.customer_user_id = v_user_id/i);
});

test('migration is transactional and does not delete or truncate support history', () => {
  assert.match(migration, /^--[\s\S]*?begin;/i);
  assert.match(migration, /commit;\s*$/i);
  assert.doesNotMatch(migration, /drop table|truncate|delete from public\.support_ticket_messages|delete from public\.support_tickets/i);
});

test('support staff permissions remain compatible with active employee roles', () => {
  assert.equal((migration.match(/public\\.has_staff_permission\\('support'\\)/g) || []).length, 3);
  assert.doesNotMatch(migration, /1060de3d-d28a-45f8-9a64-5e0368cffc4b/);
});

test('paginated support history is moved without changing its cursor contract', () => {
  assert.match(migration, /p_before_last_message_at timestamp with time zone DEFAULT NULL/);
  assert.match(migration, /p_before_ticket_id text DEFAULT NULL/);
  assert.match(migration, /activity\\.last_message_at, activity\\.ticket_id/);
  assert.match(migration, /t-[a-f0-9]\\{32\\}/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\\.get_my_support_tickets_page/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\\.get_my_support_tickets_page\\(integer, timestamp with time zone, text\\) TO authenticated/);
});
