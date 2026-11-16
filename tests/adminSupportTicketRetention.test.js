import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
const migration = await readFile(
  new URL('../supabase/migrations/20261116124647_protect_support_tickets_from_direct_deletion.sql', import.meta.url),
  'utf8'
);

test('support-ticket UI does not expose deletion that the database intentionally forbids', () => {
  assert.match(migration, /REVOKE DELETE ON TABLE public\.support_tickets FROM authenticated, anon, PUBLIC/i);
  assert.doesNotMatch(admin, /handleDeleteTicket/);
  assert.doesNotMatch(admin, /handleDeleteTicket\(t\.id\)/);
});

test('support tickets remain manageable through statuses and full message history', () => {
  assert.match(admin, /handleUpdateTicketStatus\(t\.id, 'ღია'\)/);
  assert.match(admin, /handleUpdateTicketStatus\(t\.id, 'მუშავდება'\)/);
  assert.match(admin, /handleUpdateTicketStatus\(t\.id, 'მოგვარებული'\)/);
  assert.match(admin, /fetchSupportTicketThread\(ticketId\)/);
  assert.match(admin, /supportTicketThreads\[String\(t\.id\)\]/);
  assert.match(admin, /handleSendTicketReply\(t\.id\)/);
});
