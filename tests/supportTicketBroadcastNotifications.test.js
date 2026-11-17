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
