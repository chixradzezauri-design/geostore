import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,readdirSync } from 'node:fs';
import { verifyStage75 } from '../scripts/stage75LocalHistoryReconcile.mjs';

const json=file=>JSON.parse(readFileSync(new URL('../release/'+file,import.meta.url),'utf8'));
const manifest=json('stage75-reviewed-local-renames.json');
const baseline=json('stage72-production-history-baseline.json');
const digests=json('stage73-production-sql-digests.json');
const files=readdirSync(new URL('../supabase/migrations/',import.meta.url)).filter(x=>x.endsWith('.sql'));
const source=file=>readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8');
const input=()=>({manifest,baseline,digests,files,source});

test('Stage75 preserves unchanged SQL in 21 locally renamed migrations while reducing drift',()=>{
  const outcome=verifyStage75(input());
  assert.equal(outcome.unchangedSqlBlobRenames,21);
  assert.equal(outcome.exactVersionAndName,101);
  assert.equal(outcome.remainingDifferentTimestamp,11);
  assert.equal(outcome.remainingOldUnmatched,7);
  assert.equal(outcome.unappliedReleaseMigrations,4);
  assert.equal(outcome.remainingRemoteOnlyVersions,34);
  assert.equal(outcome.sourceChanged,false);
  assert.equal(outcome.result,'PARTIAL_LOCAL_RECONCILIATION_ONLY_NOT_RELEASE_APPROVAL');
});

test('Stage75 rejects any old filename reintroduced, renamed file removed, and duplicate evidence',()=>{
  assert.throws(()=>verifyStage75({...input(),files:[...files,manifest.renames[0].before]}),
    /expected 123 unique local SQL files/);
  assert.throws(()=>verifyStage75({...input(),files:files.filter(x=>x!==manifest.renames[0].after)}),
    /expected 123 unique local SQL files/);
  const bad={...manifest,renames:[manifest.renames[0],...manifest.renames.slice(0,-1)]};
  assert.throws(()=>verifyStage75({...input(),manifest:bad}),/invalid or duplicate historical mapping/);
});

test('Stage75 refuses SQL byte mutation or matching remote source checksum drift',()=>{
  const original=manifest.renames[0];
  assert.throws(()=>verifyStage75({...input(),source:file=>file===original.after?source(file)+' -- mutated':source(file)}),
    /renamed SQL bytes changed/);
  const broken={...manifest,renames:manifest.renames.map((x,i)=>i===0?{...x,storedSqlMd5:'f'.repeat(32)}:x)};
  assert.throws(()=>verifyStage75({...input(),manifest:broken}),/applied SQL metadata mismatch/);
});

test('Stage75 reports unmerged release prerequisites, no Production migration repair or automatic deploy',()=>{
  const doc=readFileSync(new URL('../docs/stage75-local-history-reconciliation.md',import.meta.url),'utf8');
  const script=readFileSync(new URL('../scripts/stage75LocalHistoryReconcile.mjs',import.meta.url),'utf8');
  const ci=readFileSync(new URL('../.github/workflows/stage52-isolated-postgres.yml',import.meta.url),'utf8');
  for(const word of ['NOT RELEASE-READY','21','101','11','22','34','Phase A','Phase B',
    'full-schema Supabase','JWT','Production unchanged','no paid staging']){
    assert.ok(doc.includes(word),'Stage75 release notes missing '+word);
  }
  assert.match(ci,/node scripts\/stage75LocalHistoryReconcile\.mjs --verify-local-renames/);
  assert.doesNotMatch(script,/execute_sql|apply_migration|supabase db push|fetch\(|service_role_key|SUPABASE_ACCESS_TOKEN/);
});
