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

 
// Shared production order loader. The same async path is exercised by
// deterministic integration tests without touching the live Supabase data.
// null means that the mounting session changed; it does NOT certify an empty
// ledger. Every other unverified read throws and App marks reports unverified.
export async function fetchVerifiedAdminOrderLedger({
  loadSession, apiKey, expectedUserId, supabaseUrl, fetchImpl, isCurrent,
  pageSize = 1000, maxRows = 100000
} = {}) {
  if (typeof fetchImpl !== 'function' || !supabaseUrl || typeof isCurrent !== 'function' ||
      !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 1000 ||
      !Number.isSafeInteger(maxRows) || maxRows < pageSize || maxRows % pageSize !== 0) {
    throw new Error('შეკვეთების სრული ისტორიის ჩატვირთვის კონფიგურაცია არასწორია.');
  }
  if (!isCurrent()) return null;

  const initialSession = await getAuthenticatedAdminOrderHeaders({
    loadSession, apiKey, expectedUserId
  });
  if (!isCurrent()) return null;
  await requireAdminOrderPermission({ supabaseUrl, headers: initialSession.headers, fetchImpl });
  if (!isCurrent()) return null;

  const allOrderRows = [];
  let completed = false;
  for (let offset = 0; offset < maxRows; offset += pageSize) {
    const { headers } = await getAuthenticatedAdminOrderHeaders({
      loadSession, apiKey, expectedUserId: initialSession.userId
    });
    if (!isCurrent()) return null;
    const response = await fetchImpl(
      `${supabaseUrl}/rest/v1/rpc/admin_order_ledger_page`,
      { method: 'POST', headers, body: JSON.stringify({ p_offset: offset, p_limit: pageSize }) }
    );
    if (!isCurrent()) return null;
    if (!response?.ok) {
      const detail = await response?.text?.().catch(() => '');
      throw new Error(detail || `შეკვეთების მიღება ვერ მოხერხდა (HTTP ${response?.status ?? 'unknown'}).`);
    }
    const page = await response.json();
    if (!isCurrent()) return null;
    if (!Array.isArray(page)) throw new Error('შეკვეთების სია არასწორ ფორმატში დაბრუნდა.');
    allOrderRows.push(...page);
    if (page.length < pageSize) {
      completed = true;
      break;
    }
    if (offset + pageSize >= maxRows) {
      throw new Error('შეკვეთების სრული ისტორიის შემოწმება ვერ დასრულდა; ბოლო წარმატებული სია შენარჩუნებულია.');
    }
  }
  if (!completed) throw new Error('შეკვეთების სრული ისტორიის ჩატვირთვა ვერ დასრულდა.');
  if (!hasVerifiedAdminOrderLedgerRows(allOrderRows)) {
    throw new Error('შეკვეთების ისტორიაში არასწორი ან დუბლირებული ID აღმოჩნდა; ფინანსური ანგარიში არ დასტურდება.');
  }
  const finalSession = await getAuthenticatedAdminOrderHeaders({
    loadSession, apiKey, expectedUserId: initialSession.userId
  });
  if (!isCurrent()) return null;
  await requireAdminOrderPermission({ supabaseUrl, headers: finalSession.headers, fetchImpl });
  if (!isCurrent()) return null;
  return allOrderRows;
}
