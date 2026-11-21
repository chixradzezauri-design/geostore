import test from 'node:test';
import assert from 'node:assert/strict';
import { ExpenseAccessDeniedError, getAuthenticatedExpenseHeaders, getRevalidatedExpenseAccessHeaders, getRevalidatedExpenseWriteHeaders, requireExpensePermission, requireExpensePrincipal } from '../src/utils/expenseRequestSecurity.js';

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

test('expense write keeps initial permission-checked token when same principal and token still match', async () => {
  let requests = 0;
  const headers = await getRevalidatedExpenseWriteHeaders({
    loadSession: async () => session('staff-1', 'token-one'),
    apiKey: 'public-key',
    expectedUserId: 'staff-1',
    previousHeaders: { Authorization: 'Bearer token-one' },
    supabaseUrl: 'https://test.supabase.co',
    fetchImpl: async () => { requests += 1; throw new Error('unexpected RPC'); }
  });
  assert.equal(headers.Authorization, 'Bearer token-one');
  assert.equal(requests, 0);
});

test('expense write re-verifies expenses permission for a refreshed same-user token', async () => {
  const { calls, fetchImpl } = makeRequest({ ok: true, status: 200, json: async () => true });
  const headers = await getRevalidatedExpenseWriteHeaders({
    loadSession: async () => session('staff-1', 'rotated-token'),
    apiKey: 'public-key',
    expectedUserId: 'staff-1',
    previousHeaders: { Authorization: 'Bearer previous-token' },
    supabaseUrl: 'https://test.supabase.co',
    fetchImpl
  });
  assert.equal(headers.Authorization, 'Bearer rotated-token');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].headers.Authorization, 'Bearer rotated-token');
  assert.equal(calls[0].body, JSON.stringify({ p_permission: 'expenses' }));
});

test('revoked permission or switched staff account fails before a finance write', async () => {
  const base = {
    apiKey: 'public-key',
    expectedUserId: 'staff-1',
    previousHeaders: { Authorization: 'Bearer previous-token' },
    supabaseUrl: 'https://test.supabase.co'
  };
  let calls = 0;
  const deny = async () => { calls += 1; return { ok: true, status: 200, json: async () => false }; };
  await assert.rejects(
    getRevalidatedExpenseWriteHeaders({ ...base, loadSession: async () => session('staff-1', 'rotated-token'), fetchImpl: deny }),
    (error) => error.expenseAccessDenied === true
  );
  assert.equal(calls, 1);
  await assert.rejects(
    getRevalidatedExpenseWriteHeaders({ ...base, loadSession: async () => session('staff-2', 'second-staff-token'), fetchImpl: deny }),
    (error) => error.expenseAccessDenied === true
  );
  assert.equal(calls, 1, 'switched principal must be rejected before any permission RPC');
  await assert.rejects(
    getRevalidatedExpenseWriteHeaders({ ...base, expectedUserId: null, loadSession: async () => session(), fetchImpl: deny }),
    (error) => error.expenseAccessDenied === true
  );
  await assert.rejects(
    getRevalidatedExpenseWriteHeaders({ ...base, previousHeaders: null, loadSession: async () => session(), fetchImpl: deny }),
    (error) => error.expenseAccessDenied === true
  );
});

test('a failed refreshed-token permission RPC cannot certify a finance write', async () => {
  const input = {
    loadSession: async () => session('staff-1', 'rotated-token'),
    apiKey: 'public-key',
    expectedUserId: 'staff-1',
    previousHeaders: { Authorization: 'Bearer previous-token' },
    supabaseUrl: 'https://test.supabase.co',
    fetchImpl: async () => ({ ok: false, status: 503 })
  };
  await assert.rejects(getRevalidatedExpenseWriteHeaders(input), (error) => !error.expenseAccessDenied);
});

test('financial CSV cannot use newly rotated token unless current expenses permission is granted', async () => {
  const initial = { Authorization: 'Bearer owner-old-token' };
  let checkCount = 0;
  const input = {
    loadSession: async () => session('owner-1', 'owner-new-token'),
    apiKey: 'public-key',
    expectedUserId: 'owner-1',
    previousHeaders: initial,
    supabaseUrl: 'https://test.supabase.co'
  };
  const fetchImpl = async (url, options) => {
    checkCount += 1;
    assert.match(url, /rpc\/has_staff_permission$/);
    assert.equal(options.headers.Authorization, 'Bearer owner-new-token');
    assert.equal(options.body, JSON.stringify({ p_permission: 'expenses' }));
    return { ok: true, status: 200, json: async () => true };
  };
  const verified = await getRevalidatedExpenseAccessHeaders({ ...input, fetchImpl });
  assert.equal(verified.Authorization, 'Bearer owner-new-token');
  assert.equal(checkCount, 1);
});

test('financial CSV fails closed if token rotates to revoked staff or a different principal', async () => {
  const base = {
    apiKey: 'public-key',
    expectedUserId: 'staff-A',
    previousHeaders: { Authorization: 'Bearer old-token' },
    supabaseUrl: 'https://test.supabase.co'
  };
  let lookups = 0;
  const denied = async () => {
    lookups += 1;
    return { ok: true, status: 200, json: async () => false };
  };
  await assert.rejects(getRevalidatedExpenseAccessHeaders({
    ...base,
    loadSession: async () => session('staff-A', 'rotated-token'),
    fetchImpl: denied
  }), error => error instanceof ExpenseAccessDeniedError);
  assert.equal(lookups, 1);
  await assert.rejects(getRevalidatedExpenseAccessHeaders({
    ...base,
    loadSession: async () => session('staff-B', 'other-token'),
    fetchImpl: denied
  }), error => error instanceof ExpenseAccessDeniedError);
  assert.equal(lookups, 1, 'different principal must fail without querying its authorization');
});

test('unchanged checked CSV token does not multiply authorization RPCs', async () => {
  const headers = await getRevalidatedExpenseAccessHeaders({
    loadSession: async () => session('staff-A', 'unchanged-token'),
    apiKey: 'public-key',
    expectedUserId: 'staff-A',
    previousHeaders: { Authorization: 'Bearer unchanged-token' },
    supabaseUrl: 'https://test.supabase.co',
    fetchImpl: async () => { throw new Error('unexpected repeat permission RPC'); }
  });
  assert.equal(headers.Authorization, 'Bearer unchanged-token');
});

test('CSV export fails closed when refreshed permission check cannot contact server', async () => {
  await assert.rejects(getRevalidatedExpenseAccessHeaders({
    loadSession: async () => session('staff-A', 'rotated-token'),
    apiKey: 'public-key',
    expectedUserId: 'staff-A',
    previousHeaders: { Authorization: 'Bearer old-token' },
    supabaseUrl: 'https://test.supabase.co',
    fetchImpl: async () => { throw new Error('temporary network failure'); }
  }), /temporary network failure/);
});
