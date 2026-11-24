import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const a=read('./stage78-supabase/stage79-phase-a.sql');
const b=read('./stage78-supabase/stage79-phase-b.sql');
const script=read('../scripts/stage79SignedCutover.mjs');
const workflow=read('../.github/workflows/stage78-free-supabase-auth-postgrest.yml');
const notes=read('../docs/stage79-free-phase-cutover.md');
test('Stage79 loads all exact release SQL in correct Phase A then B order',()=>{
 for(const f of ['20261121170000_strip_private_costs_from_checkout_rpc.sql',
   '20261121190000_redact_alternate_costs_from_order_history.sql'])
   assert.ok(a.includes(f),'Stage79 missing Phase A source '+f);
 assert.match(b,/20261121213000_revoke_legacy_order_snapshot_reads\.sql/);
 assert.doesNotMatch(a,/20261121213000_revoke_legacy_order_snapshot_reads/);
 assert.ok(workflow.includes('stage79-phase-a.sql') && workflow.includes('stage79SignedCutover.mjs'));
});
test('Stage79 refuses nonlocal target and covers signed receipt, history, role and cutover',()=>{
 for(const phrase of ['Only disposable localhost Supabase','signInWithPassword',
   'purchase_cost','cost_price','idempotent','get_my_orders',
   'admin_order_ledger_page','admin_order_image_refs_page',
   'Phase B','stage79-phase-b.sql','127.0.0.1','SELECT * denied'])
   assert.ok(script.includes(phrase),'Stage79 missing '+phrase);
 assert.doesNotMatch(script,/anon\.auth\.signInWithPassword/);
 assert.match(script,/isolatedSignIn\.auth\.signInWithPassword/);
 assert.match(a,/synthetic/);
 assert.match(a,/SECURITY INVOKER SET search_path TO ''/);
 for(const phrase of ['NOT RELEASE-READY','full-schema','no paid staging',
   'Production unchanged','Phase A','Phase B','private checkout writer'])
   assert.ok(notes.includes(phrase),'Stage79 warning missing '+phrase);
});
