import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261117170000_move_support_ticket_status_rpcs_to_private.sql', import.meta.url),
  'utf8'
);

const rpcNames = [
  'get_my_support_tickets',
  'get_support_ticket_status',
  'get_support_ticket_unread_counts',
  'mark_support_ticket_messages_read'
];

test('privileged support-ticket implementations live in the private schema', () => {
  for (const name of rpcNames) {
    const pattern = new RegExp(
      `create or replace function private\\.${name}\\([\\s\\S]*?security definer[\\s\\S]*?set search_path = ''`,
      'i'
    );
    assert.match(migration, pattern, `${name} must remain a private SECURITY DEFINER implementation`);
  }
});

test('public RPC contracts are invoker-only wrappers with unchanged function names', () => {
  for (const name of rpcNames) {
    const pattern = new RegExp(
      `create or replace function public\\.${name}\\([\\s\\S]*?security invoker[\\s\\S]*?select \\*? ?from private\\.${name}`,
      'i'
    );
    assert.match(migration, pattern, `${name} must expose only a SECURITY INVOKER wrapper`);
  }
});

test('anonymous access remains limited to ticket-token status and read-receipt RPCs', () => {
  assert.match(migration, /grant execute on function public\\.get_support_ticket_status\\(text, text\\) to anon, authenticated/i);
  assert.match(migration, /grant execute on function public\\.mark_support_ticket_messages_read\\(text, text\\) to anon, authenticated/i);
  assert.match(migration, /grant execute on function public\\.get_my_support_tickets\\(integer\\) to authenticated/i);
  assert.match(migration, /grant execute on function public\\.get_support_ticket_unread_counts\\(\\) to authenticated/i);
  assert.match(migration, /revoke all on function public\\.get_my_support_tickets\\(integer\\) from public, anon, authenticated/i);
});

test('the migration preserves ticket authorization checks and token hashing', () => {
  assert.match(migration, /auth\\.uid\\(\\) is distinct from '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid/i);
  assert.match(migration, /auth\\.jwt\\(\\) -> 'app_metadata' ->> 'role'/i);
  assert.match(migration, /v_is_admin is not true and v_is_customer is not true/i);
  assert.match(migration, /extensions\\.digest\\(lower\\(p_access_token\\), 'sha256'\\)/i);
  assert.match(migration, /where t\\.customer_user_id = v_user_id/i);
});

test('migration is transactional and does not delete or truncate support history', () => {
  assert.match(migration, /^--[\\s\\S]*?begin;/i);
  assert.match(migration, /commit;\\s*$/i);
  assert.doesNotMatch(migration, /drop table|truncate|delete from public\\.support_ticket_messages|delete from public\\.support_tickets/i);
});
