import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('staff management uses the protected Supabase Edge Function for all changes', () => {
  assert.match(source, /supabase\.functions\.invoke\('manage-admin-staff'/);
  for (const action of ['list', 'invite', 'update', 'revoke']) {
    assert.match(source, new RegExp(`action: '${action}'`));
  }
  assert.match(source, /if \(!isOwner\) return null/);
});

test('legacy localStorage staff records are preserved as read-only migration references', () => {
  assert.match(source, /localStorage\.getItem\('geostore_staff_list'\)/);
  assert.doesNotMatch(source, /localStorage\.setItem\('geostore_staff_list'/);
  assert.match(source, /ძველი localStorage ჩანაწერები შენარჩუნებულია/);
  assert.match(source, /ფორმაში გადატანა/);
});

test('server staff UI exposes all seven module permissions and revokes without deleting Auth users', () => {
  for (const permission of ['products', 'orders', 'analytics', 'expenses', 'crm', 'support', 'settings']) {
    assert.match(source, new RegExp(`key: '${permission}'`));
  }
  assert.match(source, /action: 'revoke'/);
  assert.match(source, /Auth ანგარიში არ წაიშლება/);
  assert.match(source, /staff\.is_active/);
});
