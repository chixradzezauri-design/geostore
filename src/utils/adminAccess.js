export const ADMIN_PERMISSION_KEYS = Object.freeze([
  'products',
  'orders',
  'analytics',
  'expenses',
  'crm',
  'support',
  'settings'
]);

const createPermissions = (value = {}) => Object.fromEntries(
  ADMIN_PERMISSION_KEYS.map((key) => [key, value?.[key] === true])
);

export const EMPTY_ADMIN_ACCESS = Object.freeze({
  is_admin: false,
  is_staff: false,
  role: null,
  display_name: '',
  permissions: Object.freeze(createPermissions())
});

export const OWNER_ADMIN_ACCESS = Object.freeze({
  is_admin: true,
  is_staff: false,
  role: 'owner',
  display_name: '',
  permissions: Object.freeze(createPermissions(
    Object.fromEntries(ADMIN_PERMISSION_KEYS.map((key) => [key, true]))
  ))
});

export const isOwnerAdmin = (user) =>
  user?.app_metadata?.role === 'admin' &&
  user?.id === '1060de3d-d28a-45f8-9a64-5e0368cffc4b';

export const normalizeAdminAccess = (payload, user) => {
  if (isOwnerAdmin(user)) return OWNER_ADMIN_ACCESS;
  if (!user?.id || payload?.is_staff !== true) return EMPTY_ADMIN_ACCESS;

  const permissions = createPermissions(payload.permissions);
  if (!Object.values(permissions).some(Boolean)) return EMPTY_ADMIN_ACCESS;

  return {
    is_admin: false,
    is_staff: true,
    role: typeof payload.role === 'string' ? payload.role : null,
    display_name: typeof payload.display_name === 'string' ? payload.display_name.slice(0, 100) : '',
    permissions
  };
};

export const hasAdminPermission = (access, permission) =>
  access?.is_admin === true ||
  (access?.is_staff === true && ADMIN_PERMISSION_KEYS.includes(permission) && access?.permissions?.[permission] === true);

export const hasAnyAdminAccess = (access) =>
  access?.is_admin === true ||
  (access?.is_staff === true && Object.values(createPermissions(access.permissions)).some(Boolean));
