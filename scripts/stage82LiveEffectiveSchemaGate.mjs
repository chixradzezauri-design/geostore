/** Stage82: offline metadata-only Production effective-schema gate; no network. */
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {gitBlobSha,migrationHistoryMd5} from './stage72ReconciledReleaseGate.mjs';
const SNAPSHOT_SHA='eb644a6af2a2d5944aa1c959fd78eb84dca71e45';
const source=new URL('../release/stage82-live-effective-schema-surface.json',import.meta.url);
const read=name=>JSON.parse(readFileSync(new URL('../release/'+name,import.meta.url),'utf8'));
const snapshot=read('stage82-live-effective-schema-surface.json');
const history=read('stage72-production-history-baseline.json');
const stage81=read('stage81-production-schema-baseline.json');
const review=read('stage76-existing-version-sql-divergence.json');
const stop=reason=>{throw Error('Stage82 metadata release gate BLOCKED: '+reason)};
const demand=(ok,msg)=>{if(!ok)stop(msg)};
const goodMd5=s=>typeof s==='string'&&/^[0-9a-f]{32}$/.test(s);
const unpack=value=>{
 if(Array.isArray(value)&&value.length===1&&value[0].snapshot!==undefined)return unpack(value[0]);
 if(value?.snapshot!==undefined)return typeof value.snapshot==='string'?JSON.parse(value.snapshot):value.snapshot;
 if(value?.surface!==undefined)return value.surface;
 return value;
};
export function verifyStage82({
 frozen=snapshot,applied=history,prior=stage81,divergences=review,
 freshSurface=null,freshMigrations=null
}={}){
 demand(frozen.schema===1&&frozen.projectId==='xmtnszxtnfxnrojionoa'&&
 frozen.captureDate==='2026-11-23'&&frozen.phase==='PRE_PHASE_A'&&
 frozen.historyMd5===prior.expectedMigrationHistoryMd5&&
 frozen.stage81Date===prior.capturedDate,'identity/phase/Stage81 dependency changed');
 demand(applied.projectId===frozen.projectId&&
 Array.isArray(applied.appliedMigrations)&&applied.appliedMigrations.length===135&&
 migrationHistoryMd5(applied.appliedMigrations)===frozen.historyMd5,
 'Supabase migration version/name history changed');
 demand(divergences.projectId===frozen.projectId&&
 divergences.remoteHistoryMd5===frozen.historyMd5,'Stage76 SQL evidence changed');
 const high=divergences.entries.filter(x=>x.classification==='EXECUTABLE_TOKEN_DIFFERENCE');
 demand(high.length===11&&frozen.highRiskHistoricalMismatches?.length===11,
 'historical SQL risk coverage changed');
 const reviewEvidence=high.map(x=>({file:x.file,risk:x.risk,appliedSqlMd5:x.appliedSqlMd5,gitBlobSha:x.gitBlobSha}));
 demand(isDeepStrictEqual(reviewEvidence,frozen.highRiskHistoricalMismatches),
 'historical SQL blob/digest classifications changed');
 const f=frozen.surface?.functions,t=frozen.surface?.triggers,c=frozen.surface?.constraints;
 demand(Array.isArray(f)&&f.length===52&&Array.isArray(t)&&t.length===11&&
 Array.isArray(c)&&c.length===55,'expected function, trigger or constraint count changed');
 const fm=new Map(f.map(x=>[x.signature,x]));
 demand(fm.size===52,'duplicate function signatures');
 const pub=f.filter(x=>x.signature.startsWith('public.')).length;
 const priv=f.filter(x=>x.signature.startsWith('private.')).length;
 demand(pub===23&&priv===29,'unexpected exposed/private function split');
 for(const x of f){
 demand(goodMd5(x.definition_md5)&&x.locked_search_path===true&&
 typeof x.result==='string'&&typeof x.definer==='boolean'&&
 typeof x.anon_execute==='boolean'&&typeof x.authenticated_execute==='boolean',
 'missing function identity, hash, permission or locked search_path: '+x.signature);
 if(x.signature.startsWith('public.'))demand(x.definer===false,
 'public SECURITY DEFINER escalation: '+x.signature);
 if(x.signature.includes('.admin_'))demand(x.anon_execute===false,
 'anonymous admin role permission escalation: '+x.signature);
 if(x.signature.includes('inventory_replenishment_setting('))demand(x.anon_execute===false,
 'anonymous replenishment setting mutation: '+x.signature);
 }
 const required=[
 ['private.create_order_with_stock(',true],
 ['public.create_order_with_stock(',false],
 ['private.admin_reactivate_cancelled_order(',true],
 ['public.admin_reactivate_cancelled_order(',false],
 ['private.admin_save_order_note(',true],
 ['public.admin_save_order_note(',false],
 ['private.get_support_ticket_messages(',true],
 ['public.get_support_ticket_messages(',false],
 ['private.save_inventory_replenishment_setting(',true],
 ['public.admin_save_inventory_replenishment_setting(',false]
 ];
 for(const [prefix,definer] of required){
 const rows=f.filter(x=>x.signature.startsWith(prefix));
 demand(rows.length>0&&rows.every(x=>x.definer===definer),
 'critical live checkout/admin/support/replenishment implementation drift: '+prefix);
 }
 const overloads=f.filter(x=>x.signature.startsWith('public.admin_save_inventory_replenishment_setting('));
 demand(overloads.length===2&&overloads.every(x=>x.authenticated_execute&&!x.anon_execute),
 'old and versioned replenishment APIs no longer coexist');
 const tm=new Map(t.map(x=>[x.table+'::'+x.name,x]));
 demand(tm.size===11,'duplicate trigger identities');
 for(const x of t)demand(
 ['public.orders','public.products'].includes(x.table)&&
 x.enabled==='O'&&goodMd5(x.definition_md5)&&
 /^private\.[a-z_]+\(\)$/.test(x.routine),
 'inactive or unexpected stock/order trigger '+x.name);
 const previous=[
 ...prior.catalog.order_triggers.map(x=>({table:'public.orders',...x})),
 ...prior.catalog.product_triggers.map(x=>({table:'public.products',...x}))
 ];
 for(const x of previous)demand(tm.get(x.table+'::'+x.name)?.routine===x.function,
 'Stage81 trigger callback changed: '+x.name);
 const cm=new Map(c.map(x=>[x.table+'::'+x.name,x]));
 demand(cm.size===55,'duplicate table constraints');
 for(const x of c)demand(x.validated===true&&goodMd5(x.definition_md5)&&
 ['c','p','u','f','x'].includes(x.type),
 'unvalidated or invalid integrity rule: '+x.name);
 for(const name of [
 'public.products::products_stock_nonnegative_check',
 'public.products::products_variants_array_check',
 'private.inventory_movements::inventory_movements_delta_matches_quantities',
 'private.inventory_movements::inventory_movements_nonzero_delta',
 'private.inventory_replenishment_settings::inventory_replenishment_target_gt_threshold',
 'public.support_tickets::support_tickets_access_token_hash_check',
 'public.admin_staff_members::admin_staff_members_user_id_fkey'
 ])demand(cm.has(name),'required stock/finance/authorization rule missing: '+name);
 for(const [prefix,name] of [
 ['private.create_order_with_stock(','private.create_order_with_stock(jsonb)'],
 ['public.create_order_with_stock(','public.create_order_with_stock(jsonb)'],
 ['private.admin_update_order_status(','private.admin_update_order_status(text,text)'],
 ['public.admin_update_order_status(','public.admin_update_order_status(text,text)']
 ]){
 const found=f.filter(x=>x.signature.startsWith(prefix));
 demand(found.length===1&&found[0].definition_md5===
 prior.catalog.rpcs.find(x=>x.signature===name)?.definition_md5,
 'Stage81 checkout/status function fingerprint diverged: '+name);
 }
 if(freshSurface!==null)demand(isDeepStrictEqual(unpack(freshSurface),frozen.surface),
 'fresh Production surface differs from pinned metadata');
 if(freshMigrations!==null){
 const items=Array.isArray(freshMigrations)?freshMigrations:freshMigrations?.migrations;
 demand(Array.isArray(items)&&migrationHistoryMd5(items)===frozen.historyMd5,
 'fresh Production migration history differs from pinned metadata');
 }
 return {result:'PRE_PHASE_A_EFFECTIVE_SCHEMA_PINNED_RELEASE_STILL_BLOCKED',
 functions:f.length,publicInvokerFunctions:pub,privateFunctions:priv,
 enabledOrderAndProductTriggers:t.length,validatedTableConstraints:c.length,
 historicalExecutableDifferences:high.length,
 warning:'Metadata integrity only. No SQL replay, no live function equivalence and no full-schema Auth/PostgREST release certification.'};
}
function main(){
 const args=process.argv.slice(2);
 demand(gitBlobSha(readFileSync(source,'utf8'))===SNAPSHOT_SHA,
 'frozen metadata Git blob SHA changed');
 let result;
 if(args.length===1&&args[0]==='--verify-pinned')result=verifyStage82();
 else if(args.length===4&&args[0]==='--fresh-surface-json'&&args[2]==='--fresh-migrations-json'){
 result=verifyStage82({
 freshSurface:JSON.parse(readFileSync(resolve(args[1]),'utf8')),
 freshMigrations:JSON.parse(readFileSync(resolve(args[3]),'utf8'))
 });
 }else stop('use --verify-pinned OR --fresh-surface-json FILE --fresh-migrations-json FILE');
 console.log(JSON.stringify(result,null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main()}catch(e){console.error(e.message);process.exitCode=2}
}
