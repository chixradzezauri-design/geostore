import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');

test('customer support view marks administrator messages as read using ticket access token', () => {
  assert.match(app, /const markCustomerSupportMessagesRead = async \(ticketId, accessToken\)/);
  assert.match(app, /rpc\/mark_support_ticket_messages_read/);
  assert.match(app, /p_ticket_id: ticketId, p_access_token: accessToken/);
  assert.match(app, /await markCustomerSupportMessagesRead\(ticketId, accessToken\)/);
});

test('read receipt failure does not interrupt customer support conversation loading', () => {
  assert.match(app, /setSupportThreadMessages\(uniqueRows\);[\s\S]{0,350}await markCustomerSupportMessagesRead\(ticketId, accessToken\)/);
  assert.match(app, /Support read receipt update failed/);
  assert.match(app, /response\.status === 404[\s\S]*PGRST202/);
});

test('customer read receipt is refreshed only from the visible, active support thread effect', () => {
  assert.match(app, /if \(!supportOpen \|\| !supportThreadLoaded \|\| supportThreadSending\) return undefined/);
  assert.match(app, /if \(!active \|\| document\.visibilityState !== 'visible'\) return/);
});
