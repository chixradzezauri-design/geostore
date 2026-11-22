import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { gitBlobSha, migrationHistoryMd5, reviewReleaseBaseline } from '../scripts/stage72ReconciledReleaseGate.mjs';
import { PENDING_STAGE_MIGRATIONS } from '../scripts/stage64MigrationHistoryAudit.mjs';

const base=JSON.parse(readFileSync(new URL('../release/stage72-production-history-baseline.json', import.meta.url),'utf8'));
const dir=new URL('../supabase/migrations/',import.meta.url);
const input=()=>({
  files:readdirSync(dir).filter(x=>x.endsWith('.sql')),
  source:file=>readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8')
});

test('Stage72 freezes 135 real metadata-only Supabase migrations; disallows claim of release readiness',()=>{
  assert.equal(base.appliedMigrations.length,135);
  assert.equal(migrationHistoryMd5(base.appliedMigrations),'4f09258df9fbd7b415cc2d3dc5ffbe6f');
  const result=reviewReleaseBaseline(base,input());
  assert.equal(result.outcome,'BLOCKED_PENDING_FULL_SCHEMA_STAGING_AND_MANUAL_SQL_HISTORY_RECONCILIATION');
  assert.equal(result.counts.exactVersionAndName,80);
  assert.equal(result.counts.sameNameDifferentVersion,32);
  assert.equal(result.counts.oldUnmatched,7);
  assert.equal(result.counts.pending,4);
  assert.equal(result.remoteOnlyVersions,55);
  assert.equal(result.duplicateLocalLogicalNames.length,4);
  assert.equal(result.PhaseA.length,3);
  assert.equal(result.PhaseB.length,1);
  assert.deepEqual([...result.PhaseA,...result.PhaseB].map(x=>x.file),PENDING_STAGE_MIGRATIONS);
});

test('Stage72 binds all four pending SQL file bytes to reviewed Git blob SHAs',()=>{
  for(const phase of base.phasedSources){
    const content=input().source(phase.file);
    assert.equal(gitBlobSha(content),phase.sha,phase.file);
  }
  assert.throws(()=>reviewReleaseBaseline(base,{...input(),source:file=>{
    const original=input().source(file);
    return file===PENDING_STAGE_MIGRATIONS[0]?original+'\n-- drift\n':original;
  }}),/reviewed migration source SHA changed/);
});

test('Stage72 rejects new live migration, renamed applied history and missing baseline row',()=>{
  for(const change of [
    [...base.appliedMigrations,{version:'20261123000000',name:'another_admin_change'}],
    base.appliedMigrations.map((m,i)=>i===4?{...m,name:'mismatched_name'}:m),
    base.appliedMigrations.slice(0,-1)
  ]) assert.throws(()=>reviewReleaseBaseline(base,{...input(),currentRemote:change}),/live production migration history changed/);
  assert.doesNotThrow(()=>reviewReleaseBaseline(base,{...input(),currentRemote:{migrations:base.appliedMigrations}}));
});

test('Stage72 rejects unexpected old SQL and changes to strict source/version buckets',()=>{
  const x=input();
  assert.throws(()=>reviewReleaseBaseline(base,{...x,files:[...x.files,'20261108000000_unreviewed_trigger.sql']}),/migration bucket changed/);
  assert.throws(()=>reviewReleaseBaseline(base,{...x,files:x.files.filter(n=>n!==PENDING_STAGE_MIGRATIONS[3])}),/migration bucket changed/);
});

test('Stage72 cannot be mistaken for full-schema Supabase authenticated release approval',()=>{
  const doc=readFileSync(new URL('../docs/stage72-migration-release-manifest.md',import.meta.url),'utf8');
  const script=readFileSync(new URL('../scripts/stage72ReconciledReleaseGate.mjs',import.meta.url),'utf8');
  const ci=readFileSync(new URL('../.github/workflows/stage52-isolated-postgres.yml',import.meta.url),'utf8');
  for(const term of ['NOT RELEASE-READY','43 local versions','55 remote-only',
    'four pinned SQL files','Phase A','Phase B','full-schema Supabase','JWT',
    'Production unchanged','no paid staging']) assert.ok(doc.includes(term),'Missing: '+term);
  assert.match(ci,/node scripts\/stage72ReconciledReleaseGate\.mjs --verify-pinned/);
  assert.doesNotMatch(script,/supabase db push|apply_migration|execute_sql|SupabaseClient|fetch\(/);
  assert.match(script,/BLOCKED_PENDING_FULL_SCHEMA_STAGING_AND_MANUAL_SQL_HISTORY_RECONCILIATION/);
});
