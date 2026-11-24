/** Stage87: offline fail-closed Phase A catalog prerequisite and nine HIGH-risk SQL gate.
 * Zero live SQL, no external network calls, no migration history repair or deploy.
 * A matching preflight is NOT permission to apply Phase A or merge this PR.
 */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {gitBlobSha,migrationHistoryMd5} from './stage72ReconciledReleaseGate.mjs';
import {validateStage86} from './stage86MissingHistoryProvenanceGate.mjs';
const PREFLIGHT_SHA='51e70b099e6886120f6ebbd1386f92403d2232c7';
const MATRIX_SHA='cbbd458dcb4e442aa0155cc4e3caf06e4501be7d';
const location={
 preflight:new URL('../release/stage87-phase-a-live-preflight.json',import.meta.url),
 matrix:new URL('../release/stage87-high-risk-live-boundary-matrix.json',import.meta.url)
};
const json=f=>JSON.parse(readFileSync(f,'utf8'));
const preflight=json(location.preflight);
const matrix=json(location.matrix);
const stage72=json(new URL('../release/stage72-production-history-baseline.json',import.meta.url));
const stage81=json(new URL('../release/stage81-production-schema-baseline.json',import.meta.url));
const stage82=json(new URL('../release/stage82-live-effective-schema-surface.json',import.meta.url));
const stage86=json(new URL('../release/stage86-historical-sql-risk-disposition.json',import.meta.url));
const fail=message=>{throw Error('Stage87 Phase A/high-risk release gate BLOCKED: '+message)};
const need=(good,message)=>{if(!good)fail(message)};
const objEqual=(a,b)=>isDeepStrictEqual(a,b);
const stamp=x=>typeof x==='string'&&/^[0-9a-f]{32}$/.test(x);
function unpack(x,field){
 if(Array.isArray(x)&&x.length===1&&x[0]?.[field]!==undefined)return unpack(x[0],field);
 if(x?.[field]!==undefined)return typeof x[field]==='string'?JSON.parse(x[field]):x[field];
 return x;
}
export function verifyStage87({
 live=preflight,risks=matrix,history=stage72,prior=stage81,
 earlier=stage82,historical=stage86,
 freshPhaseA=null,freshLiveRpcs=null,freshMigrations=null
}={}){
 need(gitBlobSha(readFileSync(location.preflight,'utf8'))===PREFLIGHT_SHA,
  'reviewed read-only Phase A preflight snapshot Git blob changed');
 need(gitBlobSha(readFileSync(location.matrix,'utf8'))===MATRIX_SHA,
  'reviewed nine-risk current-function matrix Git blob changed');
 validateStage86({applied:history});
 const expectedMd5='4f09258df9fbd7b415cc2d3dc5ffbe6f';
 need(live.schema===1&&live.projectId==='xmtnszxtnfxnrojionoa'&&
  live.capturedDate==='2026-11-23'&&live.phase==='PRE_PHASE_A'&&
  live.historyMd5===expectedMd5&&
  history.remoteHistoryMd5===expectedMd5&&prior.expectedMigrationHistoryMd5===expectedMd5,
  'project/phase/Production 135-applied migration history drift');
 need(migrationHistoryMd5(history.appliedMigrations)===expectedMd5,
  'applied migration history version/name no longer trusted');
 const p=live.preflight;
 need(p.appliedCount===135&&p.historyMd5===expectedMd5&&
  p.phasedAppliedCount===0,
  'one or more Phase A or Phase B migrations was already applied or migration count changed');
 need(p.ordersRls===true&&p.staffTable===true&&p.authUid===true,
  'Production orders RLS, staff foundation or auth.uid prerequisite missing');
 need(p.expectedOrdersColumns===17&&p.matchedOrdersColumns===17&&
  Array.isArray(p.orderColumnMismatches)&&p.orderColumnMismatches.length===0,
  'one of 17 Phase A order projection or history columns changed');
 need(p.ordersAnonTableSelect===false&&p.ordersAuthenticatedTableSelect===true,
  'legacy direct SELECT compatibility or anonymous raw-table boundary changed');
 need(p.ordersAuthenticatedCostSnapshotSelect?.items===true&&
  p.ordersAuthenticatedCostSnapshotSelect?.checkout_result===true&&
  p.ordersAuthenticatedCostSnapshotSelect?.checkout_request===true,
  'legacy raw finance-bearing order SELECT phase no longer matches; run new review');
 need(Array.isArray(p.functions)&&p.functions.length===10,
  'Phase A function prerequisite scope changed');
 const functions=new Map(p.functions.map(x=>[x.signature,x]));
 need(functions.size===10,'duplicated Phase A RPC signature');
 const priorRpcs=new Map(prior.catalog.rpcs.map(x=>[x.signature,x]));
 const required=[
 'private.create_order_with_stock(jsonb)',
 'public.create_order_with_stock(jsonb)',
 'private.get_my_orders()',
 'public.get_my_orders()',
 'private.has_staff_permission(text)',
 'public.has_staff_permission(text)',
 'private.admin_update_order_status(text,text)',
 'public.admin_update_order_status(text,text)'
 ];
 for(const signature of required){
  const f=functions.get(signature),b=priorRpcs.get(signature);
  need(Boolean(f?.exists&&b?.exists)&&
   stamp(f.definition_md5)&&f.definition_md5===b.definition_md5&&
   f.security_definer===b.security_definer&&f.anon_execute===b.anon_execute&&
   f.authenticated_execute===b.authenticated_execute&&
   f.result===b.return&&f.search_path_locked===true,
   'Phase A existing RPC digest/permissions drift: '+signature);
 }
 for(const suffix of ['ledger_page','image_refs_page']){
  const signature='public.admin_order_'+suffix+'(integer,integer)';
  const f=functions.get(signature),b=priorRpcs.get(signature);
  need(Boolean(f)&&f.exists===false&&b?.exists===false&&
   f.definition_md5===null&&f.result===null,
   'additive Phase A admin order projection RPC already exists or is unreviewed: '+signature);
 }
 need(Array.isArray(history.phasedSources)&&history.phasedSources.length===4,
  'pending Phase A/B file sequence changed');
 for(const [i,src] of history.phasedSources.entries()){
  const expectedVersion=[
   '20261121170000_strip_private_costs_from_checkout_rpc.sql',
   '20261121190000_redact_alternate_costs_from_order_history.sql',
   '20261121210000_scope_admin_order_ledger_permissions.sql',
   '20261121213000_revoke_legacy_order_snapshot_reads.sql'
  ][i];
  need(src.file===expectedVersion&&src.phase===(i===3?'B':'A'),
   'unsafe Phase A/B source ordering');
  need(gitBlobSha(readFileSync(new URL('../supabase/migrations/'+src.file,import.meta.url),'utf8'))===src.sha,
   'unreviewed Phase A/B SQL source edit: '+src.file);
 }
 need(risks.schema===1&&risks.projectId===live.projectId&&
  risks.capturedDate===live.capturedDate&&risks.phase===live.phase&&
  risks.liveFunctionCount===18&&Array.isArray(risks.liveFunctions)&&
  risks.liveFunctions.length===18&&
  risks.classification==='9_HIGH_SOURCES_REMAIN_UNRECONCILED_NO_HISTORICAL_REPLAY_AUTHORIZED',
  'nine-risk function manifest or current digest scope changed');
 const catalog=new Map(earlier.surface.functions.map(x=>[x.signature,x]));
 const liveMap=new Map(risks.liveFunctions.map(x=>[x.signature,x]));
 need(liveMap.size===18,'duplicate current Production HIGH-risk RPC');
 for(const [signature,fn] of liveMap){
  const baseline=catalog.get(signature);
  need(Boolean(baseline)&&stamp(fn.md5)&&fn.md5===baseline.definition_md5&&
   fn.securityDefiner===baseline.definer&&fn.anonExecute===baseline.anon_execute&&
   fn.authenticatedExecute===baseline.authenticated_execute&&fn.searchPathLocked===true,
   'current Production checkout/admin/support/replenishment ABI or grants drift: '+signature);
 }
 const reviewedHigh=historical.riskRows.filter(x=>x.severity==='HIGH');
 need(reviewedHigh.length===9&&risks.nineHighRiskHistoricalSources?.length===9,
  'not all nine historically conflicting HIGH-risk SQL sources are mapped');
 const manifestByFile=new Map(risks.nineHighRiskHistoricalSources.map(x=>[x.file,x]));
 need(manifestByFile.size===9,'duplicate HIGH-risk historical source');
 const covered=new Set();
 for(const row of reviewedHigh){
  const target=manifestByFile.get(row.file);
  need(Boolean(target)&&target.appliedSqlMd5===row.appliedSqlMd5&&
   target.gitBlobSha===row.gitBlobSha&&target.risk===row.risk&&
   target.severity==='HIGH'&&
   target.replayStatus==='HISTORICAL_SOURCE_UNRECONCILED_DO_NOT_REPLAY'&&
   target.coverage==='CURRENT_LIVE_METADATA_PLUS_PARTIAL_CI_NOT_HISTORIC_SQL_PROOF'&&
   typeof target.remainingGap==='string'&&target.remainingGap.length>35,
   'HIGH-risk historic SQL risk/state was downgraded or changed: '+row.file);
  need(Array.isArray(target.currentFunctions)&&target.currentFunctions.length>=2,
   'unmapped live RPC surface for high-risk historical SQL '+row.file);
  for(const observed of target.currentFunctions){
   const current=liveMap.get(observed.signature);
   need(Boolean(current)&&observed.md5===current.md5&&
    observed.securityDefiner===current.securityDefiner&&
    observed.anonExecute===current.anonExecute&&
    observed.authenticatedExecute===current.authenticatedExecute,
    'HIGH-risk current boundary evidence changed: '+row.file+' '+observed.signature);
   covered.add(observed.signature);
  }
 }
 need(covered.size===18,
  'nine historical high-risk SQL files no longer cover 18 current Production entrypoints');
 if(freshPhaseA!==null)
  need(objEqual(unpack(freshPhaseA,'preflight'),p),
   'fresh read-only Production Phase A preflight differs from pinned snapshot');
 if(freshLiveRpcs!==null)
  need(objEqual(unpack(freshLiveRpcs,'live_rpcs'),risks.liveFunctions),
   'fresh high-risk Production SQL function MD5/grants differ from pinned snapshot');
 if(freshMigrations!==null){
  const rows=Array.isArray(freshMigrations)?freshMigrations:freshMigrations?.migrations;
  need(Array.isArray(rows)&&migrationHistoryMd5(rows)===expectedMd5,
   'fresh Production migration version/name history drift');
 }
 return {
  result:'PHASE_A_CATALOG_PRECONDITIONS_MATCH__PRODUCTION_RELEASE_STILL_BLOCKED',
  appliedMigrations:p.appliedCount,phasedMigrationsApplied:p.phasedAppliedCount,
  requiredOrderColumns:p.matchedOrdersColumns,phaseAFunctionPreconditions:8,
  phaseAAdditiveAdminRpcNotYetApplied:2,
  currentHighRiskFunctionsVerified:18,highRiskHistoricalSqlUnreconciled:9,
  oldRawCostSnapshotAccessibleToAuthenticated:true,phaseAPlanned:3,phaseBPlanned:1,
  warning:'Live snapshot shows catalog prerequisites ONLY. Do not apply Phase A without additional operator/staging verification. Phase A does not resolve raw cost access; Phase B must wait until verified frontend READY and old clients handled.'
 };
}
function main(){
 const args=process.argv.slice(2);
 let result;
 if(args.length===1&&args[0]==='--verify-pinned')result=verifyStage87();
 else if(args.length===6&&args[0]==='--fresh-phase-a-json'&&args[2]==='--fresh-live-rpcs-json'&&args[4]==='--fresh-migrations-json')
  result=verifyStage87({freshPhaseA:json(resolve(args[1])),
   freshLiveRpcs:json(resolve(args[3])),
   freshMigrations:json(resolve(args[5]))});
 else fail('usage: --verify-pinned OR --fresh-phase-a-json FILE --fresh-live-rpcs-json FILE --fresh-migrations-json FILE');
 console.log(JSON.stringify(result,null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main()}catch(error){console.error(error.message);process.exitCode=2}
}
