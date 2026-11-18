import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261118180000_move_all_support_ticket_history_rpcs_to_private.sql', import.meta.url), 'utf8');
const names = ['get_my_support_tickets', 'get_my_support_tickets_page', 'get_support_ticket_status', 'get_support_ticket_unread_counts', 'mark_support_ticket_messages_read'];

test('all five privileged support RPCs move into private', () => {
  for (const name of names) {
    assert.ok(migration.includes('CREATE OR REPLACE FUNCTION private.' + name));
    assert.ok(migration.includes('REVOKE ALL ON FUNCTION private.' + name));
  }
  assert.equal(migration.split('\n').filter(x => x.trim().toUpperCase() === 'SECURITY DEFINER').length, 5);
  assert.match(migration, /SET search_path = ''/i);
});

test('all five public RPCs remain invoker wrappers with their established names', () => {
  for (const name of names) {
    assert.ok(migration.includes('CREATE OR REPLACE FUNCTION public.' + name));
    assert.ok(migration.includes('SECURITY INVOKER'));
    assert.ok(migration.includes('private.' + name));
  }
  assert.equal(migration.split('\n').filter(x => x.trim().toUpperCase() === 'SECURITY INVOKER').length, 5);
});

test('anon execution is limited to ticket-token status and read receipts', () => {
  assert.match(migration, /grant execute on function public\.get_support_ticket_status\(text, text\) to anon, authenticated/i);
  assert.match(migration, /grant execute on function public\.mark_support_ticket_messages_read\(text, text\) to anon, authenticated/i);
  for (const name of ['get_my_support_tickets', 'get_my_support_tickets_page', 'get_support_ticket_unread_counts']) {
    assert.match(migration, new RegExp('grant execute on function public\\.' + name + '.*to authenticated', 'i'));
    assert.doesNotMatch(migration, new RegExp('grant execute on function public\\.' + name + '.*to anon', 'i'));
  }
});

test('private execution grants mirror the public wrapper access', () => {
  for (const name of ['get_my_support_tickets', 'get_my_support_tickets_page', 'get_support_ticket_unread_counts']) {
    assert.match(migration, new RegExp('grant execute on function private\\.' + name + '.*to authenticated', 'i'));
  }
  assert.match(migration, /grant execute on function private\.get_support_ticket_status\(text, text\) to anon, authenticated/i);
  assert.match(migration, /grant execute on function private\.mark_support_ticket_messages_read\(text, text\) to anon, authenticated/i);
});

test('active support staff authorization is preserved without owner-only UUID restrictions', () => {
  assert.equal((migration.match(/public\.has_staff_permission\('support'\)/g) || []).length, 3);
  assert.doesNotMatch(migration, /1060de3d-d28a-45f8-9a64-5e0368cffc4b/);
});

test('customer ownership, email, access-token hashing and denial checks remain', () => {
  assert.match(migration, /v_ticket\.customer_user_id/);
  assert.match(migration, /lower\(v_ticket\.email\)/);
  assert.match(migration, /extensions\.digest\(lower\(p_access_token\), 'sha256'\)/i);
  assert.match(migration, /v_is_admin is not true and v_is_customer is not true/i);
  assert.match(migration, /where t\.customer_user_id = v_user_id/i);
});

test('paginated customer history retains its cursor and ordering contract', () => {
  assert.match(migration, /p_before_last_message_at timestamp with time zone DEFAULT NULL/i);
  assert.match(migration, /p_before_ticket_id text DEFAULT NULL/i);
  assert.match(migration, /activity\.last_message_at, activity\.ticket_id/);
  assert.match(migration, /t-\[a-f0-9\]\{32\}/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.get_my_support_tickets_page\(integer, timestamp with time zone, text\) TO authenticated/i);
});

test('migration is transactional and never deletes or truncates support history', () => {
  assert.match(migration, /^--[\s\S]*?begin;/i);
  assert.match(migration, /commit;\s*$/i);
  assert.doesNotMatch(migration, /drop table|truncate|delete from public\.support_ticket_messages|delete from public\.support_tickets/i);
});
