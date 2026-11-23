import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validateStage86} from '../scripts/stage86MissingHistoryProvenanceGate.mjs';
const read=path=>JSON.parse(readFileSync(new URL('../release/'+path,import.meta.url),'utf8'));
const origin=read('stage86-production-only-migration-origin.json');
const risk=read('stage86-historical-sql-risk-disposition.json');
const review=read('stage76-existing-version-sql-divergence.json');
const history=read('stage72-production-history-baseline.json');
const clone=o=>structuredClone(o);
test('Stage86 resolves missing Git source provenance to exact already-applied Production version',()=>{
 const v=validateStage86();
 assert.match(v.result,/RELEASE_BLOCKED/);
 assert.equal(v.origin.version,'20261110100653');
 assert.equal(v.origin.name,'hide_test_products_from_storefront');
 assert.equal(v.origin.trackedInGit,false);
 assert.equal(v.historicalSourceDifferences,11);
 assert.deepEqual(v.riskCounts,{HIGH:9,MEDIUM:1,LOW:1});
 assert.equal(v.phaseA,3);assert.equal(v.phaseB,1);
});
test('Stage86 prevents applying a remote-only migration source twice, or suppressing changed Production function',()=>{
 const data=clone(origin);
 data.origin.appliedSqlMd5='0'.repeat(32);
 assert.throws(()=>validateStage86({frozen:data}),/Production migration origin/);
 const changed=clone(origin);changed.origin.definitionMd5='1'.repeat(32);
 assert.throws(()=>validateStage86({frozen:changed}),/Production migration origin/);
 const changedTrigger=clone(origin);changedTrigger.origin.triggerMd5='2'.repeat(32);
 assert.throws(()=>validateStage86({frozen:changedTrigger}),/Production migration origin/);
 const other=clone(history);other.appliedMigrations=other.appliedMigrations.filter(x=>x.version!=='20261110100653');
 assert.throws(()=>validateStage86({applied:other}),/baseline differs|migration history|metadata release gate/);
});
test('Stage86 never silently downgrades or deletes 9 HIGH, 1 MEDIUM, 1 LOW historical divergences',()=>{
 const downgraded=clone(risk);downgraded.riskRows[0].severity='LOW';
 assert.throws(()=>validateStage86({risk:downgraded}),/source, severity, or non-replay decision/);
 const erased=clone(risk);erased.riskRows.pop();
 assert.throws(()=>validateStage86({risk:erased}),/11 source-different/);
 const edited=clone(risk);edited.riskRows[4].status='APPROVED_TO_REPLAY';
 assert.throws(()=>validateStage86({risk:edited}),/source, severity, or non-replay decision/);
 const changedReview=clone(review);
 changedReview.entries.find(x=>x.classification==='EXECUTABLE_TOKEN_DIFFERENCE').risk='MESSAGE_TEXT';
 assert.throws(()=>validateStage86({previous:changedReview}),/Stage82|historical|source, severity/);
});
test('Stage86 supports fresh read-only catalog and migration version metadata without key-order dependence',()=>{
 const reverse=v=>Array.isArray(v)?v.map(reverse):
   v&&typeof v==='object'?Object.fromEntries(Object.entries(v).reverse().map(([k,x])=>[k,reverse(x)])):v;
 const scratch=mkdtempSync(join(tmpdir(),'geostore-stage86-'));
 try{
  const fresh=join(scratch,'origin.json'),versions=join(scratch,'migrations.json');
  writeFileSync(fresh,JSON.stringify([{snapshot:JSON.stringify(reverse(origin.origin))}]));
  writeFileSync(versions,JSON.stringify({migrations:history.appliedMigrations}));
  const path=fileURLToPath(new URL('../scripts/stage86MissingHistoryProvenanceGate.mjs',import.meta.url));
  const output=execFileSync(process.execPath,[path,
   '--fresh-origin-json',fresh,'--fresh-migrations-json',versions],{encoding:'utf8',timeout:15000});
  assert.match(output,/PROVENANCE_FOUND_REPLAY_UNSAFE/);
  const changed=clone(origin.origin);changed.statementCount=2;
  assert.throws(()=>validateStage86({freshOrigin:{snapshot:changed}}),/fresh read-only Production migration provenance differs/);
  const drift=clone(history.appliedMigrations);drift[0].name+='-unreviewed';
  assert.throws(()=>validateStage86({freshMigrations:drift}),/fresh Production 135-version migration history changed/);
 }finally{rmSync(scratch,{recursive:true,force:true})}
});
test('Stage86 metadata query is SELECT only and CI has no deploy permissions',()=>{
 const query=readFileSync(new URL('../release/stage86-read-only-origin-query.sql',import.meta.url),'utf8');
 const script=readFileSync(new URL('../scripts/stage86MissingHistoryProvenanceGate.mjs',import.meta.url),'utf8');
 const workflow=readFileSync(new URL('../.github/workflows/stage52-isolated-postgres.yml',import.meta.url),'utf8');
 const doc=readFileSync(new URL('../docs/stage86-historical-source-provenance-and-release-blockers.md',import.meta.url),'utf8');
 assert.match(query,/SELECT jsonb_build_object/);
 assert.match(query,/supabase_migrations\.schema_migrations/);
 assert.doesNotMatch(query,/\b(?:INSERT INTO|UPDATE public|DELETE FROM|ALTER TABLE|DROP TABLE|CREATE TABLE|REPAIR)\b/i);
 assert.doesNotMatch(script,/SUPABASE_ACCESS_TOKEN|supabase db push|apply_migration|https?:\/\//);
 assert.match(workflow,/stage86MissingHistoryProvenanceGate.mjs --verify-pinned/);
 for(const term of ['NOT RELEASE-READY','Production unchanged','no paid staging',
  'Phase A','Phase B','full-schema','135','11','9 HIGH','20261110100653','replay'])
 assert.ok(doc.includes(term),'Missing operator release warning: '+term);
});
