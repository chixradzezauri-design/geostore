import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AdminOrderLedgerAccessError,
  AdminOrderFinanceAccessChangedError,
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
const setupFetch = ({ pages = [], permissions = [true, true], financePermissions = [], onPage } = {}) => {
  const calls = [];
  let pageIndex = 0, permissionIndex = 0, financeIndex = 0;
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/rpc/has_staff_permission')) {
      const permission = JSON.parse(options.body)?.p_permission;
      if (permission === 'expenses') {
        const allowed = financeIndex < financePermissions.length ? financePermissions[financeIndex] : false;
      financeIndex += 1;
        return response(allowed);
      }
      assert.equal(permission, 'orders');
      const allowed = permissions[permissionIndex++] ?? false;
      return response(allowed);
    }
    assert.ok(url.endsWith('/rpc/admin_order_ledger_page'));
    assert.equal(options.method, 'POST');
    assert.deepEqual(JSON.parse(options.body), { p_offset: pageIndex * 2, p_limit: 2 });
    const index = pageIndex++;
    if (onPage) onPage(index);
    return typeof pages[index] === 'function' ? pages[index]() : response(pages[index] ?? []);
  };
  return { fetchImpl, calls, get pageCount() { return pageIndex; }, get permissionCount() { return permissionIndex; }, get financeCount() { return financeIndex; } };
};

test('shared production order loader verifies multiple pages and both permission checks before publishing', async () => {
  const mock=setupFetch({pages:[[{id:'o-4'},{id:'o-3'}],[{id:'o-2'}]]});
  const rows=await fetchVerifiedAdminOrderLedger({ ...base, loadSession: async()=>makeSession('owner-1','token-A'), fetchImpl:mock.fetchImpl });
  assert.deepEqual(rows.map(r=>r.id),['o-4','o-3','o-2']);
  assert.equal(mock.pageCount,2);
  assert.equal(mock.permissionCount,2);
  const requests=mock.calls.filter(c=>c.url.includes('/rpc/admin_order_ledger_page'));
  assert.deepEqual(requests.map(c=>JSON.parse(c.options.body).p_offset),[0,2]);
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
  assert.equal(mock.calls.filter(c=>c.url.includes('/rpc/admin_order_ledger_page'))[1].options.headers.Authorization,'Bearer rotated-token');
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


test('finance access revoked during pagination never certifies mixed privileged data', async () => {
  const mock=setupFetch({
    pages:[
      [{id:'o-2',items:[{id:'p2',price:70,purchase_cost:15}]},
       {id:'o-1',items:[{id:'p1',price:80,purchase_cost:25}]}],
      [{id:'o-0',items:[{id:'p0',price:90}]}]
    ],
    financePermissions:[true,true,false]
  });
  await assert.rejects(fetchVerifiedAdminOrderLedger({
    ...base,loadSession:async()=>makeSession('owner-1','valid-token'),fetchImpl:mock.fetchImpl
  }), error => error instanceof AdminOrderFinanceAccessChangedError);
  assert.equal(mock.pageCount,2);
  assert.equal(mock.financeCount,3);
});

test('finance access newly granted during pagination forces a fresh complete ledger', async () => {
  const mock=setupFetch({
    pages:[[{id:'o1',items:[{id:'p1',price:80}]}]],
    financePermissions:[false,true]
  });
  await assert.rejects(fetchVerifiedAdminOrderLedger({
    ...base,loadSession:async()=>makeSession('owner-1','valid-token'),fetchImpl:mock.fetchImpl
  }), error => error instanceof AdminOrderFinanceAccessChangedError);
});

test('stable orders-only staff receives client-side cost redaction even for a malformed RPC response', async () => {
  const mock=setupFetch({
    pages:[[{id:'o1',items:[{
      id:'p1',price:80,quantity:1,purchase_cost:12,vendor:'internal',
      supplierName:'private',selectedSize:'L'
    }]}]],
    financePermissions:[false,false,false]
  });
  const rows=await fetchVerifiedAdminOrderLedger({
    ...base,loadSession:async()=>makeSession('owner-1','valid-token'),fetchImpl:mock.fetchImpl
  });
  assert.deepEqual(rows,[{id:'o1',items:[{id:'p1',price:80,quantity:1,selectedSize:'L'}]}]);
  assert.equal(mock.financeCount,3);
});

test('stable finance-authorized staff keeps cost snapshots for authorized reports', async () => {
  const mock=setupFetch({
    pages:[[{id:'finance-order',items:[{price:100,purchase_cost:33}]}]],
    financePermissions:[true,true,true]
  });
  const rows=await fetchVerifiedAdminOrderLedger({
    ...base,loadSession:async()=>makeSession('owner-1','valid-token'),fetchImpl:mock.fetchImpl
  });
  assert.equal(rows[0].items[0].purchase_cost,33);
});

test('malformed or unavailable finance check fails closed rather than treating it as orders-only', async () => {
  for (const malformed of [null,'false',0,[],{},undefined]) {
    const mock=setupFetch({ pages:[], financePermissions:[malformed]});
    await assert.rejects(fetchVerifiedAdminOrderLedger({
      ...base,loadSession:async()=>makeSession('owner-1','valid-token'),fetchImpl:mock.fetchImpl
    }),/ფინანსური უფლების შემოწმების პასუხი არასწორია/);
    assert.equal(mock.pageCount,0);
  }
});

test('finance permission loss is not treated as a successful empty ledger', async () => {
  const mock=setupFetch({pages:[[]],financePermissions:[true,true,false]});
  await assert.rejects(fetchVerifiedAdminOrderLedger({
    ...base,loadSession:async()=>makeSession('owner-1','valid-token'),fetchImpl:mock.fetchImpl
  }),error=>error instanceof AdminOrderFinanceAccessChangedError);
});
