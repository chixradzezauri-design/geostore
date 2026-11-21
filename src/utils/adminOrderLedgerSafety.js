export class AdminOrderLedgerAccessError extends Error {
  constructor() { super('შეკვეთების მიმდინარე მომხმარებელი ან უფლება ვერ დადასტურდა.'); this.name = 'AdminOrderLedgerAccessError'; }
}

export async function getAuthenticatedAdminOrderHeaders({ loadSession, apiKey, expectedUserId } = {}) {
  if (typeof loadSession !== 'function' || !apiKey) throw new Error('შეკვეთების სესიის კონფიგურაცია არასწორია.');
  if (typeof expectedUserId !== 'string' || !expectedUserId.trim()) throw new AdminOrderLedgerAccessError();
  const { data, error } = await loadSession();
  const session = data?.session;
  if (error || session?.user?.id !== expectedUserId ||
      typeof session?.access_token !== 'string' || !session.access_token.trim()) {
    throw new AdminOrderLedgerAccessError();
  }
  return {
    userId: expectedUserId,
    headers: { apikey: apiKey, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }
  };
}

export async function requireAdminOrderPermission({ supabaseUrl, headers, fetchImpl } = {}) {
  if (typeof fetchImpl !== 'function' || !supabaseUrl || !headers?.Authorization) throw new AdminOrderLedgerAccessError();
  const response = await fetchImpl(`${supabaseUrl}/rest/v1/rpc/has_staff_permission`, {
    method: 'POST', headers, body: JSON.stringify({ p_permission: 'orders' })
  });
  if (!response?.ok) {
    if (response?.status === 401 || response?.status === 403) throw new AdminOrderLedgerAccessError();
    throw new Error(`შეკვეთების უფლება ვერ გადამოწმდა (HTTP ${response?.status ?? 'unknown'}).`);
  }
  let allowed;
  try { allowed = await response.json(); }
  catch { throw new Error('შეკვეთების უფლების შემოწმების პასუხი არასწორია.'); }
  if (allowed !== true) throw new AdminOrderLedgerAccessError();
  return true;
}

export function hasVerifiedAdminOrderLedgerRows(rows) {
  if (!Array.isArray(rows)) return false;
  const ids = new Set();
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
    const id = String(row.id ?? '').trim();
    if (!id || ids.has(id)) return false;
    ids.add(id);
  }
  return true;
}
