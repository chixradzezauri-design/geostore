import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const expenseRls = readFileSync(new URL('supabase/migrations/20261117143000_staff_expenses_permission.sql', root), 'utf8');
const staffAuth = readFileSync(new URL('supabase/migrations/20261117100000_admin_staff_auth_foundation.sql', root), 'utf8');

test('expenses RLS protects SELECT, INSERT, UPDATE, DELETE with live server permission', () => {
  assert.match(expenseRls, /ON public\.expenses\s+FOR ALL\s+TO authenticated\s+USING \(public\.has_staff_permission\('expenses'\)\)\s+WITH CHECK \(public\.has_staff_permission\('expenses'\)\)/);
  assert.doesNotMatch(expenseRls, /TO anon/);
});

test('staff permissions are active, email-confirmed, server-controlled and anonymous callers cannot invoke the checker', () => {
  assert.match(staffAuth, /ALTER TABLE public\.admin_staff_members ENABLE ROW LEVEL SECURITY/);
  assert.match(staffAuth, /REVOKE ALL ON TABLE public\.admin_staff_members FROM PUBLIC, anon, authenticated/);
  assert.match(staffAuth, /staff\.is_active IS TRUE/);
  assert.match(staffAuth, /auth_user\.email_confirmed_at IS NOT NULL/);
  assert.match(staffAuth, /staff\.permissions->>p_permission = 'true'/);
  assert.match(staffAuth, /REVOKE ALL ON FUNCTION public\.has_staff_permission\(text\) FROM PUBLIC, anon/);
  assert.match(staffAuth, /GRANT EXECUTE ON FUNCTION public\.has_staff_permission\(text\) TO authenticated/);
});
