import { isExpenseAccessDeniedStatus } from './expenseMutationSafety.js';

export class ExpenseAccessDeniedError extends Error {
  constructor(message = 'ხარჯების ნებართვა ან მომხმარებლის სესია არ დადასტურდა.') {
    super(message);
    this.name = 'ExpenseAccessDeniedError';
    this.expenseAccessDenied = true;
  }
}

// A mounted admin view is bound to a specific App user; a fresh Supabase
// session for a different principal must not authorize requests for that view.
export function requireExpensePrincipal(expectedUserId) {
  if (typeof expectedUserId !== 'string' || !expectedUserId.trim()) {
    throw new ExpenseAccessDeniedError('ფინანსური სესიის მომხმარებელი ვერ დადასტურდა.');
  }
  return expectedUserId;
}

// Keep expense REST requests attached to one real authenticated user, even
// during token refresh and when the app switches between different accounts.
export async function getAuthenticatedExpenseHeaders({ loadSession, apiKey, expectedUserId } = {}) {
  if (typeof loadSession !== 'function' || !apiKey) throw new Error('ხარჯების მოთხოვნის კონფიგურაცია არასწორია.');
  const { data, error } = await loadSession();
  const session = data?.session;
  const userId = session?.user?.id;
  if (error || !session?.access_token || typeof userId !== 'string' || !userId ||
      (expectedUserId && expectedUserId !== userId)) {
    throw new ExpenseAccessDeniedError('ფინანსური სესია შეიცვალა ან აღარ არის აქტიური. ხელახლა შედით სისტემაში.');
  }
  return {
    userId,
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    }
  };
}

// A successful RLS-filtered SELECT with [] does not prove that expenses are 0.
// This RPC checks the same live server permission used by the expenses policy.
export async function requireExpensePermission({ supabaseUrl, headers, fetchImpl } = {}) {
  if (typeof fetchImpl !== 'function' || !supabaseUrl || !headers?.Authorization) {
    throw new Error('ხარჯების უფლების შემოწმების კონფიგურაცია არასწორია.');
  }
  const response = await fetchImpl(`${supabaseUrl}/rest/v1/rpc/has_staff_permission`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ p_permission: 'expenses' })
  });
  if (!response?.ok) {
    if (isExpenseAccessDeniedStatus(response?.status)) throw new ExpenseAccessDeniedError();
    throw new Error(`ხარჯების უფლების შემოწმება ვერ დასრულდა (HTTP ${response?.status ?? 'unknown'}).`);
  }
  let allowed;
  try { allowed = await response.json(); }
  catch { throw new Error('ხარჯების უფლების შემოწმებამ არასწორი პასუხი დააბრუნა.'); }
  if (allowed !== true) throw new ExpenseAccessDeniedError();
  return true;
}

// The initial permission RPC may finish while Supabase rotates the token or
// signs in another staff account. Before private writes or CSV downloads,
// rebind to the mounted principal and recheck access on a rotated token.
export async function getRevalidatedExpenseAccessHeaders({
  loadSession, apiKey, expectedUserId, previousHeaders, supabaseUrl, fetchImpl
} = {}) {
  const principal = requireExpensePrincipal(expectedUserId);
  if (!previousHeaders?.Authorization) {
    throw new ExpenseAccessDeniedError('ფინანსური მოთხოვნის საწყისი ავტორიზაცია არ დადასტურდა.');
  }
  const { headers } = await getAuthenticatedExpenseHeaders({
    loadSession, apiKey, expectedUserId: principal
  });
  if (headers.Authorization !== previousHeaders.Authorization) {
    await requireExpensePermission({ supabaseUrl, headers, fetchImpl });
  }
  return headers;
}

// Preserve the existing mutation API; CSV and writes share identical preflight rules.
export const getRevalidatedExpenseWriteHeaders = getRevalidatedExpenseAccessHeaders;
