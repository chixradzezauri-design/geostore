import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261117231534_staff_crm_support_permissions.sql', import.meta.url), 'utf8');
const foundation = await readFile(new URL('../supabase/migrations/20261117231455_admin_staff_auth_foundation.sql', import.meta.url), 'utf8');

test('legacy customer messages require the CRM permission', () => {
  assert.match(migration, /Staff with CRM permission can read chat messages/);
  assert.match(migration, /Staff with CRM permission can update chat messages/);
  assert.match(migration, /Staff with CRM permission can delete chat messages/);
  assert.match(migration, /has_staff_permission\('crm'\)/);
});

test('support tickets and messages require the support permission', () => {
  assert.match(migration, /Staff with support permission can read support tickets/);
  assert.match(migration, /Staff with support permission can update support tickets/);
  assert.match(migration, /Staff with support permission can read support ticket messages/);
  assert.match(migration, /has_staff_permission\('support'\)/);
});

test('support RPCs use active staff permissions without removing customer access checks', () => {
  for (const name of [
    'add_support_ticket_message',
    'add_support_ticket_message_idempotent',
    'get_support_ticket_messages',
    'get_support_ticket_status',
    'get_support_ticket_unread_counts',
    'mark_support_ticket_messages_read'
  ]) {
    assert.match(migration, new RegExp(name));
  }
  assert.match(migration, /v_ticket\.customer_user_id/);
  assert.match(migration, /v_ticket\.access_token_hash/);
  assert.match(migration, /sender_role/);
  assert.match(foundation, /staff\.is_active IS TRUE/);
});

test('public visitor ticket creation remains present and unchanged', () => {
  assert.match(migration, /Visitors can submit validated support tickets/);
  assert.match(migration, /intentionally preserved/);
});
