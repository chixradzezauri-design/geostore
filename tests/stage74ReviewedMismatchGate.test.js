import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {executableTokens,executableTokenEquality} from '../scripts/stage74SqlExecutableTokenizer.mjs';
import {verifyStage74} from '../scripts/stage74ReviewedMismatchGate.mjs';
const read=x=>JSON.parse(readFileSync(new URL('../release/'+x,import.meta.url),'utf8'));
const evidence=read('stage74-reviewed-sql-evidence.json');
const baseline=read('stage72-production-history-baseline.json');
const digests=read('stage73-production-sql-digests.json');
const files=readdirSync(new URL('../supabase/migrations/',import.meta.url)).filter(x=>x.endsWith('.sql'));
const source=x=>readFileSync(new URL('../supabase/migrations/'+x,import.meta.url),'utf8');
const ctx=()=>({evidence,baseline,digests,files,source});

test('Stage74 one-time read-only review identifies 10 lexical matches, one ACL/transaction difference',()=>{
 const r=verifyStage74(ctx());
 assert.equal(r.oneTimeReadOnlyTokenMatched,10);
 assert.equal(r.realAclAndTransactionDelta,1);
 assert.equal(r.status,'BLOCKED_AUTHENTICATED_FULL_SCHEMA_STAGING_REQUIRED');
});
test('Stage74 SQL scanner respects comments vs literal content and PL/pgSQL dollar bodies',()=>{
 assert.ok(executableTokenEquality(
  'DO $body$ BEGIN -- comment\n RETURN 1; END; $body$;',
  'DO $body$ BEGIN /* comment */ RETURN 1 ; END ; $body$ ;'
 ));
 assert.ok(executableTokenEquality("SELECT 'literal -- comment', '/* value */';", "SELECT 'literal -- comment' , '/* value */' ;"));
 assert.ok(!executableTokenEquality("DO $$ BEGIN RETURN 1; END $$;","DO $$ BEGIN RETURN 2; END $$;"));
 assert.ok(!executableTokenEquality("GRANT EXECUTE ON FUNCTION x() TO authenticated;","GRANT EXECUTE ON FUNCTION x() TO authenticated, service_role;"));
 assert.throws(()=>executableTokens('SELECT /* missing'),/unclosed comment/);
 assert.throws(()=>executableTokens('DO $tag$ BEGIN;'),/unclosed dollar body/);
});
test('Stage74 rejects modified sources, changed applied SQL MD5, and ACL evidence tampering',()=>{
 assert.throws(()=>verifyStage74({...ctx(),source:x=>source(x)+(x===evidence.items[0].file?'\n-- changed':'')}),/source\/blob\/digest\/token drift/);
 const bad={...evidence,items:evidence.items.map((x,i)=>i===0?{...x,remoteMd5:'0'.repeat(32)}:x)};
 assert.throws(()=>verifyStage74({...ctx(),evidence:bad}),/source\/blob\/digest\/token drift/);
 const grant={...evidence,items:evidence.items.map(x=>x.file.startsWith('20261119090000')?{...x,classification:'TOKENS_EQUAL_IGNORING_COMMENTS_AND_SPACES'}:x)};
 assert.throws(()=>verifyStage74({...ctx(),evidence:grant}),/mismatch counts/);
});
test('Stage74 remains a no-cost non-deploying evidence gate',()=>{
 const workflow=readFileSync(new URL('../.github/workflows/stage52-isolated-postgres.yml',import.meta.url),'utf8');
 const doc=readFileSync(new URL('../docs/stage74-migration-sql-token-review.md',import.meta.url),'utf8');
 assert.match(workflow,/node scripts\/stage74ReviewedMismatchGate\.mjs --verify-frozen/);
 for(const key of ['NOT RELEASE-READY','10 of the 11','service_role','Phase A','Phase B',
 'full-schema Supabase','JWT','no paid staging','Production unchanged','SQL text was not committed']){
  assert.ok(doc.includes(key),'Documentation missing: '+key);
 }
});
