import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261116071600_harden_support_ticket_authorization_and_admin_reply_status.sql', import.meta.url),
  'utf8'
);

const protectedFunctions = [
  'private.add_support_ticket_message_idempotent',
  'private.get_support_ticket_messages',
  'private.add_support_ticket_message'
];

test('all support ticket SECURITY DEFINER RPCs explicitly reject NULL authorization', () => {
  for (const name of protectedFunctions) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const start = migration.search(new RegExp('CREATE OR REPLACE FUNCTION\\s+' + escaped, 'i'));
    assert.notEqual(start, -1, name + ' must be redefined by the migration');
    const tail = migration.slice(start);
    const end = tail.search(/\\$function\\$;/i);
    assert.notEqual(end, -1, name + ' function body must be complete');
    const body = tail.slice(0, end);
    assert.match(
      body,
      /IF\\s+v_is_admin\\s+IS\\s+NOT\\s+TRUE\\s+AND\\s+v_is_customer\\s+IS\\s+NOT\\s+TRUE\\s+THEN/i,
      name + ' must deny NULL authorization results'
    );
    assert.doesNotMatch(
      body,
      /IF\\s+NOT\\s*\\(\\s*v_is_admin\\s+OR\\s+v_is_customer\\s*\\)/i,
      name + ' must not use a NULL-permissive boolean guard'
    );
  }
});

test('admin replies keep tickets in the in-progress state', () => {
  assert.match(migration, /status\\s*=\\s*'მუშავდება'/);
  assert.doesNotMatch(migration, /status\\s*=\\s*'მოგვარებული'/);
});

test('idempotent reply wrapper remains callable by anon and authenticated roles', () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\\.add_support_ticket_message_idempotent/i);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\\.add_support_ticket_message_idempotent\\(text, text, text, uuid\\) TO anon, authenticated/i);
});
