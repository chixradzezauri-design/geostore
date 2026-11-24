import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyStage88,verifyNewFrontendEntrypoints} from '../scripts/stage88SupportStaffLiveReleaseGate.mjs';
import {build} from '../scripts/stage88ExtractStaffSupportPolicies.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const frozen=JSON.parse(read('../release/stage88-live-support-staff-surface.json'));
const clone=o=>structuredClone(o);
test('Stage88 original six CRM/support staff policy statements are extracted verbatim, not staff RPC source replacements',()=>{
 const source=build();
 assert.equal((source.match(/CREATE POLICY /g)||[]).length,6);
 assert.equal((source.match(/DROP POLICY IF EXISTS /g)||[]).length,6);
 assert.match(source,/has_staff_permission\('crm'\)/);
 assert.match(source,/has_staff_permission\('support'\)/);
 assert.doesNotMatch(source,/DO \$staff_support_permissions\$|EXECUTE regexp_replace/);
});
test('Stage88 freezes five live support/staff tables, seven RLS policies, 16 RPCs and unapproved Phase B cutover',()=>{
 const result=verifyStage88();
 assert.match(result.result,/RELEASE_STILL_BLOCKED/);
 assert.equal(result.tables,5);assert.equal(result.rlsPolicies,7);
 assert.equal(result.rpcs,16);assert.equal(result.originalStaffRlsPolicies,6);
 assert.equal(result.phaseA,3);assert.equal(result.phaseB,1);
});
test('Stage88 denies relaxed staff RLS, exposed staff records and CRM/support privilege crossover',()=>{
 let x=clone(frozen);x.supportSurface.tables.find(v=>v.name==='public.admin_staff_members').authenticatedSelect=true;
 assert.throws(()=>verifyStage88({observed:x}),/server-only staff records/);
 x=clone(frozen);x.supportSurface.tables.find(v=>v.name==='public.support_tickets').rls=false;
 assert.throws(()=>verifyStage88({observed:x}),/support\/CRM RLS/);
 x=clone(frozen);
 x.supportSurface.policies.find(p=>p.name==='Staff with support permission can read support tickets').usingMd5='190ed8f6308ae82f7264099e38974dee';
 assert.throws(()=>verifyStage88({observed:x}),/original live staff CRM\/support RLS policy/);
 x=clone(frozen);
 x.supportSurface.policies.find(p=>p.name==='Visitors can submit validated support tickets').roles=['authenticated'];
 assert.throws(()=>verifyStage88({observed:x}),/guest support submit policy/);
});
test('Stage88 rejects direct SECURITY DEFINER public RPC and anonymous staff permission escalation',()=>{
 let x=clone(frozen);
 x.supportSurface.rpcs.find(r=>r.sig.startsWith('public.has_staff_permission(')).anon=true;
 assert.throws(()=>verifyStage88({observed:x}),/support\/staff AUTH RPC/);
 x=clone(frozen);
 x.supportSurface.rpcs.find(r=>r.sig.startsWith('public.get_support_ticket_messages(')).definer=true;
 assert.throws(()=>verifyStage88({observed:x}),/support\/staff AUTH RPC/);
});
test('Stage88 checks frontend only uses new order read/image-ref APIs and server staff management',()=>{
 assert.equal(verifyNewFrontendEntrypoints(),true);
 const app=read('../src/App.jsx');
 assert.throws(()=>verifyNewFrontendEntrypoints({app:app+"\nconst untrusted = supabase.from('orders').select('*');"}),
  /legacy raw order SELECT/);
 const admin=read('../src/components/AdminDashboardPro.jsx');
 assert.throws(()=>verifyNewFrontendEntrypoints({admin:admin.replace('/rest/v1/rpc/admin_order_image_refs_page','/rest/v1/orders?select=*')}),
  /new admin product image usage/);
});
test('Stage88 supports fresh read-only surface output and blocks new Production drift',()=>{
 assert.match(verifyStage88({freshSurface:[{snapshot:JSON.stringify(frozen.supportSurface)}]}).result,/RELEASE_STILL_BLOCKED/);
 const changed=clone(frozen.supportSurface);
 changed.tables.find(t=>t.name==='public.support_ticket_messages').anonSelect=true;
 assert.throws(()=>verifyStage88({freshSurface:[{snapshot:changed}]}),/fresh Production staff\/support RLS catalog/);
});
test('Stage88 keeps SQL read-only and tests only localhost with real original six support policies',()=>{
 const query=read('../release/stage88-read-only-support-staff-surface.sql');
 const script=read('../scripts/stage88SignedSupportStaffHttp.mjs');
 const wf=read('../.github/workflows/stage78-free-supabase-auth-postgrest.yml');
 const doc=read('../docs/stage88-support-staff-phase-cutover.md');
 assert.match(query,/SELECT jsonb_build_object/);
 assert.doesNotMatch(query,/\b(?:INSERT INTO|UPDATE public|DELETE FROM|ALTER TABLE|CREATE TABLE|DROP TABLE)\b/i);
 assert.match(script,/localhost/);
 assert.match(script,/admin_order_ledger_page/);
 assert.match(script,/admin_staff_members/);
 assert.match(script,/STAGE88-TICKET-1/);
 assert.match(script,/STAGE88-CHAT-1/);
 assert.match(script,/is_active:false/);
 assert.match(wf,/stage88SignedSupportStaffHttp.mjs/);
 for(const key of ['NOT RELEASE-READY','Production unchanged','no paid staging',
 'Phase A','Phase B','full-schema','203','7','16','server-side'])
 assert.ok(doc.includes(key),'Missing safety notice '+key);
});
