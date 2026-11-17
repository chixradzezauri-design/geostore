import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('admin marks customer messages as read only for the open visible ticket', () => {
  assert.match(admin, /mark_support_ticket_messages_read/);
  assert.match(admin, /String\(selectedSupportTicketId \|\| ''\) === normalizedTicketId/);
  assert.match(admin, /document\.visibilityState === 'visible'/);
  assert.match(admin, /p_ticket_id: normalizedTicketId, p_access_token: null/);
});

test('admin read receipt failure does not interrupt the loaded conversation', () => {
  assert.match(admin, /setSupportTicketThreads\(prev => \(\{ \.\.\.prev, \[normalizedTicketId\]: uniqueRows \}\)\);[\s\S]{0,1500}catch \(readError\)[\s\S]{0,180}console\.warn\('GEOSTORE admin support read receipt failed:'/);
});
