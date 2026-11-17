import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261117200000_support_ticket_broadcast_notifications.sql', import.meta.url),
  'utf8'
);
const customerApp = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const adminApp = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('guest Broadcast topic is derived from the existing SHA-256 access-token digest', () => {
  assert.match(customerApp, /crypto\.subtle\.digest\(\s*'SHA-256'/);
  assert.match(customerApp, /geostore-support-ticket-\$\{tokenHash\}/);
  assert.match(migration, /'geostore-support-ticket-'\s*\|\|\s*v_access_token_hash/);
  assert.match(migration, /'geostore-support-ticket-'\s*\|\|\s*v_access_token_hash,[\s\S]*?false\s*\)/);
});

test('account-linked customer notifications require a private auth.uid-scoped topic', () => {
  assert.match(customerApp, /geostore-support-user:\$\{currentUser\.id\}/);
  assert.match(customerApp, /config:\s*\{\s*private:\s*isPrivate\s*\}/);
  assert.match(migration, /'geostore-support-user:'\s*\|\|\s*v_customer_user_id::text,[\s\S]*?true\s*\)/);
  assert.match(migration, /\(select realtime\.topic\(\)\)\s*=\s*'geostore-support-user:'\s*\|\|\s*\(select auth\.uid\(\)\)::text/);
});

test('admin notifications are private and restricted to the primary admin identity', () => {
  assert.match(adminApp, /channel\('geostore-support-admin',\s*\{\s*config:\s*\{\s*private:\s*true\s*\}\s*\}\)/);
  assert.match(migration, /\(select realtime\.topic\(\)\)\s*=\s*'geostore-support-admin'/);
  assert.match(migration, /app_metadata.*role.*admin/);
  assert.match(migration, /auth\.uid\(\).*1060de3d-d28a-45f8-9a64-5e0368cffc4b/);
});

test('broadcast payloads contain only a ticket reference, never conversation content or credentials', () => {
  assert.match(migration, /jsonb_build_object\('ticket_id',\s*new\.ticket_ref\)/i);
  const payloads = [...migration.matchAll(/jsonb_build_object\(([^)]*)\)/gi)].map(match => match[1]);
  assert.equal(payloads.length, 3, 'each audience receives one notification payload');
  for (const payload of payloads) {
    assert.match(payload, /ticket_id/);
    assert.doesNotMatch(payload, /message|access_token|email|sender_name/i);
  }
  assert.match(customerApp, /get_support_ticket_messages/);
  assert.match(adminApp, /get_support_ticket_messages/);
});

test('15-second recovery polling and ticket status refresh remain in place', () => {
  assert.match(customerApp, /setInterval\(\(\) => void refreshSupportThread\(\),\s*15000\)/);
  assert.match(adminApp, /setInterval\(refreshAdminSupport,\s*15000\)/);
  assert.match(adminApp, /table:\s*'support_tickets'/);
});

test('Realtime notifications are server-triggered only; clients receive no Broadcast write policy', () => {
  assert.match(migration, /after insert on public\.support_ticket_messages/i);
  assert.match(migration, /execute function private\.broadcast_support_ticket_message\(\)/i);
  assert.doesNotMatch(migration, /for insert\s+to\s+(?:anon|authenticated)/i);
});


test('admin support channel ignores callbacks after cleanup and fences stale session reads', () => {
  assert.match(adminApp, /const supportThreadSessionRef = useRef\(0\)/);
  assert.match(adminApp, /fetchSupportTicketThread = async \(ticketId, sessionId = supportThreadSessionRef\.current\)/);
  assert.match(adminApp, /sessionId !== supportThreadSessionRef\.current/);
  assert.match(adminApp, /supportThreadSessionRef\.current \+= 1/);
  assert.match(adminApp, /let active = true;[\s\S]*?channel\('geostore-support-admin'[\s\S]*?if \(!active\) return/);
  assert.match(adminApp, /active = false;[\s\S]*?removeChannel\(channel\)/);
});

test('customer support subscriptions fence stale account and guest-ticket callbacks', () => {
  const customerEffect = customerApp.slice(
    customerApp.indexOf("if (!supportOpen || !supportThreadLoaded || supportThreadSending)"),
    customerApp.indexOf("}, [supportOpen, supportThreadLoaded, supportThreadSending, supportLookupTicketId, supportLookupAccessToken, currentUser?.id]);")
  );
  assert.match(customerEffect, /let active = true/);
  assert.match(customerEffect, /if \(!active \|\| !topic\) return/);
  assert.match(customerEffect, /if \(active\) \{[\s\S]*?setSupportThreadMessages/);
  assert.match(customerEffect, /active = false/);
  assert.match(customerApp, /supportLookupAccessToken, currentUser\?\.id/);
});


test('admin support replies cannot mutate a newer login session', () => {
  const sessionEffect = adminApp.slice(
    adminApp.indexOf('supportThreadSessionRef.current += 1'),
    adminApp.indexOf('}, [adminLoggedIn]);', adminApp.indexOf('supportThreadSessionRef.current += 1')) + '}, [adminLoggedIn]);'.length
  );
  assert.match(sessionEffect, /supportReplyInFlight\.current\.clear\(\)/);
  assert.match(sessionEffect, /setReplySending\(\{\}\)/);
  assert.doesNotMatch(sessionEffect, /supportReplyRequestIds\.current\s*=|supportReplyRequestIds\.current\.clear/);

  const replyHandler = adminApp.slice(
    adminApp.indexOf('const handleSendTicketReply = async'),
    adminApp.indexOf('const handleDeleteTicket = async')
  );
  assert.match(replyHandler, /const replySessionId = supportThreadSessionRef\.current/);
  assert.match(replyHandler, /requestId = supportReplyRequestIds\.current\[normalizedTicketId\]\.id/);
  assert.match(replyHandler, /supportReplyRequestIds\.current\[normalizedTicketId\]\?\.id === requestId/);
  assert.match(replyHandler, /if \(replySessionId !== supportThreadSessionRef\.current\) return/);
  assert.match(replyHandler, /fetchTickets\(replySessionId\)/);
  assert.match(replyHandler, /fetchSupportTicketThread\(normalizedTicketId, replySessionId\)/);
  assert.match(replyHandler, /if \(replySessionId === supportThreadSessionRef\.current\) \{[\s\S]*?supportReplyInFlight\.current\.delete/);
});

test('session-scoped ticket refresh ignores results from a previous admin login', () => {
  assert.match(adminApp, /const fetchTickets = async \(sessionId = null\)/);
  assert.match(adminApp, /if \(sessionId !== null && sessionId !== supportThreadSessionRef\.current\) return;[\s\S]*?setSupportTickets\(/);
  assert.match(adminApp, /if \(sessionId === null \|\| sessionId === supportThreadSessionRef\.current\) \{[\s\S]*?setSupportTicketsError/);
});


test('customer support reply responses cannot overwrite a newly selected ticket', () => {
  assert.match(customerApp, /const supportThreadSessionRef = useRef\(0\)/);
  assert.match(customerApp, /const beginSupportThreadSession = \(\) => \{[\s\S]*?supportThreadSessionRef\.current \+= 1;[\s\S]*?setSupportThreadSending\(false\);[\s\S]*?setSupportThreadLoading\(false\)/);
  assert.match(customerApp, /\}, \[currentUser\?\.id\]\);/);

  const replyHandler = customerApp.slice(
    customerApp.indexOf('const replySessionId = supportThreadSessionRef.current'),
    customerApp.indexOf('className="space-y-2"', customerApp.indexOf('const replySessionId = supportThreadSessionRef.current'))
  );
  assert.match(replyHandler, /supportReplyRequestRef\.current\.get\(ticketId\)/);
  assert.match(replyHandler, /supportReplyRequestRef\.current\.delete\(ticketId\)/);
  assert.match(replyHandler, /if \(replySessionId !== supportThreadSessionRef\.current\) return/);
  assert.match(replyHandler, /p_ticket_id: ticketId,[\s\S]*?p_access_token: accessToken/);
  assert.match(replyHandler, /if \(replySessionId === supportThreadSessionRef\.current\) \{[\s\S]*?supportReplyInFlightRef\.current = false/);
});

test('customer support ticket lookup and account-history open discard stale session results', () => {
  assert.match(customerApp, /const sessionId = beginSupportThreadSession\(\);[\s\S]*?setSupportLookupTicketId\(ticket\.ticket_id\)/);
  assert.match(customerApp, /if \(sessionId !== supportThreadSessionRef\.current\) return;[\s\S]*?setSupportThreadMessages\(rows\)/);
  assert.match(customerApp, /if \(sessionId === supportThreadSessionRef\.current\) setSupportThreadLoading\(false\)/);
  assert.match(customerApp, /onClick=\{\(\) => \{ beginSupportThreadSession\(\); setSupportOpen\(false\); \}\}/);
});


test('admin support ticket list refresh is fenced to the active admin session', () => {
  const start = adminApp.indexOf('const fetchTickets = async (sessionId = supportThreadSessionRef.current)');
  const end = adminApp.indexOf('  const fetchSupportTicketThread =', start);
  const fetchTickets = start >= 0 && end > start ? adminApp.slice(start, end) : '';
  assert.ok(fetchTickets, 'ticket list refresh function exists');
  assert.match(adminApp, /const supportTicketListRequestRef = useRef\\(0\\)/);
  assert.match(fetchTickets, /if \\(!adminLoggedIn \\|\\| sessionId !== supportThreadSessionRef\\.current\\) return/);
  assert.match(fetchTickets, /const requestId = \\+\\+supportTicketListRequestRef\\.current/);
  assert.match(fetchTickets, /requestId === supportTicketListRequestRef\\.current/);
  assert.match(fetchTickets, /sessionId === supportThreadSessionRef\\.current/);
});

test('stale admin ticket list requests cannot publish results or errors', () => {
  const start = adminApp.indexOf('const fetchTickets = async (sessionId = supportThreadSessionRef.current)');
  const end = adminApp.indexOf('  const fetchSupportTicketThread =', start);
  const fetchTickets = start >= 0 && end > start ? adminApp.slice(start, end) : '';
  assert.ok(fetchTickets);
  assert.match(fetchTickets, /await getSupabaseHeaders\\(\\);\\s*if \\(!isCurrentRequest\\(\\)\\) return/);
  assert.match(fetchTickets, /await res\\.json\\(\\);\\s*if \\(!isCurrentRequest\\(\\)\\) return/);
  assert.match(fetchTickets, /if \\(isCurrentRequest\\(\\)\\) \\{\\s*setSupportTicketsError/);
  assert.match(fetchTickets, /if \\(!isCurrentRequest\\(\\)\\) return;\\s*setSupportTickets\\(/);
});

test('admin login changes invalidate pending ticket list requests without removing pagination', () => {
  assert.match(adminApp, /supportThreadSessionRef\\.current \\+= 1;\\s*supportTicketListRequestRef\\.current \\+= 1;[\\s\\S]*?\\}, \\[adminLoggedIn\\]\\)/);
  assert.match(adminApp, /const pageSize = 1000/);
  assert.match(adminApp, /order=created_at\\.desc,id\\.asc/);
  assert.match(adminApp, /offset < 100000; offset \\+= pageSize/);
});
