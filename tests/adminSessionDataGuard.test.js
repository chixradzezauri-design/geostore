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
  for (const name of ['fetchExpenses', 'fetchActivityLogs', 'logActivity', 'handleUpdateTicketStatus', 'handleSendTicketReply', 'handleUpdateOrderStatus', 'handleConfirmOrderReactivation', 'handleSaveOrderAdminNote']) {
    const body = readFunction(name);
    assert.ok(body.includes('const requestSessionVersion = adminSessionVersion.current'), `${name} captures the active session version`);
    assert.ok(body.includes('!isCurrentAdminSession(requestSessionVersion)'), `${name} rejects stale sessions`);
  }
});

test('ending an admin session clears private snapshots before paint and invalidates pending requests', () => {
  assert.ok(admin.includes('useLayoutEffect'));
  assert.ok(admin.includes('const adminSessionActiveRef = useRef(Boolean(adminLoggedIn))'));
  assert.ok(admin.includes('const isCurrentAdminSession = (version) => adminSessionActiveRef.current && version === adminSessionVersion.current'));
  assert.ok(admin.includes('adminSessionActiveRef.current = Boolean(adminLoggedIn);'));
  assert.ok(admin.includes('adminSessionVersion.current += 1;'));
  for (const statement of ['setExpenses([])', 'setServerCustomers([])', 'setSupportTickets([])', 'setSupportTicketThreads({})', 'setLegacyMessages([])', 'setActivityLogs([])', 'setStorefrontVersions([])', 'setInventoryMovementRows([])', 'setReplenishmentSettings([])', 'setSelectedOrderForModal(null)']) {
    assert.ok(admin.includes(statement), `Expected logout cleanup: ${statement}`);
  }
  assert.ok(admin.includes('supportThreadFetchInFlight.current.clear()'));
  assert.ok(admin.includes('supportThreadRefreshPending.current.clear()'));
});

test('unsupported direct support-ticket deletion is not exposed in the admin UI', () => {
  assert.ok(!admin.includes('handleDeleteTicket'));
});
test('CRM loading indicator is limited to the initial fetch and stays hidden during background refreshes', () => {
  assert.ok(admin.includes('const crmHasLoadedRef = useRef(false)'));
  assert.ok(admin.includes('if (!crmHasLoadedRef.current) setCrmLoading(true)'));
  assert.ok(admin.includes('crmHasLoadedRef.current = true;'));
  assert.ok(admin.includes('if (sessionVersion === crmSessionVersion.current) {'));
  assert.ok(admin.includes('setCrmLoading(false);'));
});
