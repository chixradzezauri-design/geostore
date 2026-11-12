import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPaths = [
  '../supabase/migrations/20261110153000_support_ticket_read_receipts.sql',
  '../supabase/migrations/20261110154000_fix_support_admin_reply_status.sql',
  '../supabase/migrations/20261110155000_support_ticket_attachments.sql',
  '../supabase/migrations/20261112160000_add_owner_checked_support_ticket_status.sql',
  '../supabase/migrations/20261112170000_add_authenticated_customer_support_ticket_list.sql'
];

const migrations = await Promise.all(
  migrationPaths.map((path) => readFile(new URL(path, import.meta.url), 'utf8'))
);

const functionBlocks = (sql) => (
  [...sql.matchAll(/CREATE OR REPLACE FUNCTION\s+([\w.]+)\s*\([\s\S]*?AS \$function\$[\s\S]*?\$function\$;/gi)]
    .map((match) => ({ name: match[1], sql: match[0] }))
);

test('support-ticket SECURITY DEFINER customer RPCs reject NULL authorization results', () => {
  const protectedFunctions = migrations.flatMap(functionBlocks)
    .filter(({ sql }) => /SECURITY DEFINER/i.test(sql) && /v_is_customer/i.test(sql));

  assert.equal(protectedFunctions.length, 7);
  for (const fn of protectedFunctions) {
    assert.match(
      fn.sql,
      /IF\s+v_is_admin\s+IS\s+NOT\s+TRUE\s+AND\s+v_is_customer\s+IS\s+NOT\s+TRUE\s+THEN/i,
      `${fn.name} must explicitly deny NULL admin/customer authorization values`
    );
  }
});

test('support-ticket migrations contain no NULL-permissive authorization guard', () => {
  for (const sql of migrations) {
    assert.doesNotMatch(sql, /IF\s+NOT\s*\(\s*v_is_admin\s+OR\s+v_is_customer\s*\)/i);
  }
});

test('read receipts update only the opposite party messages after strict ticket ownership verification', () => {
  const receiptSql = migrations[0];
  assert.match(receiptSql, /CREATE OR REPLACE FUNCTION public\.mark_support_ticket_messages_read\(/i);
  assert.match(receiptSql, /IF v_is_admin IS NOT TRUE AND v_is_customer IS NOT TRUE THEN/i);
  assert.match(receiptSql, /WHERE ticket_ref = p_ticket_id\s+AND sender_role = 'customer'\s+AND admin_read_at IS NULL/i);
  assert.match(receiptSql, /WHERE ticket_ref = p_ticket_id\s+AND sender_role = 'admin'\s+AND customer_read_at IS NULL/i);
  assert.match(receiptSql, /GRANT EXECUTE ON FUNCTION public\.mark_support_ticket_messages_read\(text, text\) TO anon, authenticated/i);
});

test('admin-only unread counts require both the fixed admin UID and trusted app metadata role', () => {
  assert.match(
    migrations[0],
    /IF\s+auth\.uid\(\)\s+IS\s+DISTINCT\s+FROM\s+'1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid\s+OR\s+coalesce\(auth\.jwt\(\)\s*->\s*'app_metadata'\s*->>\s*'role',\s*''\)\s*<>\s*'admin'\s+then/i
  );
});

test('customer ticket status lookup is owner-checked and does not enumerate tickets', () => {
  const statusSql = migrations[3];
  assert.match(statusSql, /CREATE OR REPLACE FUNCTION public\.get_support_ticket_status\(/i);
  assert.match(statusSql, /RETURNS TABLE\(status text, created_at timestamptz, last_message_at timestamptz\)/i);
  assert.match(statusSql, /IF\s+v_is_admin\s+IS\s+NOT\s+TRUE\s+AND\s+v_is_customer\s+IS\s+NOT\s+TRUE\s+THEN/i);
  assert.match(statusSql, /WHERE m\.ticket_ref = p_ticket_id/i);
  assert.doesNotMatch(statusSql, /returns table\s*\(\s*id\s+text/i);
});

test('customer support list is restricted to the authenticated UUID and minimal metadata', () => {
  const listSql = migrations[4];
  assert.match(listSql, /CREATE OR REPLACE FUNCTION public\.get_my_support_tickets\(/i);
  assert.match(listSql, /WHERE t\.customer_user_id = v_user_id/i);
  assert.match(listSql, /m\.sender_role = 'admin' AND m\.customer_read_at IS NULL/i);
  assert.match(listSql, /unread_count bigint/i);
  assert.match(listSql, /IF v_user_id IS NULL THEN/i);
  assert.match(listSql, /GRANT EXECUTE ON FUNCTION public\.get_my_support_tickets\(integer\) TO authenticated/i);
  assert.match(listSql, /REVOKE ALL ON FUNCTION public\.get_my_support_tickets\(integer\) FROM public, anon/i);
  assert.doesNotMatch(listSql, /v_ticket\.email|auth\.jwt\(\).*email/i);
});

test('legacy support RPCs are redefined with the hardened access guard', () => {
  const replySql = migrations[1];
  assert.match(replySql, /CREATE OR REPLACE FUNCTION private\.get_support_ticket_messages\(/i);
  assert.match(replySql, /CREATE OR REPLACE FUNCTION private\.add_support_ticket_message\(/i);
  assert.match(replySql, /status = 'მუშავდება'/);
});

test('legacy chat history is read-only in the admin UI and direct mutation is revoked', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/20261110151000_prevent_legacy_chat_message_mutation.sql', import.meta.url),
    'utf8'
  );
  const adminUi = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

  assert.match(migration, /drop policy if exists "Admin can delete chat messages"/i);
  assert.match(migration, /drop policy if exists "Admin can update chat messages"/i);
  assert.match(migration, /revoke update, delete on table public\.messages from anon, authenticated/i);
  assert.match(adminUi, /fetchAllAdminSupportRows\(\s*'messages\?select=/);
  assert.doesNotMatch(adminUi, /\.from\(['"]messages['"]\)\s*\.delete\(/);
  assert.doesNotMatch(adminUi, /\.from\(['"]messages['"]\)\s*\.update\(/);
});

test('support ticket deletion is disabled without removing status updates or reply workflow', async () => {
  const migration = await readFile(
    new URL('../supabase/migrations/20261110152001_prevent_support_ticket_deletion.sql', import.meta.url),
    'utf8'
  );
  const adminUi = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

  assert.match(migration, /drop policy if exists "Admin can delete support tickets"/i);
  assert.match(migration, /revoke delete on table public\.support_tickets from anon, authenticated/i);
  assert.match(adminUi, /const handleUpdateTicketStatus = async/);
  assert.match(adminUi, /method:\s*'PATCH'/);
  assert.match(adminUi, /status:\s*newStatus/);
});
