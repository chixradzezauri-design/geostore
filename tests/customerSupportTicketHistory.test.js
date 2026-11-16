import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261116170000_customer_support_ticket_history.sql', import.meta.url), 'utf8');
const helper = await readFile(new URL('../src/utils/supportTicketHistory.js', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('history RPC requires authentication and filters only the authenticated owner UUID', () => {
  assert.match(migration, /v_user_id uuid := auth\.uid\(\)/i);
  assert.match(migration, /if v_user_id is null then/i);
  assert.match(migration, /where t\.customer_user_id = v_user_id/i);
  assert.match(migration, /grant execute on function public\.get_my_support_tickets\(integer\) to authenticated/i);
  assert.match(migration, /from public, anon/i);
});

test('history RPC returns only minimal ticket metadata and caps results at 50', () => {
  assert.match(migration, /ticket_id text, subject text, status text, created_at timestamptz, last_message_at timestamptz, unread_count bigint/i);
  assert.match(migration, /least\(greatest\(coalesce\(p_limit, 50\), 1\), 50\)/i);
  assert.doesNotMatch(migration, /returns table\s*\([^)]*message text/is);
  assert.match(migration, /add column if not exists customer_read_at timestamptz/i);
});

test('client validates ticket IDs and distinguishes a missing migration', () => {
  assert.match(helper, /PGRST202/);
  assert.match(helper, /return null/);
  assert.match(helper, /Array\.isArray\(rows\)/);
  assert.match(helper, /\^t-\[a-f0-9\]\{32\}\$/i);
});

test('authenticated account history opens owner-linked tickets and keeps guest recovery', () => {
  assert.match(app, /currentUser\?\.id && \(/);
  assert.match(app, /ჩემი მხარდაჭერის მიმართვები/);
  assert.match(app, /Continue an existing conversation/);
  assert.match(app, /p_access_token: null/);
  assert.match(app, /required=!currentUser\?\.id/);
});
