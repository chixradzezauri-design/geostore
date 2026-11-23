import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateStage81} from '../scripts/stage81LiveSchemaGate.mjs';
const load=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const manifest=load('../release/stage81-production-schema-baseline.json');
const history=load('../release/stage72-production-history-baseline.json');
const copy=()=>structuredClone(manifest);
test('Stage81 actual read-only live schema snapshot matches critical pre-Phase-A contract',()=>{
 const report=validateStage81(manifest,history);
 assert.match(report.outcome,/RELEASE_STILL_BLOCKED/);
 assert.equal(report.historicalMigrations,135);
 assert.equal(report.criticalTables,8);
 assert.equal(report.orderTriggers,8);
 assert.equal(report.productTriggers,3);
});
test('Stage81 refuses migration history drift and a changed fresh catalog',()=>{
 const change=copy();
 change.catalog.rpcs.find(x=>x.signature==='private.create_order_with_stock(jsonb)')
  .definition_md5='f'.repeat(32);
 assert.throws(()=>validateStage81(manifest,history,change.catalog,history.appliedMigrations),
  /fresh live catalog differs/);
 const migrations=structuredClone(history.appliedMigrations);
 migrations[0].name+='-drift';
 assert.throws(()=>validateStage81(manifest,history,manifest.catalog,migrations),
  /fresh applied migration history differs/);
});
test('Stage81 refuses missing real order trigger, malformed RPC grants or finance ACL drift',()=>{
 for(const mutate of [
  d=>{d.catalog.order_triggers[0].enabled='D'},
  d=>{d.catalog.acl.authenticated_order_items_read=false},
  d=>{d.catalog.rpcs.find(x=>x.signature==='private.create_order_with_stock(jsonb)').security_definer=false},
  d=>{d.catalog.tables.find(x=>x.name==='public.orders').rls=false},
  d=>{d.catalog.orders_columns.find(x=>x.name==='items').type='text'},
  d=>{d.catalog.rpcs.find(x=>x.signature==='public.admin_order_ledger_page(integer,integer)').exists=true}
 ]){
  const d=copy();mutate(d);
  assert.throws(()=>validateStage81(d,history),/Stage81 release preflight BLOCKED/);
 }
});
test('Stage81 is strictly read-only and always identifies unverified release requirements',()=>{
 const q=readFileSync(new URL('../release/stage81-read-only-schema-query.sql',import.meta.url),'utf8');
 assert.match(q,/SELECT jsonb_build_object/);
 assert.doesNotMatch(q,/\b(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DROP|GRANT|REVOKE|CREATE\s+TABLE)\b\s+(?:ON|FROM|INTO|TABLE|FUNCTION|public|private)/i);
 const notes=readFileSync(new URL('../docs/stage81-frozen-live-schema-release-gate.md',import.meta.url),'utf8');
 for(const phrase of ['NOT RELEASE-READY','Production unchanged','full-schema',
  'Phase A','Phase B','no paid staging','historical','fresh'])
 assert.ok(notes.includes(phrase),'Missing safety note: '+phrase);
});

test('Stage81 fresh CLI accepts both read-only exports, independent of JSON object key order',async()=>{
 const {mkdtempSync,writeFileSync,rmSync}=await import('node:fs');
 const {join}=await import('node:path');
 const {tmpdir}=await import('node:os');
 const {execFileSync}=await import('node:child_process');
 const {fileURLToPath}=await import('node:url');
 const d=mkdtempSync(join(tmpdir(),'geostore-stage81-'));
 try{
  const catalogFile=join(d,'catalog.json'),migrationFile=join(d,'migrations.json');
  const reverse=val=>Array.isArray(val)?val.map(reverse):
   (val&&typeof val==='object'?
    Object.fromEntries(Object.keys(val).reverse().map(k=>[k,reverse(val[k])])):val);
  writeFileSync(catalogFile,JSON.stringify({snapshot:reverse(manifest.catalog)}));
  writeFileSync(migrationFile,JSON.stringify({migrations:history.appliedMigrations}));
  const result=execFileSync(process.execPath,[
   fileURLToPath(new URL('../scripts/stage81LiveSchemaGate.mjs',import.meta.url)),
   '--fresh-catalog-json',catalogFile,'--fresh-migrations-json',migrationFile
  ],{encoding:'utf8',timeout:10000});
  assert.match(result,/RELEASE_STILL_BLOCKED/);
 }finally{rmSync(d,{recursive:true,force:true})}
});
