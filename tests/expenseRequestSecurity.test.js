import test from 'node:test';
import assert from 'node:assert/strict';
import { ExpenseAccessDeniedError, getAuthenticatedExpenseHeaders, requireExpensePermission, requireExpensePrincipal } from '../src/utils/expenseRequestSecurity.js';

const session = (id = 'staff-1', token = 'secure-session-token') => ({
  data: { session: { user: { id }, access_token: token } }, error: null
});

const makeRequest = (response) => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, ...options });
    return typeof response === 'function' ? response() : response;
  };
  return { calls, fetchImpl };
};

test('verified expense headers require an authenticated session, never an anon fallback', async () => {
  const actual = await getAuthenticatedExpenseHeaders({ loadSession: async () => session(), apiKey: 'public-key' });
  assert.equal(actual.userId, 'staff-1');
  assert.equal(actual.headers.Authorization, 'Bearer secure-session-token');
  assert.equal(actual.headers.apikey, 'public-key');
  assert.notEqual(actual.headers.Authorization, 'Bearer public-key');
  for (const invalid of [
    { data: { session: null }, error: null },
    { data: { session: { user: { id: 'staff-1' } } }, error: null },
    { data: { session: { access_token: 'token' } }, error: null },
    { data: { session: { user: { id: 'staff-1' }, access_token: 'token' } }, error: new Error('expired') }
  ]) {
    await assert.rejects(
      getAuthenticatedExpenseHeaders({ loadSession: async () => invalid, apiKey: 'public-key' }),
      (err) => err instanceof ExpenseAccessDeniedError
    );
  }
});

test('same-user token rotation is allowed but account switching is rejected', async () => {
  assert.equal(
    (await getAuthenticatedExpenseHeaders({ loadSession: async () => session('staff-1', 'new-token'), apiKey: 'public-key', expectedUserId: 'staff-1' })).headers.Authorization,
    'Bearer new-token'
  );
  await assert.rejects(
    getAuthenticatedExpenseHeaders({ loadSession: async () => session('staff-2'), apiKey: 'public-key', expectedUserId: 'staff-1' }),
    (err) => err.expenseAccessDenied === true
  );
});

test('server-side permission grants are checked with the exact finance permission', async () => {
  const { calls, fetchImpl } = makeRequest({ ok: true, status: 200, json: async () => true });
  assert.equal(await requireExpensePermission({ supabaseUrl: 'https://test.supabase.co', headers: { Authorization: 'Bearer token' }, fetchImpl }), true);
  assert.deepEqual(calls, [{
    url: 'https://test.supabase.co/rest/v1/rpc/has_staff_permission',
    method: 'POST',
    headers: { Authorization: 'Bearer token' },
    body: JSON.stringify({ p_permission: 'expenses' })
  }]);
});

test('RLS HTTP 200 with zero-visible-row permission returns false and fails closed', async () => {
  for (const payload of [false, null, [], {}, { allowed: true }, 'true', 1]) {
    const { fetchImpl } = makeRequest({ ok: true, status: 200, json: async () => payload });
    await assert.rejects(
      requireExpensePermission({ supabaseUrl: 'https://test.supabase.co', headers: { Authorization: 'Bearer token' }, fetchImpl }),
      (error) => error instanceof ExpenseAccessDeniedError
    );
  }
});

test('explicit 401/403 permission rejection is distinct from temporary 5xx or invalid responses', async () => {
  for (const status of [401, 403]) {
    const { fetchImpl } = makeRequest({ ok: false, status });
    await assert.rejects(
      requireExpensePermission({ supabaseUrl: 'https://test.supabase.co', headers: { Authorization: 'Bearer token' }, fetchImpl }),
      (error) => error.expenseAccessDenied === true
    );
  }
  for (const response of [
    { ok: false, status: 503 },
    { ok: true, status: 200, json: async () => { throw Error('malformed JSON'); } }
  ]) {
    const { fetchImpl } = makeRequest(response);
    await assert.rejects(
      requireExpensePermission({ supabaseUrl: 'https://test.supabase.co', headers: { Authorization: 'Bearer token' }, fetchImpl }),
      (error) => !error.expenseAccessDenied
    );
  }
});

test('permission revocation between start and completion never receives final approval', async () => {
  let permitted = true;
  const { fetchImpl } = makeRequest(() => ({ ok: true, status: 200, json: async () => permitted }));
  const input = { supabaseUrl: 'https://test.supabase.co', headers: { Authorization: 'Bearer token' }, fetchImpl };
  assert.equal(await requireExpensePermission(input), true);
  permitted = false;
  await assert.rejects(requireExpensePermission(input), (error) => error.expenseAccessDenied === true);
});

test('permission lookup network rejection propagates; it never certifies a zero-expense ledger', async () => {
  const fetchImpl = async () => { throw new Error('offline'); };
  await assert.rejects(requireExpensePermission({ supabaseUrl: 'https://test.supabase.co', headers: { Authorization: 'Bearer token' }, fetchImpl }), /offline/);
});

test('mounted finance panel refuses missing or invalid current App principal', () => {
  assert.equal(requireExpensePrincipal('staff-1'), 'staff-1');
  for (const id of [null, undefined, '', '   ', 123, {}, false]) {
    assert.throws(() => requireExpensePrincipal(id), (error) => error instanceof ExpenseAccessDeniedError);
  }
});

test('mount principal remains authoritative when Supabase switches to another authorized account', async () => {
  const originalAppId = requireExpensePrincipal('staff-1');
  const currentSession = async () => session('staff-2', 'second-user-token');
  await assert.rejects(
    getAuthenticatedExpenseHeaders({ loadSession: currentSession, apiKey: 'public-key', expectedUserId: originalAppId }),
    (error) => error.expenseAccessDenied === true
  );
  // A same-principal refresh still works; the JWT may rotate independently.
  const refreshed = await getAuthenticatedExpenseHeaders({
    loadSession: async () => session('staff-1', 'rotated-token'),
    apiKey: 'public-key',
    expectedUserId: originalAppId
  });
  assert.equal(refreshed.headers.Authorization, 'Bearer rotated-token');
});
