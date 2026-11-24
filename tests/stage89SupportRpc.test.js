import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Stage89 uses ten current support RPC fingerprints from Stage82 and fixture-only definitions',()=>{
 const rows=JSON.parse(read('release/stage89-support-rpc-fingerprints.json'));
 const base=JSON.parse(read('release/stage82-live-effective-schema-surface.json')).surface.functions;
 const ddl=read('tests/stage78-supabase/stage89-live-support-rpcs.sql');
 assert.equal(rows.length,10);
 assert.equal(new Set(rows.map(x=>x.signature)).size,10);
 for(const row of rows){
  const f=base.find(x=>x.signature===row.signature);
  assert.ok(f);assert.equal(row.md5,f.definition_md5);
  assert.equal(row.anon,f.anon_execute);assert.equal(row.auth,f.authenticated_execute);
  assert.ok(ddl.includes('CREATE OR REPLACE FUNCTION '+row.schema+'.'+row.name+'('));
 }
 assert.match(ddl,/TEST FIXTURE ONLY/);
});
test('Stage89 real support RPC check runs after Stage88, only in disposable local CI',()=>{
 const wf=read('.github/workflows/stage78-free-supabase-auth-postgrest.yml');
 const start=wf.indexOf('node "$GITHUB_WORKSPACE/scripts/stage88SignedSupportStaffHttp.mjs"');
 const setup=wf.indexOf('-f stage89-support-rpc-fixture.sql',start);
 const run=wf.indexOf('node "$GITHUB_WORKSPACE/scripts/stage89SupportRpcHttp.mjs"',setup);
 assert.ok(start>0&&setup>start&&run>setup);
 const script=read('scripts/stage89SupportRpcHttp.mjs');
 for(const term of ['localhost','42501','idempotent_replay','mark_support_ticket_messages_read','is_active:false','access_token_hash','get_my_support_tickets_page'])assert.ok(script.includes(term),term);
});
test('Stage89 release checklist keeps only four pending migrations and explicit cutover conditions',()=>{
 const doc=read('docs/stage89-release-closure.md');
 for(const term of ['NOT RELEASE-READY','Production unchanged','no paid staging','Phase A','Phase B','full-schema','rollback','old tabs','no historical replay'])assert.ok(doc.includes(term),term);
});
