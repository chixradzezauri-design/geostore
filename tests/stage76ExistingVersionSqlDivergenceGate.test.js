import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {verifyStage76} from '../scripts/stage76ExistingVersionSqlDivergenceGate.mjs';
const json=n=>JSON.parse(readFileSync(new URL('../release/'+n,import.meta.url),'utf8'));
const review=json('stage76-existing-version-sql-divergence.json');
const baseline=json('stage72-production-history-baseline.json');
const digests=json('stage73-production-sql-digests.json');
const stage75=json('stage75-reviewed-local-renames.json');
const files=readdirSync(new URL('../supabase/migrations/',import.meta.url)).filter(x=>x.endsWith('.sql'));
const source=n=>readFileSync(new URL('../supabase/migrations/'+n,import.meta.url),'utf8');
const args=()=>({review,baseline,digests,stage75,files,source});

test('Stage76 freezes all 61 version-matched/different-MD5 source reviews and never authorizes release',()=>{
 const o=verifyStage76(args());
 assert.equal(o.comparedExactlyVersionMatchedFiles,61);
 assert.equal(o.lexicalTokenSameExceptCommentsAndSpaces,50);
 assert.equal(o.executableTokenDifferences,11);
 assert.equal(o.criticalOrBehavioralFiles.length,11);
 assert.equal(o.remainingDifferentTimestamp,11);
 assert.equal(o.legacyUnappliedOrUnsafe,7);
 assert.equal(o.phaseAMigrations,3);
 assert.equal(o.phaseBMigrations,1);
 assert.equal(o.outcome,'NOT_RELEASE_READY_HISTORY_RECONCILIATION_STILL_BLOCKED');
});

test('Stage76 forbids silently reclassifying finance/auth/support/checkout-sensitive SQL as cosmetic',()=>{
 for(const name of [
  '20261103151704_use_amr_for_admin_order_reactivation.sql',
  '20261107115218_persist_checkout_addons_server_pricing.sql',
  '20261107130302_add_order_status_notifications.sql',
  '20261109102221_fix_support_ticket_message_lookup.sql',
  '20261109102338_harden_support_ticket_rpc_wrappers.sql',
 ]) assert.equal(review.entries.find(x=>x.file===name)?.classification,'EXECUTABLE_TOKEN_DIFFERENCE',name);
 const mutated={...review,entries:review.entries.map(x=>x.file===review.entries[0].file?
    {...x,classification:'EXECUTABLE_TOKENS_SAME_EXCEPT_COMMENTS_WHITESPACE'}:x)};
 assert.throws(()=>verifyStage76({...args(),review:mutated}),/unreviewed executable-code difference/);
});

test('Stage76 detects changed historical source bytes and applied SQL digest records',()=>{
 const first=review.entries[0];
 assert.throws(()=>verifyStage76({...args(),source:n=>n===first.file?source(n)+' -- drift':source(n)}),
  /local Git source or applied-SQL digest modified/);
 const r={...review,entries:review.entries.map(x=>x===first?
    {...x,appliedSqlMd5:'0'.repeat(32)}:x)};
 assert.throws(()=>verifyStage76({...args(),review:r}),/local Git source or applied-SQL digest modified/);
});

test('Stage76 classification is one-time review evidence, not a live full-schema security test',()=>{
 const doc=readFileSync(new URL('../docs/stage76-same-version-sql-divergence-review.md',import.meta.url),'utf8');
 const script=readFileSync(new URL('../scripts/stage76ExistingVersionSqlDivergenceGate.mjs',import.meta.url),'utf8');
 const ci=readFileSync(new URL('../.github/workflows/stage52-isolated-postgres.yml',import.meta.url),'utf8');
 for(const phrase of ['NOT RELEASE-READY','61','50','11',
   'SECURITY DEFINER','300','400','private','full-schema Supabase',
   'JWT','Production unchanged','no paid staging','Phase A','Phase B']) {
   assert.ok(doc.includes(phrase),'Missing security/release warning '+phrase);
 }
 assert.match(ci,/node scripts\/stage76ExistingVersionSqlDivergenceGate\.mjs --verify-frozen-review/);
 assert.doesNotMatch(script,/execute_sql|apply_migration|supabase db push|fetch\(|SUPABASE_ACCESS_TOKEN/);
});
