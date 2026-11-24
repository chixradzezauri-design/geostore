import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSupplierDraft,verifySupplierRows,planLegacySupplierImport,createAdminSupplierApi} from '../src/utils/adminSupplierApi.js';
import {readFileSync} from 'node:fs';
const OWNER='1060de3d-d28a-45f8-9a64-5e0368cffc4b';
const row={id:'00000000-0000-4000-8000-000000000001',name:'Supplier',commission:5,is_active:true,revision:1,updated_at:'2026-11-24T12:00:00Z'};
const session={data:{session:{user:{id:OWNER,app_metadata:{role:'admin'}},access_token:'fixture'}}};
const fixture=(fetchImpl,extra={})=>createAdminSupplierApi({loadSession:async()=>session,expectedUserId:OWNER,supabaseUrl:'https://fixture.invalid',apiKey:'fixture',fetchImpl,...extra});
const response=rows=>({ok:true,json:async()=>rows});
test('supplier validation preserves zero commission and rejects malformed data',()=>{
 assert.deepEqual(normalizeSupplierDraft({name:' Test ',commission:'0'}),{name:'Test',commission:0});
 for(const value of ['',null,101,-1,'1.111'])assert.equal(normalizeSupplierDraft({name:'Test',commission:value}),null);
 assert.throws(()=>verifySupplierRows([row,row]));assert.throws(()=>verifySupplierRows([{...row,revision:0}]));
});
test('legacy migration review never overwrites or conflates names',()=>{
 const plan=planLegacySupplierImport([{name:'Supplier',commission:5},{name:'Other',commission:0},{name:'Duplicate',commission:1},{name:'duplicate',commission:2},{name:'',commission:0}],[row]);
 assert.equal(plan.candidates.length,1);assert.equal(plan.already.length,1);assert.equal(plan.conflicts.length,1);assert.equal(plan.invalid.length,1);
 assert.equal(planLegacySupplierImport([{name:'supplier',commission:8}],[row]).conflicts.length,1);
});
test('supplier API denies nonowner and superseded sessions before network',async()=>{
 let calls=0;const fetchImpl=async()=>{calls++;return response([]);};
 await assert.rejects(fixture(fetchImpl,{expectedUserId:'other'}).list());await assert.rejects(fixture(fetchImpl,{isCurrent:()=>false}).list());assert.equal(calls,0);
});
test('revision-bound update archives without deleting and verifies actual response',async()=>{
 const api=fixture(async(url,options)=>{assert.match(url,/revision=eq.1/);assert.equal(options.method,'PATCH');assert.deepEqual(JSON.parse(options.body),{commission:6,is_active:false});return response([{...row,revision:2,commission:6,is_active:false}]);});
 assert.equal((await api.update(row,{commission:6,is_active:false})).revision,2);
 await assert.rejects(fixture(async()=>response([])).update(row,{commission:6,is_active:false}));
});
test('read and create require verified response; no automatic upsert',async()=>{
 assert.deepEqual(await fixture(async()=>response([row])).list(),[row]);
 const api=fixture(async(url,options)=>{assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body),{name:'Supplier',commission:5,is_active:true});return response([row]);});
 assert.deepEqual(await api.create({name:'Supplier',commission:'5'}),row);
 await assert.rejects(fixture(async()=>response([{...row,commission:9}])).create({name:'Supplier',commission:5}));
});
test('staged SQL has explicit owner RLS, immutable names and no delete grant',()=>{
 const sql=readFileSync(new URL('../release/staged-admin-suppliers.sql',import.meta.url),'utf8');
 assert.match(sql,/ENABLE ROW LEVEL SECURITY/);assert.match(sql,/REVOKE ALL ON TABLE public.admin_suppliers FROM PUBLIC, anon, authenticated/);
 assert.match(sql,/GRANT UPDATE \(commission, is_active\)/);assert.match(sql,/WITH CHECK/);assert.match(sql,/app_metadata/);assert.doesNotMatch(sql,/GRANT DELETE|FOR DELETE/);
});
