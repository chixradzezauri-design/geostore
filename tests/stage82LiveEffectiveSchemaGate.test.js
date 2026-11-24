import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {verifyStage82} from '../scripts/stage82LiveEffectiveSchemaGate.mjs';
const load=n=>JSON.parse(readFileSync(new URL('../release/'+n,import.meta.url),'utf8'));
const snapshot=load('stage82-live-effective-schema-surface.json');
const history=load('stage72-production-history-baseline.json');
const review=load('stage76-existing-version-sql-divergence.json');
const copy=()=>structuredClone(snapshot);
test('Stage82 authenticates live functional metadata and historical risk provenance',()=>{
 const v=verifyStage82();
 assert.match(v.result,/RELEASE_STILL_BLOCKED/);
 assert.equal(v.functions,52);assert.equal(v.publicInvokerFunctions,23);
 assert.equal(v.privateFunctions,29);assert.equal(v.enabledOrderAndProductTriggers,11);
 assert.equal(v.validatedTableConstraints,55);assert.equal(v.historicalExecutableDifferences,11);
});
test('Stage82 refuses removed or modified 11 historical executable SQL discrepancies',()=>{
 const a=copy();a.highRiskHistoricalMismatches.pop();
 assert.throws(()=>verifyStage82({frozen:a}),/historical SQL risk coverage changed/);
 const b={...review,entries:review.entries.filter(x=>x.classification!=='EXECUTABLE_TOKEN_DIFFERENCE')};
 assert.throws(()=>verifyStage82({divergences:b}),/historical SQL risk coverage changed/);
});
test('Stage82 fails closed on public definer, anonymous admin, stock and support metadata drift',()=>{
 for(const change of [
  d=>{d.surface.functions.find(x=>x.signature.startsWith('public.create_order_with_stock(')).definer=true},
  d=>{d.surface.functions.find(x=>x.signature.startsWith('public.admin_save_order_note(')).anon_execute=true},
  d=>{d.surface.functions.find(x=>x.signature.startsWith('private.get_support_ticket_messages(')).locked_search_path=false},
  d=>{d.surface.functions.find(x=>x.signature.startsWith('private.create_order_with_stock(')).definition_md5='0'.repeat(32)},
  d=>{d.surface.triggers.find(x=>x.name==='zz_sync_size_color_aggregate_stock').enabled='D'},
  d=>{d.surface.constraints.find(x=>x.name==='products_stock_nonnegative_check').validated=false},
  d=>{d.surface.constraints.find(x=>x.name==='support_tickets_access_token_hash_check').definition_md5='x'},
  d=>{d.surface.functions=d.surface.functions.filter(x=>!x.signature.includes('p_expected_updated_at'))}
 ]){
  const d=copy();change(d);
  assert.throws(()=>verifyStage82({frozen:d}),/Stage82 metadata release gate BLOCKED/);
 }
});
test('Stage82 paired fresh exports survive JSON object ordering and reject stale remote metadata',()=>{
 const reverse=v=>Array.isArray(v)?v.map(reverse):
  v&&typeof v==='object'?Object.fromEntries(Object.entries(v).reverse().map(([k,x])=>[k,reverse(x)])):v;
 const dir=mkdtempSync(join(tmpdir(),'stage82-gate-'));
 try{
  const a=join(dir,'surface.json'),b=join(dir,'history.json');
  writeFileSync(a,JSON.stringify({snapshot:JSON.stringify(reverse(snapshot.surface))}));
  writeFileSync(b,JSON.stringify({migrations:history.appliedMigrations}));
  const cli=execFileSync(process.execPath,[
   fileURLToPath(new URL('../scripts/stage82LiveEffectiveSchemaGate.mjs',import.meta.url)),
   '--fresh-surface-json',a,'--fresh-migrations-json',b
  ],{encoding:'utf8',timeout:10000});
  assert.match(cli,/RELEASE_STILL_BLOCKED/);
  const tampered=structuredClone(snapshot.surface);tampered.triggers[0].definition_md5='0'.repeat(32);
  assert.throws(()=>verifyStage82({freshSurface:{snapshot:tampered}}),/fresh Production surface differs/);
  const old=structuredClone(history.appliedMigrations);old[0].name+='-outdated';
  assert.throws(()=>verifyStage82({freshMigrations:old}),/fresh Production migration history differs/);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('Stage82 CI is metadata-only and no production deployment may be triggered',()=>{
 const q=readFileSync(new URL('../release/stage82-read-only-surface-query.sql',import.meta.url),'utf8');
 const source=readFileSync(new URL('../scripts/stage82LiveEffectiveSchemaGate.mjs',import.meta.url),'utf8');
 const workflow=readFileSync(new URL('../.github/workflows/stage52-isolated-postgres.yml',import.meta.url),'utf8');
 const doc=readFileSync(new URL('../docs/stage82-live-effective-schema-review.md',import.meta.url),'utf8');
 assert.match(q,/SELECT jsonb_build_object/);
 assert.doesNotMatch(q,/\b(?:INSERT INTO|UPDATE public|DELETE FROM|ALTER TABLE|DROP TABLE|CREATE TABLE)\b/i);
 assert.doesNotMatch(source,/SUPABASE_ACCESS_TOKEN|apply_migration|supabase db push|https?:\/\//);
 assert.match(workflow,/stage82LiveEffectiveSchemaGate.mjs --verify-pinned/);
 for(const s of ['NOT RELEASE-READY','Production unchanged','no paid staging','Phase A',
  'Phase B','full-schema','52','55','11','historical','fresh'])
 assert.ok(doc.includes(s),'Missing safety note '+s);
});
