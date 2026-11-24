import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {verifyStage87} from '../scripts/stage87PhaseAPreflightHighRiskGate.mjs';
const read=f=>JSON.parse(readFileSync(new URL('../release/'+f,import.meta.url),'utf8'));
const pre=read('stage87-phase-a-live-preflight.json');
const matrix=read('stage87-high-risk-live-boundary-matrix.json');
const history=read('stage72-production-history-baseline.json');
const clone=x=>structuredClone(x);
test('Stage87 verifies Phase A prerequisites but never approves release or Phase B',()=>{
 const result=verifyStage87();
 assert.match(result.result,/RELEASE_STILL_BLOCKED/);
 assert.equal(result.appliedMigrations,135);
 assert.equal(result.phasedMigrationsApplied,0);
 assert.equal(result.requiredOrderColumns,17);
 assert.equal(result.phaseAFunctionPreconditions,8);
 assert.equal(result.phaseAAdditiveAdminRpcNotYetApplied,2);
 assert.equal(result.currentHighRiskFunctionsVerified,18);
 assert.equal(result.highRiskHistoricalSqlUnreconciled,9);
 assert.equal(result.oldRawCostSnapshotAccessibleToAuthenticated,true);
 assert.equal(result.phaseAPlanned,3); assert.equal(result.phaseBPlanned,1);
});
test('Stage87 fails closed for Phase A columns, applied migrations and raw sensitive snapshot access',()=>{
 let copy=clone(pre);copy.preflight.matchedOrdersColumns=16;
 assert.throws(()=>verifyStage87({live:copy}),/17 Phase A order projection/);
 copy=clone(pre);copy.preflight.phasedAppliedCount=1;
 assert.throws(()=>verifyStage87({live:copy}),/Phase A or Phase B/);
 copy=clone(pre);copy.preflight.ordersAuthenticatedCostSnapshotSelect.items=false;
 assert.throws(()=>verifyStage87({live:copy}),/legacy raw finance-bearing/);
 copy=clone(pre);copy.preflight.ordersRls=false;
 assert.throws(()=>verifyStage87({live:copy}),/orders RLS/);
});
test('Stage87 refuses changed owner/staff/checkout function authority and premature Phase A RPC presence',()=>{
 let copy=clone(pre);
 const checkout=copy.preflight.functions.find(f=>f.signature==='private.create_order_with_stock(jsonb)');
 checkout.security_definer=false;
 assert.throws(()=>verifyStage87({live:copy}),/Phase A existing RPC/);
 copy=clone(pre);
 const wrapper=copy.preflight.functions.find(f=>f.signature==='public.create_order_with_stock(jsonb)');
 wrapper.anon_execute=false;
 assert.throws(()=>verifyStage87({live:copy}),/Phase A existing RPC/);
 copy=clone(pre);
 const bridge=copy.preflight.functions.find(f=>f.signature==='public.admin_order_ledger_page(integer,integer)');
 bridge.exists=true;
 assert.throws(()=>verifyStage87({live:copy}),/additive Phase A admin order projection RPC/);
});
test('Stage87 verifies all nine different historical SQL files remain HIGH and map to 18 live functions',()=>{
 let copy=clone(matrix);
 copy.nineHighRiskHistoricalSources[0].replayStatus='SAFE_TO_REPLAY';
 assert.throws(()=>verifyStage87({risks:copy}),/HIGH-risk historic SQL/);
 copy=clone(matrix);
 copy.nineHighRiskHistoricalSources.pop();
 assert.throws(()=>verifyStage87({risks:copy}),/not all nine/);
 copy=clone(matrix);
 copy.liveFunctions[0].md5='a'.repeat(32);
 assert.throws(()=>verifyStage87({risks:copy}),/current Production checkout/);
 copy=clone(matrix);
 copy.nineHighRiskHistoricalSources[3].currentFunctions.pop();
 assert.throws(()=>verifyStage87({risks:copy}),/nine historical high-risk SQL files no longer cover|unmapped live/);
});
test('Stage87 fresh read-only metadata can be compared without accessing Production from tests',()=>{
 const temp=mkdtempSync(join(tmpdir(),'geostore-stage87-'));
 try{
  const a=join(temp,'phase.json'),b=join(temp,'rpcs.json'),c=join(temp,'migrations.json');
  writeFileSync(a,JSON.stringify([{preflight:JSON.stringify(pre.preflight)}]));
  writeFileSync(b,JSON.stringify([{live_rpcs:JSON.stringify(matrix.liveFunctions)}]));
  writeFileSync(c,JSON.stringify({migrations:history.appliedMigrations}));
  const script=fileURLToPath(new URL('../scripts/stage87PhaseAPreflightHighRiskGate.mjs',import.meta.url));
  const text=execFileSync(process.execPath,[script,'--fresh-phase-a-json',a,
   '--fresh-live-rpcs-json',b,'--fresh-migrations-json',c],{encoding:'utf8',timeout:15000});
  assert.match(text,/PHASE_A_CATALOG_PRECONDITIONS_MATCH/);
  const changed=clone(pre.preflight);changed.ordersAnonTableSelect=true;
  assert.throws(()=>verifyStage87({freshPhaseA:{preflight:changed}}),/fresh read-only Production Phase A/);
  const broken=clone(matrix.liveFunctions);broken[0].md5='0'.repeat(32);
  assert.throws(()=>verifyStage87({freshLiveRpcs:{live_rpcs:broken}}),/fresh high-risk Production/);
  const versions=clone(history.appliedMigrations);versions[0].name+='-drift';
  assert.throws(()=>verifyStage87({freshMigrations:versions}),/fresh Production migration/);
 }finally{rmSync(temp,{recursive:true,force:true})}
});
test('Stage87 SQL sources are read-only and CI is limited to preflight no deploy',()=>{
 const query=readFileSync(new URL('../release/stage87-read-only-phase-a-preflight.sql',import.meta.url),'utf8');
 const high=readFileSync(new URL('../release/stage87-read-only-high-risk-functions.sql',import.meta.url),'utf8');
 const workflow=readFileSync(new URL('../.github/workflows/stage52-isolated-postgres.yml',import.meta.url),'utf8');
 const doc=readFileSync(new URL('../docs/stage87-phase-a-preflight-nine-high-risk-contracts.md',import.meta.url),'utf8');
 for(const sql of [query,high]){
  assert.match(sql,/SELECT/);
  assert.doesNotMatch(sql,/\b(?:INSERT INTO|UPDATE public|DELETE FROM|ALTER TABLE|DROP TABLE|CREATE TABLE)\b/i);
 }
 assert.match(workflow,/stage87PhaseAPreflightHighRiskGate.mjs --verify-pinned/);
 for(const token of ['NOT RELEASE-READY','Production unchanged','no paid staging',
  'Phase A','Phase B','full-schema','17','18','9 HIGH','203','1026'])
  assert.ok(doc.includes(token),'Missing release caveat '+token);
});
