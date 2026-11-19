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

test('private admin reads and writes reject responses from an earlier login session', () => {
  for (const name of ['fetchExpenses', 'fetchActivityLogs', 'logActivity', 'handleUpdateTicketStatus', 'handleSendTicketReply']) {
    const body = readFunction(name);
    assert.match(body, /const requestSessionVersion = adminSessionVersion\\.current/);
    assert.match(body, /!isCurrentAdminSession\\(requestSessionVersion\\)/);
  }
});

test('ending an admin session clears private snapshots before paint and invalidates pending requests', () => {
  assert.match(admin, /import React, \\{[^}]*useLayoutEffect/);
  assert.match(admin, /const adminSessionActiveRef = useRef\\(Boolean\\(adminLoggedIn\\)\\)/);
  assert.match(admin, /const isCurrentAdminSession = \\(version\\) => adminSessionActiveRef\\.current && version === adminSessionVersion\\.current/);
  assert.match(admin, /useLayoutEffect\\(\\(\\) => \\{\\s*adminSessionActiveRef\\.current = Boolean\\(adminLoggedIn\\);\\s*adminSessionVersion\\.current \\+= 1/);
  for (const statement of ['setExpenses([])', 'setServerCustomers([])', 'setSupportTickets([])', 'setSupportTicketThreads({})', 'setLegacyMessages([])', 'setActivityLogs([])', 'setStorefrontVersions([])', 'setInventoryMovementRows([])', 'setReplenishmentSettings([])', 'setSelectedOrderForModal(null)']) {
    assert.ok(admin.includes(statement), `Expected logout cleanup: ${statement}`);
  }
  assert.match(admin, /supportThreadFetchInFlight\\.current\\.clear\\(\\)/);
  assert.match(admin, /adminSessionVersion\\.current \\+= 1/);
});

test('unsupported direct support-ticket deletion is not exposed in the admin UI', () => {
  assert.doesNotMatch(admin, /handleDeleteTicket/);
  assert.doesNotMatch(admin, /rest\\/v1\\/support_tickets[^\\n]*method:\\s*'DELETE'/);
});
