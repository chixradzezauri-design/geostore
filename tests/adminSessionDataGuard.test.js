import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

function readFunction(name) {
  const start = admin.indexOf(`const ${name} = async`);
  assert.notEqual(start, -1, `${name} must exist`);
  const end = admin.indexOf('\n  };', start);
  assert.notEqual(end, -1, `${name} must have a complete function body`);
  return admin.slice(start, end);
}

test('private admin reads reject responses from an earlier login session', () => {
  for (const name of ['fetchExpenses', 'fetchTickets', 'fetchSupportTicketThread', 'fetchLegacyMessages', 'fetchActivityLogs']) {
    const body = readFunction(name);
    assert.match(body, /const requestSessionVersion = adminSessionVersion\.current/);
    assert.match(body, /requestSessionVersion !== adminSessionVersion\.current/);
  }
});

test('ending an admin session clears private snapshots and increments the session version', () => {
  assert.match(admin, /adminSessionVersion\.current \+= 1/);
  for (const statement of [
    'setExpenses([])',
    'setSupportTickets([])',
    'setSupportTicketThreads({})',
    'setLegacyMessages([])',
    'setActivityLogs([])',
    'setStorefrontVersions([])',
    'setSelectedOrderForModal(null)'
  ]) assert.ok(admin.includes(statement), `Expected logout cleanup: ${statement}`);
});

test('support reply history and realtime refresh remain in place', () => {
  assert.match(admin, /add_support_ticket_message_idempotent/);
  assert.match(admin, /geostore-admin-support-ticket-messages/);
  assert.match(admin, /supportThreadRefreshPending\.current/);
});
