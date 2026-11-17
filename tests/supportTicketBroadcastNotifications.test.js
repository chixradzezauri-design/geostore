import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const customerApp = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const adminApp = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('customer support conversation keeps its 15-second recovery refresh without Broadcast dependency', () => {
  assert.match(customerApp, /setInterval\(\(\) => void refreshSupportThread\(\),\s*15000\)/);
  assert.match(customerApp, /addEventListener\('visibilitychange', refreshWhenVisible\)/);
  assert.doesNotMatch(customerApp, /geostore-support-ticket-|support_message_changed/);
});

test('admin support inbox keeps protected Postgres change refresh and polling fallback', () => {
  assert.match(adminApp, /\.on\('postgres_changes', \{ event: '\*', schema: 'public', table: 'support_tickets' \}/);
  assert.match(adminApp, /setInterval\(refreshAdminSupport,\s*15000\)/);
  assert.doesNotMatch(adminApp, /support_message_changed/);
});
