/**
 * Stage81: compare READ-ONLY live catalog / applied history to frozen
 * pre-Phase-A Production metadata. No API calls, passwords, SQL or deploy.
 * A PASS only validates snapshot integrity; does NOT authorize a release.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {migrationHistoryMd5} from './stage72ReconciledReleaseGate.mjs';

const baselineFile=new URL('../release/stage81-production-schema-baseline.json',import.meta.url);
const historyFile=new URL('../release/stage72-production-history-baseline.json',import.meta.url);
const pinned=JSON.parse(readFileSync(baselineFile,'utf8'));
const history=JSON.parse(readFileSync(historyFile,'utf8'));
function blocked(message){throw new Error('Stage81 release preflight BLOCKED: '+message)}
function invariant(condition,message){if(!condition)blocked(message)}
const asMap=items=>new Map(items.map(x=>[x.name||x.signature,x]));
const requiredOrderColumns={
 id:'text',created_at:'timestamp with time zone',customer_name:'text',
 phone:'text',address:'text',user_email:'text',customer_email:'text',
 user_id:'uuid',total_gel:'numeric',status:'text',admin_note:'text',
 status_changed_at:'timestamp with time zone',
 stock_deducted_at:'timestamp with time zone',
 stock_restored_at:'timestamp with time zone',items:'jsonb',
 checkout_result:'jsonb',checkout_request:'jsonb'
};
const requiredProductColumns={
 id:'text',name:'text',price_gel:'numeric',purchase_cost:'numeric',
 stock:'integer',variants:'jsonb',available_sizes:'jsonb',
 available_colors:'jsonb',image:'text',gallery:'jsonb',vendor:'text'
};
const expectedRpcSecurity={
 'private.create_order_with_stock(jsonb)':[true,true,true,'jsonb'],
 'public.create_order_with_stock(jsonb)':[true,false,true,'jsonb'],
 'private.get_my_orders()':[true,true,false,null],
 'public.get_my_orders()':[true,false,false,null],
 'private.has_staff_permission(text)':[true,true,false,'boolean'],
 'public.has_staff_permission(text)':[true,false,false,'boolean'],
 'private.admin_update_order_status(text,text)':[true,true,false,'jsonb'],
 'public.admin_update_order_status(text,text)':[true,false,false,'jsonb'],
 'public.admin_order_ledger_page(integer,integer)':[false,null,null,null],
 'public.admin_order_image_refs_page(integer,integer)':[false,null,null,null]
};
const requiredOrderTriggers=[
 'orders_bind_auth_user_before_insert',
 'orders_guard_status_transition',
 'orders_record_notification_after_insert',
 'orders_record_notification_after_status_update',
 'orders_require_valid_guest_checkout_email',
 'orders_set_status_changed_at',
 'prevent_cancellation_after_dispatch',
 'reject_unpublished_products_in_new_orders'
];
const requiredProductTriggers=[
 'preserve_product_variant_stock',
 'products_inventory_movement_after_change',
 'zz_sync_size_color_aggregate_stock'
];

export function validateStage81(captured,expectedHistory=history,freshCatalog=null,freshMigrations=null){
 invariant(captured?.schema===1&&captured.projectId==='xmtnszxtnfxnrojionoa'&&
  captured.capturedDate==='2026-11-23'&&captured.phase==='BEFORE_PHASE_A',
  'untrusted snapshot identity/date/phase');
 invariant(expectedHistory.schema===1 &&
  expectedHistory.projectId===captured.projectId &&
  Array.isArray(expectedHistory.appliedMigrations) &&
  expectedHistory.appliedMigrations.length===135 &&
  expectedHistory.remoteHistoryMd5===captured.expectedMigrationHistoryMd5 &&
  migrationHistoryMd5(expectedHistory.appliedMigrations)===captured.expectedMigrationHistoryMd5,
  'applied historical migration baseline changed');
 const c=captured.catalog;
 invariant(c&&Array.isArray(c.orders_columns)&&c.orders_columns.length===17 &&
  Array.isArray(c.products_columns)&&c.products_columns.length===32 &&
  Array.isArray(c.tables)&&c.tables.length===8&&
  Array.isArray(c.rpcs)&&c.rpcs.length===10,
  'Production catalog shape/count changed');
 for(const [label,rows,expected] of [
  ['orders',c.orders_columns,requiredOrderColumns],
  ['products',c.products_columns,requiredProductColumns]]){
  const m=asMap(rows);
  invariant(m.size===rows.length,'duplicate '+label+' column');
  for(const [column,type] of Object.entries(expected))
   invariant(m.get(column)?.type===type,label+' column type mismatch: '+column);
 }
 const t=asMap(c.tables);
 invariant(t.size===8,'missing or duplicate critical live table');
 for(const name of [
  'public.orders','public.products','public.admin_staff_members',
  'public.admin_staff_pending_invites','public.expenses',
  'public.order_notifications','private.inventory_movements',
  'private.inventory_replenishment_settings'])
   invariant(t.get(name)?.rls===true,'required table lost RLS: '+name);
 invariant(t.get('public.admin_staff_members')?.force_rls===true &&
   t.get('public.admin_staff_pending_invites')?.force_rls===true,
  'staff Force RLS disabled');
 const f=asMap(c.rpcs);
 invariant(f.size===10,'missing or duplicate RPC signature');
 for(const [name,[exists,definer,anon,result]] of Object.entries(expectedRpcSecurity)){
  const row=f.get(name);
  invariant(row?.exists===exists,'RPC appearance/disappearance: '+name);
  invariant(row.security_definer===definer && row.anon_execute===anon,
   'RPC security definer or anon permissions drift: '+name);
  if(result)invariant(row.return===result,'RPC return drift: '+name);
  if(exists){
   invariant(row.authenticated_execute===true &&
    typeof row.definition_md5==='string'&&/^[a-f0-9]{32}$/.test(row.definition_md5),
    'missing RPC source fingerprint/authenticated grant: '+name);
  }else{
   invariant(row.definition_md5===null && row.authenticated_execute===null,
    'pre-Phase-A RPC unexpectedly installed: '+name);
  }
 }
 invariant(c.acl?.anon_order_table_read===false&&
  c.acl.authenticated_order_table_read===true&&
  c.acl.authenticated_order_items_read===true&&
  c.acl.authenticated_order_request_read===true&&
  c.acl.authenticated_order_result_read===true&&
  c.acl.authenticated_order_status_read===true&&
  c.acl.anon_private_schema_usage===true&&
  c.acl.authenticated_private_schema_usage===true,
  'legacy Phase A compatibility or private schema grants drift');
 for(const [label,rows,required] of [
  ['order',c.order_triggers,requiredOrderTriggers],
  ['product',c.product_triggers,requiredProductTriggers]]){
  invariant(Array.isArray(rows)&&rows.length===required.length,
    label+' trigger count drift');
  const m=asMap(rows);
  for(const trigger of required)
   invariant(m.get(trigger)?.enabled==='O'&&typeof m.get(trigger).function==='string',
    label+' trigger missing/disabled: '+trigger);
 }
 if(freshCatalog!==null){
  const supplied=typeof freshCatalog?.snapshot==='string'?
   JSON.parse(freshCatalog.snapshot):(freshCatalog?.snapshot||freshCatalog?.catalog||freshCatalog);
  const target=supplied===freshCatalog?.catalog ? freshCatalog.catalog:supplied;
  invariant(JSON.stringify(target)===JSON.stringify(c),
   'fresh live catalog differs from pinned before-Phase-A catalog');
 }
 if(freshMigrations!==null){
  const rows=Array.isArray(freshMigrations)?freshMigrations:freshMigrations?.migrations;
  invariant(Array.isArray(rows)&&migrationHistoryMd5(rows)===captured.expectedMigrationHistoryMd5,
   'fresh applied migration history differs from pinned Production history');
 }
 return {
  outcome:'FROZEN_LIVE_PRE_PHASE_A_CATALOG_MATCHED_RELEASE_STILL_BLOCKED',
  catalogDate:captured.capturedDate,criticalTables:c.tables.length,
  ordersColumns:c.orders_columns.length,productsColumns:c.products_columns.length,
  criticalFunctions:c.rpcs.length,orderTriggers:c.order_triggers.length,
  productTriggers:c.product_triggers.length,
  historicalMigrations:expectedHistory.appliedMigrations.length,
  warning:'Snapshot-only audit. New Phase A migrations are NOT applied. Full-schema authenticated rehearsal and historical SQL reconciliation still required.'
 };
}
function main(){
 const args=process.argv.slice(2);
 if(args.length!==1&&args.length!==5)blocked('use --verify-pinned OR --fresh-catalog-json FILE --fresh-migrations-json FILE');
 if(args.length===1&&args[0]==='--verify-pinned'){
  console.log(JSON.stringify(validateStage81(pinned),null,2));return;
 }
 if(args[0]!=='--fresh-catalog-json'||args[2]!=='--fresh-migrations-json')
  blocked('fresh release preflight needs BOTH new catalog and applied migration exports');
 const live=JSON.parse(readFileSync(resolve(args[1]),'utf8'));
 const migrations=JSON.parse(readFileSync(resolve(args[3]),'utf8'));
 console.log(JSON.stringify(validateStage81(pinned,history,live,migrations),null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main()}catch(e){console.error(e.message);process.exitCode=2}
}
