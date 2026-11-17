import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261117100000_admin_staff_auth_foundation.sql', import.meta.url), 'utf8');
const edge = await readFile(new URL('../supabase/functions/manage-admin-staff/index.ts', import.meta.url), 'utf8');

test('staff membership is linked to real Auth users and cannot be read or written from the browser', () => {
  assert.match(migration, /user_id uuid NOT NULL UNIQUE REFERENCES auth\.users\(id\)/i);
  assert.match(migration, /ALTER TABLE public\.admin_staff_members ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /REVOKE ALL ON TABLE public\.admin_staff_members FROM PUBLIC, anon, authenticated/i);
  assert.match(migration, /GRANT ALL ON TABLE public\.admin_staff_members TO service_role/i);
});

test('server-side permission checks use the authenticated user and active database membership', () => {
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /staff\.is_active IS TRUE/);
  assert.match(migration, /staff\.permissions->>p_permission = 'true'/);
  assert.match(migration, /1060de3d-d28a-45f8-9a64-5e0368cffc4b/);
  assert.match(migration, /public\.get_my_admin_access/);
});

test('staff management Edge Function verifies the owner and never exposes the server secret', () => {
  assert.match(edge, /auth\.getUser\(tokenMatch\[1\]\)/);
  assert.match(edge, /caller\.id !== OWNER_ID/);
  assert.match(edge, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(edge, /SUPABASE_SECRET_KEYS/);
  assert.doesNotMatch(edge, /VITE_SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/);
});

test('staff invitations, role updates and revocation use Supabase Auth and the server-only table', () => {
  assert.match(edge, /auth\.admin\.inviteUserByEmail/);
  assert.match(edge, /admin_staff_members/);
  assert.match(edge, /action === 'update'/);
  assert.match(edge, /action === 'revoke'/);
  assert.match(edge, /is_active: false/);
  assert.match(edge, /linked_existing_account/);
  assert.doesNotMatch(edge, /auth\.admin\.deleteUser/);
  assert.match(edge, /Keep the Auth account intact/);
});

test('permission and role inputs are allow-listed and validated before persistence', () => {
  assert.match(edge, /PERMISSIONS = \['products', 'orders', 'analytics', 'expenses', 'crm', 'support', 'settings'\]/);
  assert.match(edge, /ROLES = \['manager', 'operator', 'finance', 'product_manager'\]/);
  assert.match(edge, /Object\.keys\(input\)\.some/);
  assert.match(edge, /typeof input\[key\] !== 'boolean'/);
});

test('staff management bounds actual request bytes and rejects malformed JSON as a client error', () => {
  assert.match(edge, /const rawBody = await request\.text\(\)/);
  assert.match(edge, /new TextEncoder\(\)\.encode\(rawBody\)\.byteLength > 12000/);
  assert.match(edge, /მოთხოვნის JSON ფორმატი არასწორია/);
  assert.match(edge, /მოთხოვნის ფორმატი არასწორია/);
  assert.doesNotMatch(edge, /request\.json\(\)/);
});
