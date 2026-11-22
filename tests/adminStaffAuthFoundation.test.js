import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../supabase/migrations/20261117231455_admin_staff_auth_foundation.sql', import.meta.url), 'utf8');
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

test('staff authorization is blocked until the Auth email is confirmed', () => {
  assert.equal((migration.match(/auth_user\.email_confirmed_at IS NOT NULL/g) || []).length, 2);
  assert.match(migration, /FROM auth\.users AS auth_user/);
  assert.match(migration, /Do not expose staff-panel access before the invited email is confirmed/);
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
  assert.match(edge, /recovered_pending_invite/);
  assert.match(edge, /admin_staff_pending_invites/);
  assert.match(edge, /geostore_staff_invitation_token/);
  assert.match(edge, /targetUser\.user_metadata\?\./);
  assert.match(edge, /არსებული ანგარიშის ელფოსტა ჯერ დადასტურებული არ არის/);
  assert.doesNotMatch(edge, /auth\.admin\.deleteUser/);
  assert.match(edge, /Keep both the Auth account and pending invitation marker intact/);
});

const pendingInviteMigration = await readFile(new URL('../supabase/migrations/20261117231549_admin_staff_pending_invites.sql', import.meta.url), 'utf8');

test('pending staff invite recovery ledger is server-only and cannot be accessed by browser roles', () => {
  assert.match(pendingInviteMigration, /CREATE TABLE public\.admin_staff_pending_invites/);
  assert.match(pendingInviteMigration, /invitation_token uuid NOT NULL UNIQUE/);
  assert.match(pendingInviteMigration, /email = lower\(btrim\(email\)\)/);
  assert.match(pendingInviteMigration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(pendingInviteMigration, /FORCE ROW LEVEL SECURITY/);
  assert.match(pendingInviteMigration, /REVOKE ALL ON TABLE public\.admin_staff_pending_invites FROM PUBLIC, anon, authenticated/);
  assert.match(pendingInviteMigration, /GRANT ALL ON TABLE public\.admin_staff_pending_invites TO service_role/);
});

test('an interrupted owner-created invite can be recovered only with its matching server-recorded token', () => {
  const inviteStart = edge.indexOf("if (!targetUser) {");
  const persistIntent = edge.indexOf("from('admin_staff_pending_invites')", inviteStart);
  const sendInvite = edge.indexOf('auth.admin.inviteUserByEmail', inviteStart);
  const recoveryBranch = edge.indexOf('recoveredPendingInvite = true');
  const permissionGate = migration.indexOf('auth_user.email_confirmed_at IS NOT NULL');
  assert.ok(inviteStart >= 0);
  assert.ok(persistIntent > inviteStart);
  assert.ok(sendInvite > persistIntent);
  assert.ok(recoveryBranch > sendInvite);
  assert.ok(permissionGate >= 0);
  assert.match(edge, /userInvitationToken !== pendingInvite\.invitation_token/);
  assert.match(edge, /!targetUser\?\.confirmed_at/);
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


test('negative permission checks deny unknown modules and permissions not explicitly set to true', () => {
  assert.match(migration, /p_permission NOT IN \([\s\S]*'products', 'orders', 'analytics', 'expenses', 'crm', 'support', 'settings'[\s\S]*\)/);
  assert.match(migration, /staff\.permissions->>p_permission = 'true'/);
  assert.match(migration, /RETURN false;/);
});

test('inactive staff membership is denied by both permission and access-resolution paths', () => {
  assert.equal((migration.match(/staff\.is_active IS TRUE/g) || []).length, 2);
  assert.match(migration, /IF NOT FOUND THEN[\s\S]*'is_staff', false[\s\S]*'permissions', '\{\}'::jsonb/);
});

test('owner bypass is explicit and returns the complete known permission set', () => {
  assert.equal((migration.match(/v_user_id = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid/g) || []).length, 2);
  for (const permission of ['products', 'orders', 'analytics', 'expenses', 'crm', 'support', 'settings']) {
    assert.match(migration, new RegExp(`'${permission}', true`));
  }
});

test('unconfirmed staff are denied before the membership permission lookup', () => {
  const permissionFunction = migration.split('CREATE OR REPLACE FUNCTION public.has_staff_permission')[1]?.split('$function$;')[0] || '';
  const confirmationCheck = permissionFunction.indexOf('auth_user.email_confirmed_at IS NOT NULL');
  const membershipLookup = permissionFunction.indexOf('FROM public.admin_staff_members AS staff');
  assert.ok(confirmationCheck >= 0);
  assert.ok(membershipLookup > confirmationCheck);
});


test('staff Edge Function rejects unauthenticated callers and non-owner administrators', () => {
  assert.match(edge, /request\.method !== 'POST'/);
  assert.match(edge, /Authorization/);
  assert.match(edge, /Bearer\\s\+/);
  assert.match(edge, /auth\.getUser\(tokenMatch\[1\]\)/);
  assert.match(edge, /caller\.id !== OWNER_ID \|\| caller\.app_metadata\?\.role !== 'admin'/);
});

test('staff invite validates identity and cannot link the owner or another administrator', () => {
  assert.match(edge, /inviteUserByEmail\(email/);
  assert.match(edge, /email\.length > 254/);
  assert.match(edge, /displayName\.length < 2 \|\| displayName\.length > 100/);
  assert.match(edge, /!Object\.values\(permissions\)\.some\(Boolean\)/);
  assert.match(edge, /targetUser\.id === OWNER_ID/);
  assert.match(edge, /targetUser\.app_metadata\?\.role === 'admin'/);
});

test('staff updates and revocation cannot target the immutable owner or delete Auth accounts', () => {
  assert.equal((edge.match(/\.neq\('user_id', OWNER_ID\)/g) || []).length, 2);
  assert.match(edge, /action === 'update'/);
  assert.match(edge, /action === 'revoke'/);
  assert.match(edge, /is_active: body\.is_active !== false/);
  assert.match(edge, /is_active: false/);
  assert.doesNotMatch(edge, /auth\.admin\.deleteUser/);
  assert.doesNotMatch(edge, /auth\.admin\.deleteUser/);
  assert.match(edge, /from\('admin_staff_pending_invites'\)[\s\S]*?\.delete\(\)/);
});

const adminDashboard = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('admin staff navigation does not reference child-local staffList state', () => {
  assert.match(adminDashboard, /\{ id: 'staff', label: '👔 თანამშრომლები & როლები', icon: UserCog \}/);
  assert.doesNotMatch(adminDashboard, /\{ id: 'staff', label: '👔 თანამშრომლები & როლები', count: staffList/);
});
