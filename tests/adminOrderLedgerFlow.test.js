import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AdminOrderLedgerAccessError,
  fetchVerifiedAdminOrderLedger
} from '../src/utils/adminOrderLedgerSafety.js';

const makeSession = (id, token) => ({ data: { session: { user: { id }, access_token: token } }, error: null });
const base = {
  apiKey: 'anon-public-key',
  expectedUserId: 'owner-1',
  supabaseUrl: 'https://test.supabase.co',
  isCurrent: () => true,
  pageSize: 2,
  maxRows: 6
};
const response = (rows) => ({ ok: true, status: 200, json: async () => rows });
const setupFetch = ({ pages = [], permissions = [true, true], onPage } = {}) => {
  const calls = [];
  let pageIndex = 0, permissionIndex = 0;
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/rpc/has_staff_permission')) {
      const allowed = permissions[permissionIndex++] ?? false;
      return response(allowed);
    }
    assert.ok(url.endsWith('/orders?select=*&order=created_at.desc,id.asc'));
    const index = pageIndex++;
    if (onPage) onPage(index);
    return typeof pages[index] === 'function' ? pages[index]() : response(pages[index] ?? []);
  };
  return { fetchImpl, calls, get pageCount() { return pageIndex; }, get permissionCount() { return permissionIndex; } };
};

test('shared production order loader verifies multiple pages and both permission checks before publishing', async () => {
  const mock=setupFetch({pages:[[{id:'o-4'},{id:'o-3'}],[{id:'o-2'}]]});
  const rows=await fetchVerifiedAdminOrderLedger({ ...base, loadSession: async()=>makeSession('owner-1','token-A'), fetchImpl:mock.fetchImpl });
  assert.deepEqual(rows.map(r=>r.id),['o-4','o-3','o-2']);
  assert.equal(mock.pageCount,2);
  assert.equal(mock.permissionCount,2);
  const requests=mock.calls.filter(c=>c.url.includes('/orders?'));
  assert.deepEqual(requests.map(c=>c.options.headers.Range),['0-1','2-3']);
  assert.ok(requests.every(c=>c.options.headers.Authorization==='Bearer token-A'));
});

test('permission denied after a complete page traversal never certifies a ledger', async () => {
  const mock=setupFetch({pages:[[{id:'o-1'}]],permissions:[true,false]});
  await assert.rejects(fetchVerifiedAdminOrderLedger({ ...base,loadSession:async()=>makeSession('owner-1','token-A'),fetchImpl:mock.fetchImpl }), e=>e instanceof AdminOrderLedgerAccessError);
  assert.equal(mock.permissionCount,2);
});

test('RLS filtered empty response with denied first permission is not a verified empty ledger', async () => {
  const mock=setupFetch({pages:[],permissions:[false]});
  await assert.rejects(fetchVerifiedAdminOrderLedger({ ...base,loadSession:async()=>makeSession('owner-1','token-A'),fetchImpl:mock.fetchImpl }), e=>e instanceof AdminOrderLedgerAccessError);
  assert.equal(mock.pageCount,0);
});

test('account switch after first page is rejected before a second page', async () => {
  let principal='owner-1';
  const mock=setupFetch({pages:[[{id:'o-2'},{id:'o-1'}]],onPage:()=>{principal='staff-2';}});
  await assert.rejects(fetchVerifiedAdminOrderLedger({
    ...base,loadSession:async()=>makeSession(principal,principal+'-token'),fetchImpl:mock.fetchImpl
  }), e=>e instanceof AdminOrderLedgerAccessError);
  assert.equal(mock.pageCount,1);
});

test('same-account rotated token is supported with live final permission check', async () => {
  let token='original-token';
  const mock=setupFetch({pages:[[{id:'o-2'},{id:'o-1'}],[{id:'o-0'}]],onPage:()=>{token='rotated-token';}});
  const rows=await fetchVerifiedAdminOrderLedger({
    ...base,loadSession:async()=>makeSession('owner-1',token),fetchImpl:mock.fetchImpl
  });
  assert.equal(rows.length,3);
  assert.equal(mock.permissionCount,2);
  assert.equal(mock.calls.filter(c=>c.url.includes('/orders?'))[1].options.headers.Authorization,'Bearer rotated-token');
  assert.equal(mock.calls.at(-1).options.headers.Authorization,'Bearer rotated-token');
});

test('duplicate row ids across pages fail complete ledger verification', async () => {
  const mock=setupFetch({pages:[[{id:'o-1'},{id:'o-2'}],[{id:'o-1'}]]});
  await assert.rejects(fetchVerifiedAdminOrderLedger({ ...base,loadSession:async()=>makeSession('owner-1','token-A'),fetchImpl:mock.fetchImpl }),/დუბლირებული ID/);
  assert.equal(mock.permissionCount,1,'final authorization is not reached after invalid data');
});

test('full page cap with no terminating partial page fails closed', async () => {
  const mock=setupFetch({pages:[[{id:'o-1'},{id:'o-2'}],[{id:'o-3'},{id:'o-4'}],[{id:'o-5'},{id:'o-6'}]]});
  await assert.rejects(fetchVerifiedAdminOrderLedger({ ...base,loadSession:async()=>makeSession('owner-1','token-A'),fetchImpl:mock.fetchImpl }),/სრული ისტორიის შემოწმება ვერ დასრულდა/);
});

test('network and malformed page results fail before a ledger is certified', async () => {
  for(const faulty of [
    () => ({ok:false,status:503,text:async()=>''}),
    () => ({ok:true,status:200,json:async()=>({items:[]})}),
    () => {throw new Error('network disconnected');}
  ]) {
    const mock=setupFetch({pages:[faulty]});
    await assert.rejects(fetchVerifiedAdminOrderLedger({ ...base,loadSession:async()=>makeSession('owner-1','token-A'),fetchImpl:mock.fetchImpl }));
  }
});

test('an unmounted caller receives null instead of certifying stale private rows', async () => {
  let active=true;
  const mock=setupFetch({pages:[[{id:'o-1'}]],onPage:()=>{active=false;}});
  const result=await fetchVerifiedAdminOrderLedger({
    ...base,isCurrent:()=>active,loadSession:async()=>makeSession('owner-1','token-A'),fetchImpl:mock.fetchImpl
  });
  assert.equal(result,null);
  assert.equal(mock.permissionCount,1);
});
