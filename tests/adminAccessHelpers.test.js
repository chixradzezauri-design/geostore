import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_ADMIN_ACCESS,
  OWNER_ADMIN_ACCESS,
  hasAdminPermission,
  hasAnyAdminAccess,
  isOwnerAdmin,
  normalizeAdminAccess
} from '../src/utils/adminAccess.js';

const owner = {
  id: '1060de3d-d28a-45f8-9a64-5e0368cffc4b',
  app_metadata: { role: 'admin' }
};

test('only the fixed owner Auth identity receives owner-level access', () => {
  assert.equal(isOwnerAdmin(owner), true);
  assert.equal(isOwnerAdmin({ ...owner, id: 'different-user' }), false);
  assert.equal(isOwnerAdmin({ ...owner, app_metadata: { role: 'staff' } }), false);
  assert.equal(normalizeAdminAccess({}, owner), OWNER_ADMIN_ACCESS);
  assert.equal(OWNER_ADMIN_ACCESS.permissions.settings, true);
});

test('staff access is normalized only from the server-returned active membership', () => {
  const access = normalizeAdminAccess({
    is_staff: true,
    role: 'manager',
    display_name: 'Store Manager',
    permissions: { orders: true, support: true, unknown_admin: true }
  }, { id: 'staff-user', app_metadata: { role: 'authenticated' } });

  assert.equal(access.is_staff, true);
  assert.equal(access.is_admin, false);
  assert.equal(access.permissions.orders, true);
  assert.equal(access.permissions.support, true);
  assert.equal(access.permissions.unknown_admin, undefined);
  assert.equal(access.permissions.products, false);
});

test('missing, inactive, or empty server permissions fail closed', () => {
  assert.equal(normalizeAdminAccess({ is_staff: false, permissions: { orders: true } }, { id: 'staff-user' }), EMPTY_ADMIN_ACCESS);
  assert.equal(normalizeAdminAccess({ is_staff: true, permissions: {} }, { id: 'staff-user' }), EMPTY_ADMIN_ACCESS);
  assert.equal(normalizeAdminAccess({ is_staff: true, permissions: { admin: true } }, { id: 'staff-user' }), EMPTY_ADMIN_ACCESS);
  assert.equal(hasAnyAdminAccess(EMPTY_ADMIN_ACCESS), false);
});

test('module checks never trust unknown permission names or local role labels', () => {
  const access = normalizeAdminAccess({
    is_staff: true,
    role: 'operator',
    permissions: { products: true }
  }, { id: 'staff-user' });

  assert.equal(hasAdminPermission(access, 'products'), true);
  assert.equal(hasAdminPermission(access, 'orders'), false);
  assert.equal(hasAdminPermission(access, 'owner'), false);
  assert.equal(hasAdminPermission(EMPTY_ADMIN_ACCESS, 'products'), false);
});
