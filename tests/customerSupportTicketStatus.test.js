import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261116150000_add_owner_checked_support_ticket_status.sql', import.meta.url),
  'utf8'
);
const helper = await readFile(
  new URL('../src/utils/supportTicketStatus.js', import.meta.url),
  'utf8'
);
const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('customer status RPC returns only the selected ticket metadata', () => {
  assert.match(migration, /RETURNS TABLE\(status text, created_at timestamptz, last_message_at timestamptz\)/i);
  assert.match(migration, /WHERE t\.id = p_ticket_id/i);
  assert.match(migration, /WHERE m\.ticket_ref = p_ticket_id/i);
  assert.doesNotMatch(migration, /returns table\s*\(\s*id\s+text/i);
});

test('customer status RPC explicitly denies missing or NULL authorization', () => {
  assert.match(migration, /v_is_admin IS NOT TRUE AND v_is_customer IS NOT TRUE/i);
  assert.match(migration, /using errcode = '42501'/i);
  assert.match(migration, /v_ticket\.access_token_hash/i);
  assert.match(migration, /extensions\.digest\(lower\(p_access_token\), 'sha256'\)/i);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.get_support_ticket_status\(text, text\) FROM public/i);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.get_support_ticket_status\(text, text\) TO anon, authenticated/i);
});

test('status helper tolerates only a missing additive RPC and validates response shape', () => {
  assert.match(helper, /PGRST202/);
  assert.match(helper, /status === 404/);
  assert.match(helper, /Array\.isArray\(rows\)/);
  assert.match(helper, /p_ticket_id: ticketId, p_access_token: accessToken \|\| null/);
});

test('customer support UI displays localized status and latest update', () => {
  assert.match(app, /fetchSupportTicketStatus\(/);
  assert.match(app, /მიმართვის სტატუსი:/);
  assert.match(app, /ბოლო განახლება:/);
  assert.match(app, /setSupportTicketStatus\(statusSnapshot\)/);
});
