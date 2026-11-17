import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fetchMySupportTickets, mergeSupportTicketPages } from '../src/utils/supportTicketHistory.js';

const migration = await readFile(new URL('../supabase/migrations/20261116170000_customer_support_ticket_history.sql', import.meta.url), 'utf8');
const paginationMigration = await readFile(new URL('../supabase/migrations/20261117084443_customer_support_ticket_history_pagination.sql', import.meta.url), 'utf8');
const threadMigration = await readFile(new URL('../supabase/migrations/20261116071600_harden_support_ticket_authorization_and_admin_reply_status.sql', import.meta.url), 'utf8');
const helper = await readFile(new URL('../src/utils/supportTicketHistory.js', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('legacy history RPC remains authenticated and filters only the authenticated owner UUID', () => {
  assert.match(migration, /v_user_id uuid := auth\.uid\(\)/i);
  assert.match(migration, /if v_user_id is null then/i);
  assert.match(migration, /where t\.customer_user_id = v_user_id/i);
  assert.match(migration, /grant execute on function public\.get_my_support_tickets\(integer\) to authenticated/i);
  assert.match(migration, /from public, anon/i);
});

test('new history page RPC keeps owner scoping and a bounded deterministic cursor', () => {
  assert.match(paginationMigration, /v_user_id uuid := auth\.uid\(\)/i);
  assert.match(paginationMigration, /where t\.customer_user_id = v_user_id/i);
  assert.match(paginationMigration, /least\(greatest\(coalesce\(p_limit, 50\), 1\), 50\)/i);
  assert.match(paginationMigration, /\(activity\.last_message_at, activity\.ticket_id\)\s*<\s*\(p_before_last_message_at, p_before_ticket_id\)/i);
  assert.match(paginationMigration, /order by activity\.last_message_at desc, activity\.ticket_id desc/i);
  assert.match(paginationMigration, /from public, anon/i);
  assert.match(paginationMigration, /to authenticated/i);
  assert.match(paginationMigration, /p_before_last_message_at is null\) <> \(p_before_ticket_id is null/i);
});

test('per-ticket conversation RPC returns the full authorized thread without a row limit', () => {
  const functionStart = threadMigration.indexOf('CREATE OR REPLACE FUNCTION private.get_support_ticket_messages');
  const functionEnd = threadMigration.indexOf('$function$;', functionStart);
  assert.ok(functionStart >= 0 && functionEnd > functionStart);
  const definition = threadMigration.slice(functionStart, functionEnd);
  assert.match(definition, /v_is_customer IS NOT TRUE/i);
  assert.match(definition, /v_is_admin IS NOT TRUE/i);
  assert.match(definition, /where m\.ticket_ref = p_ticket_id/i);
  assert.match(definition, /order by m\.created_at, m\.id/i);
  assert.doesNotMatch(definition, /\blimit\s+\d+/i);
});

test('history RPC returns minimal ticket metadata and retains customer read receipts', () => {
  assert.match(migration, /ticket_id text, subject text, status text, created_at timestamptz, last_message_at timestamptz, unread_count bigint/i);
  assert.match(migration, /add column if not exists customer_read_at timestamptz/i);
  assert.doesNotMatch(paginationMigration, /returns table\s*\([^)]*message text/is);
});

test('client requests cursor pages and validates ticket identifiers and timestamps', async () => {
  assert.match(helper, /get_my_support_tickets_page/);
  assert.match(helper, /PGRST202/);
  assert.match(helper, /return null/);
  assert.match(helper, /Array\.isArray\(rows\)/);
  assert.match(helper, /\^t-\[a-f0-9\]\{32\}\$/i);

  const originalFetch = globalThis.fetch;
  let captured = null;
  const ticketId = `t-${'a'.repeat(32)}`;
  globalThis.fetch = async (url, options) => {
    captured = { url, options };
    return new Response(JSON.stringify([{
      ticket_id: ticketId,
      subject: 'Order question',
      status: 'ღია',
      created_at: '2026-11-17T10:00:00.000Z',
      last_message_at: '2026-11-17T10:05:00.000Z',
      unread_count: 1
    }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const page = await fetchMySupportTickets({
      supabaseUrl: 'https://example.supabase.co',
      headers: { Authorization: 'Bearer test' },
      cursor: { last_message_at: '2026-11-16T10:00:00.000Z', ticket_id: `t-${'b'.repeat(32)}` }
    });
    assert.equal(captured.url, 'https://example.supabase.co/rest/v1/rpc/get_my_support_tickets_page');
    assert.deepEqual(JSON.parse(captured.options.body), {
      p_limit: 50,
      p_before_last_message_at: '2026-11-16T10:00:00.000Z',
      p_before_ticket_id: `t-${'b'.repeat(32)}`
    });
    assert.equal(page.rows.length, 1);
    assert.equal(page.nextCursor, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('client falls back to the existing first-page RPC until pagination migration is installed', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  const ticketId = `t-${'c'.repeat(32)}`;
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (String(url).endsWith('/get_my_support_tickets_page')) {
      return new Response('{"code":"PGRST202","message":"function not found"}', { status: 404 });
    }
    return new Response(JSON.stringify([{
      ticket_id: ticketId,
      subject: 'Legacy history',
      status: 'ღია',
      created_at: '2026-11-15T10:00:00.000Z',
      last_message_at: '2026-11-15T10:00:00.000Z',
      unread_count: 0
    }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const page = await fetchMySupportTickets({
      supabaseUrl: 'https://example.supabase.co',
      headers: { Authorization: 'Bearer test' }
    });
    assert.equal(calls.length, 2);
    assert.match(calls[1].url, /get_my_support_tickets$/);
    assert.equal(page.rows[0].ticket_id, ticketId);
    assert.equal(page.nextCursor, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('support history page merging deduplicates ticket IDs and keeps latest metadata', () => {
  const idA = `t-${'a'.repeat(32)}`;
  const idB = `t-${'b'.repeat(32)}`;
  const merged = mergeSupportTicketPages(
    [{ ticket_id: idA, last_message_at: '2026-11-16T10:00:00.000Z', unread_count: 0 }],
    [
      { ticket_id: idA, last_message_at: '2026-11-17T10:00:00.000Z', unread_count: 1 },
      { ticket_id: idB, last_message_at: '2026-11-15T10:00:00.000Z', unread_count: 0 }
    ]
  );
  assert.equal(merged.length, 2);
  assert.equal(merged[0].ticket_id, idA);
  assert.equal(merged[0].unread_count, 1);
  assert.equal(merged[1].ticket_id, idB);
});

test('authenticated account history opens owner-linked tickets and retains guest recovery', () => {
  assert.match(app, /currentUser\?\.id && \(/);
  assert.match(app, /ჩემი მხარდაჭერის მიმართვები/);
  assert.match(app, /Continue an existing conversation/);
  assert.match(app, /p_access_token: null/);
  assert.match(app, /required=\{!currentUser\?\.id\}/);
  assert.match(app, /Load more requests/);
  assert.match(app, /მეტის ჩატვირთვა/);
  assert.match(app, /mergeSupportTicketPages/);
  assert.match(app, /supportHistoryOwnerRef\.current !== ownerId/);
  assert.match(app, /supportHistoryOwnerRef\.current === requestOwnerId/);
});
