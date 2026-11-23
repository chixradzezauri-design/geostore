/** Stage86: offline only, source-pinned provenance and 11-SQL-risk release gate.
 * No Production connection, SQL execution, history repair, or deployment.
 */
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {gitBlobSha,migrationHistoryMd5} from './stage72ReconciledReleaseGate.mjs';
import {verifyStage82} from './stage82LiveEffectiveSchemaGate.mjs';
const ORIGIN_SHA='31ac09c91f8d165b55e8276c0a90786f884a2e96';
const TRIAGE_SHA='b8666b5d09bbfe05df9d95703d6ed4ca841d96f9';
const root=new URL('../',import.meta.url);
const originFile=new URL('../release/stage86-production-only-migration-origin.json',import.meta.url);
const triageFile=new URL('../release/stage86-historical-sql-risk-disposition.json',import.meta.url);
const json=(f)=>JSON.parse(readFileSync(f,'utf8'));
const origin=json(originFile),triage=json(triageFile);
const history=json(new URL('../release/stage72-production-history-baseline.json',import.meta.url));
const reviewed=json(new URL('../release/stage76-existing-version-sql-divergence.json',import.meta.url));
const requireCondition=(condition,why)=>{
 if(!condition)throw Error('Stage86 historical Production provenance BLOCKED: '+why);
};
const sorted=v=>Array.isArray(v)?v.map(sorted):
 v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,sorted(x)])):v;
const unpack=x=>{
 if(Array.isArray(x)&&x.length===1&&x[0]?.snapshot!==undefined)return unpack(x[0]);
 if(x?.snapshot!==undefined)return typeof x.snapshot==='string'?JSON.parse(x.snapshot):x.snapshot;
 if(x?.origin!==undefined)return x.origin;
 return x;
};
const hex32=s=>typeof s==='string'&&/^[0-9a-f]{32}$/.test(s);
const counts=rows=>rows.reduce((acc,x)=>(acc[x.severity]=(acc[x.severity]||0)+1,acc),{});
export function validateStage86({frozen=origin,risk=triage,applied=history,previous=reviewed,
 freshOrigin=null,freshMigrations=null}={}){
 // The independent file blob SHA is always checked, including direct imports,
 // so a modified metadata fixture cannot silently certify itself.
 requireCondition(gitBlobSha(readFileSync(originFile,'utf8'))===ORIGIN_SHA,
  'frozen applied-migration-origin JSON source SHA drift');
 requireCondition(gitBlobSha(readFileSync(triageFile,'utf8'))===TRIAGE_SHA,
  'frozen SQL risk-disposition JSON source SHA drift');
 verifyStage82({applied,divergences:previous});
 requireCondition(frozen.schema===1&&frozen.projectId==='xmtnszxtnfxnrojionoa'&&
  frozen.phase==='PRE_PHASE_A'&&frozen.captureDate==='2026-11-23'&&
  frozen.remoteHistoryMd5==='4f09258df9fbd7b415cc2d3dc5ffbe6f'&&
  frozen.expectedAppliedMigrationCount===135,
  'Production origin project, date, phase, or frozen history changed');
 requireCondition(applied.appliedMigrations.length===135&&
  migrationHistoryMd5(applied.appliedMigrations)===frozen.remoteHistoryMd5,
  'applied migration version/name baseline differs');
 const o=frozen.origin;
 const expectedName='20261110100653_hide_test_products_from_storefront.sql';
 requireCondition(o?.version==='20261110100653'&&
  o?.name==='hide_test_products_from_storefront'&&
  o.statementCount===1&&o.appliedSqlLength===1761&&
  o.appliedSqlMd5==='63bf0c1562a9e5f31009bc50e655d642'&&
  o.definitionMd5==='83728cba6f42d3c645d7da353a508d0e'&&
  o.triggerMd5==='36d0286796dc2a750e913c4107028d07'&&
  o.createsGuard===true&&o.createsTrigger===true&&o.createsPublishedColumn===true,
  'applied Production migration origin or SQL/function/trigger fingerprints changed');
 requireCondition(o.published?.data_type==='boolean'&&
  o.published?.nullable==='NO'&&o.published?.default==='true',
  'published-product column contract changed');
 requireCondition(frozen.missingLocalMigrationPath==='supabase/migrations/'+expectedName &&
  !existsSync(new URL('../'+frozen.missingLocalMigrationPath,import.meta.url)),
  'the formerly remote-only migration has appeared locally: reconcile, never blindly replay');
 requireCondition(applied.appliedMigrations.filter(m=>
  m.version===o.version&&m.name===o.name).length===1,
  'the remote-only applied migration is not present exactly once');
 requireCondition(frozen.fixturePath==='tests/stage78-supabase/stage85-live-published-guard.sql'&&
  frozen.fixtureGitBlobSha==='11e2c9315fec63a666642bc47905eeeca3123f65',
  'Stage85 source-real local guard fixture identity changed');
 const fixture=readFileSync(new URL('../'+frozen.fixturePath,import.meta.url),'utf8');
 requireCondition(gitBlobSha(fixture)===frozen.fixtureGitBlobSha&&
  fixture.includes('CREATE OR REPLACE FUNCTION private.reject_unpublished_products_in_new_orders()')&&
  fixture.includes('CREATE TRIGGER reject_unpublished_products_in_new_orders')&&
  fixture.includes('is_published = false'),
  'fixture content/function/trigger no longer matches reviewed live source snapshot');
 const localTests=readFileSync(new URL('../scripts/stage85OrderLifecycleHttp.mjs',import.meta.url),'utf8');
 requireCondition(localTests.includes(o.definitionMd5)&&localTests.includes(o.triggerMd5)&&
  localTests.includes('STAGE85-UNPUBLISHED')&&localTests.includes("'23514'"),
  'Stage85 genuine signed HTTP unpublished-product protection test is missing');
 requireCondition(risk.schema===1&&risk.projectId===frozen.projectId&&
  risk.capturedDate===frozen.captureDate&&
  risk.remoteHistoryMd5===frozen.remoteHistoryMd5&&
  risk.status==='11_HISTORICAL_TOKEN_MISMATCHES_NOT_APPROVED_FOR_REPLAY',
  'historical SQL disposition and current provenance do not match');
 const entries=previous.entries.filter(x=>x.classification==='EXECUTABLE_TOKEN_DIFFERENCE');
 requireCondition(entries.length===11&&risk.riskRows?.length===11,
  '11 source-different applied/local migration rows require explicit dispositions');
 const byFile=new Map(risk.riskRows.map(x=>[x.file,x]));
 requireCondition(byFile.size===11,'duplicated source-risk rows');
 const severityByRisk={
 COMMERCE:'HIGH',AUTHORIZATION:'HIGH',SQL_SYNTAX:'MEDIUM',
 SECURITY_DEFINER:'HIGH',SUPPORT_AUTH:'HIGH',MESSAGE_TEXT:'LOW',
 TRANSACTION_SCOPE:'HIGH'
 };
 for(const x of entries){
  const v=byFile.get(x.file);
  requireCondition(v?.risk===x.risk&&
   v.gitBlobSha===x.gitBlobSha&&v.appliedSqlMd5===x.appliedSqlMd5&&
   v.status==='HISTORICAL_SOURCE_UNRECONCILED_DO_NOT_REPLAY'&&
   v.severity===severityByRisk[x.risk]&&
   typeof v.limitedCurrentEvidence==='string'&&v.limitedCurrentEvidence.length>20,
   'historical SQL source, severity, or non-replay decision changed: '+x.file);
 }
 requireCondition(isDeepStrictEqual(counts(risk.riskRows),risk.riskCounts)&&
  risk.riskCounts.HIGH===9&&risk.riskCounts.MEDIUM===1&&
  risk.riskCounts.LOW===1,
  '9-high/1-medium/1-low SQL risk triage changed');
 const phases=applied.phasedSources;
 requireCondition(Array.isArray(phases)&&phases.length===4&&
  phases.filter(x=>x.phase==='A').length===3&&
  phases.filter(x=>x.phase==='B').length===1,
  'Phase A/B release order unexpectedly changed');
 if(freshOrigin!==null)requireCondition(
  isDeepStrictEqual(sorted(unpack(freshOrigin)),sorted(o)),
  'fresh read-only Production migration provenance differs from 2026-11-23 origin');
 if(freshMigrations!==null){
  const versions=Array.isArray(freshMigrations)?freshMigrations:freshMigrations?.migrations;
  requireCondition(Array.isArray(versions)&&
   migrationHistoryMd5(versions)===frozen.remoteHistoryMd5,
   'fresh Production 135-version migration history changed');
 }
 return {result:'PROVENANCE_FOUND_REPLAY_UNSAFE_PRODUCTION_RELEASE_BLOCKED',
  origin:{version:o.version,name:o.name,sqlMd5:o.appliedSqlMd5,
   functionMd5:o.definitionMd5,triggerMd5:o.triggerMd5,trackedInGit:false},
  historicalSourceDifferences:11,riskCounts:risk.riskCounts,
  phaseA:3,phaseB:1,
  warning:'Origin traced to already-applied Production migration; do NOT reconstruct it as a pending migration or replay 11 conflicting historical files. No full-schema release approval.'};
}
function main(){
 const args=process.argv.slice(2);
 let result;
 if(args.length===1&&args[0]==='--verify-pinned')result=validateStage86();
 else if(args.length===4&&args[0]==='--fresh-origin-json'&&args[2]==='--fresh-migrations-json'){
  result=validateStage86({
   freshOrigin:json(resolve(args[1])),
   freshMigrations:json(resolve(args[3]))
  });
 }else throw Error('Stage86 CLI usage: --verify-pinned OR --fresh-origin-json FILE --fresh-migrations-json FILE');
 console.log(JSON.stringify(result,null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main()}catch(err){console.error(err.message);process.exitCode=2}
}
