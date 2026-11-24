import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path=>readFileSync(new URL(path,import.meta.url),'utf8');
const phaseA = read('./sql/stage77_phase_a_legacy_role_compat.sql');
const fixture = read('./sql/stage57_order_ledger_scope_contract.sql');
const bridge = read('../supabase/migrations/20261121210000_scope_admin_order_ledger_permissions.sql');
const restrictive = read('../supabase/migrations/20261121213000_revoke_legacy_order_snapshot_reads.sql');
const workflow = read('../.github/workflows/stage52-isolated-postgres.yml');

test('Stage77 runs actual DB roles after additive migration and before finance cutover',()=>{
 const a=fixture.indexOf('\\ir ../../supabase/migrations/20261121210000_scope_admin_order_ledger_permissions.sql');
 const b=fixture.indexOf('\\ir stage77_phase_a_legacy_role_compat.sql');
 const c=fixture.indexOf('\\ir ../../supabase/migrations/20261121213000_revoke_legacy_order_snapshot_reads.sql');
 assert.ok(a>=0 && b>a && c>b,'Legacy admin must not lose access before new frontend deploy');
 assert.match(workflow,/tests\/sql\/stage77_phase_a_legacy_role_compat\.sql/);
 assert.match(bridge,/public\.admin_order_ledger_page/);
 assert.doesNotMatch(bridge,/REVOKE SELECT ON TABLE public\.orders/);
 assert.match(restrictive,/REVOKE SELECT ON TABLE public\.orders/);
});

test('Stage77 checks guest, spoofed admin, products-only, orders-only and finance-only roles without HTTP/JWT claim',()=>{
 assert.match(phaseA,/SET ROLE anon;/);
 assert.match(phaseA,/SET ROLE authenticated;/);
 assert.match(phaseA,/app_metadata/);
 assert.match(phaseA,/user_metadata/);
 for(const name of ['stage77_anon','stage77_nonstaff','stage77_products',
    'stage77_old_and_new','stage77_finance']) assert.ok(phaseA.includes(name));
 assert.match(phaseA,/SELECT to_jsonb\(o\) INTO legacy FROM public\.orders/);
 assert.match(phaseA,/legacy->'checkout_result'->>'internal_vendor'/);
 assert.match(phaseA,/public\.admin_order_ledger_page\(0,100\)/);
 assert.match(phaseA,/public\.admin_order_image_refs_page\(0,100\)/);
 assert.match(phaseA,/IF item->>'purchase_cost'<>'40'/);
 assert.match(phaseA,/RESET ROLE;/);
 assert.match(phaseA,/JWT is synthetic, not signed HTTP/);
});

test('Stage77 release notes distinguish actual PG ROLE/RLS from real signed Supabase/PostgREST JWT',()=>{
 const notes=read('../docs/stage77-production-role-matrix-and-phase-a-rehearsal.md');
 for(const phrase of ['NOT RELEASE-READY','Production unchanged','Phase A','Phase B',
    'real PostgreSQL','signed JWT','full-schema Supabase','no paid staging',
    'old browser tabs','61','11']) {
   assert.ok(notes.includes(phrase),'Stage77 missing warning: '+phrase);
 }
});
