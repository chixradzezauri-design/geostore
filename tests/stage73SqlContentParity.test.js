import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { sourceMd5, analyzeStoredSqlParity } from '../scripts/stage73SqlContentParity.mjs';

const baseline=JSON.parse(readFileSync(new URL('../release/stage72-production-history-baseline.json',import.meta.url),'utf8'));
const snapshot=JSON.parse(readFileSync(new URL('../release/stage73-production-sql-digests.json',import.meta.url),'utf8'));
const dir=new URL('../supabase/migrations/',import.meta.url);
const input=()=>({baseline,digestSnapshot:snapshot,
  localFiles:readdirSync(dir).filter(x=>x.endsWith('.sql')),
  source:filename=>readFileSync(new URL('../supabase/migrations/'+filename,import.meta.url),'utf8')
});

test('Stage73 captures applied SQL checksums, not SQL content or private row data',()=>{
  assert.equal(snapshot.records.length,135);
  assert.equal(snapshot.parentHistoryMd5,baseline.remoteHistoryMd5);
  for(const r of snapshot.records){
    assert.match(r.sql_md5,/^[0-9a-f]{32}$/);
    assert.equal(r.chunks,1);
    assert.ok(r.sql_bytes>0);
    assert.deepEqual(Object.keys(r),['version','name','sql_md5','sql_bytes','chunks']);
  }
  assert.equal(sourceMd5(''), 'd41d8cd98f00b204e9800998ecf8427e');
});

test('Stage73 classifies 112 source-linked applied migrations exactly; never approves deployment',()=>{
  const r=analyzeStoredSqlParity(input());
  assert.equal(r.baselineApplied,135);
  assert.equal(r.comparedLinkedSqlFiles,112);
  assert.equal(r.status,'BLOCKED_UNTIL_MANUAL_SQL_DIFF_REVIEW_AND_FULL_SCHEMA_JWT_STAGING');
  assert.equal(r.totals.exactVersionExactSql+r.totals.exactVersionDifferentSql,80);
  assert.equal(r.totals.differentVersionExactSql+r.totals.differentVersionDifferentSql,32);
  assert.equal(r.stillBlockedOlderFiles,7);
  assert.equal(r.stillPendingSourcePinnedPhaseA,3);
  assert.equal(r.stillPendingSourcePinnedPhaseB,1);
});

test('Stage73 fails when newly applied remote statement digest silently changes',()=>{
  const tampered=snapshot.records.map((x,i)=>i===0?{...x,sql_md5:'ffffffffffffffffffffffffffffffff'}:x);
  assert.throws(()=>analyzeStoredSqlParity({...input(),currentDigests:tampered}),/live applied SQL fingerprint changed/);
  assert.doesNotThrow(()=>analyzeStoredSqlParity({...input(),currentDigests:snapshot.records}));
});

test('Stage73 protects recorded history and marks source drift as different SQL, never semantic equality',()=>{
  const invalid=snapshot.records.map((x,i)=>i===0?{...x,name:'renamed'}:x);
  assert.throws(()=>analyzeStoredSqlParity({...input(),digestSnapshot:{...snapshot,records:invalid}}),/invalid applied SQL digest or version/);
  const badSource=filename=>input().source(filename)+(filename.endsWith('.sql')?' -- tampered':'');
  assert.throws(()=>analyzeStoredSqlParity({...input(),source:badSource}),/reviewed migration source SHA changed/);
});

test('Stage73 uses existing isolated PostgreSQL CI and no credentials/remote SQL',()=>{
  const ci=readFileSync(new URL('../.github/workflows/stage52-isolated-postgres.yml',import.meta.url),'utf8');
  const source=readFileSync(new URL('../scripts/stage73SqlContentParity.mjs',import.meta.url),'utf8');
  const doc=readFileSync(new URL('../docs/stage73-applied-sql-content-parity.md',import.meta.url),'utf8');
  assert.match(ci,/node scripts\/stage73SqlContentParity\.mjs --verify-frozen-digests/);
  assert.doesNotMatch(source,/fetch\(|execute_sql|apply_migration|service_role|SUPABASE_ACCESS_TOKEN/);
  for(const phrase of ['NOT RELEASE-READY','135', '80', '32',
    'PostgreSQL','no paid staging','Production unchanged','Phase A','Phase B','byte equality']) {
      assert.ok(doc.includes(phrase),'Doc missing '+phrase);
  }
});
