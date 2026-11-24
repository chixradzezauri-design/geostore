// Stage85: extract only audited versioned historical SQL for 4 lifecycle
// triggers. The 5th (unpublished product) is a pinned fixture-only live copy.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {extract as sourceTrigger} from './stage84ExtractOrderTriggers.mjs';
import {functionSql} from './stage83ExtractTriggers.mjs';
const read=n=>readFileSync(new URL('../supabase/migrations/'+n,import.meta.url),'utf8');
const transition=read('20261107084940_harden_order_status_stock_transitions.sql');
const finalGuard=read('20261117231504_reopen_completed_orders.sql');
const dispatch=read('20261103122121_prevent_stock_restore_after_dispatch.sql');
const hardened=read('20261103122611_lock_down_rpc_search_paths.sql');
const ownership=read('20261108215548_bind_order_ownership_to_auth_user_uuid.sql');
const notifications=read('20261107130302_add_order_status_notifications.sql');
export const OUTPUT='/tmp/stage85-original-order-lifecycle.sql';
function unique(text,needle){
 const first=text.indexOf(needle);
 assert.ok(first>=0&&text.indexOf(needle,first+needle.length)<0,
  'Stage85 original SQL source marker absent or duplicated: '+needle);
 return first;
}
function notificationTrigger(text,name){
 const begin='DROP TRIGGER IF EXISTS '+name+' ON public.orders;';
 const first=unique(text,begin);
 const endMark='EXECUTE FUNCTION private.record_order_notification();';
 const end=text.indexOf(endMark,first+begin.length);
 assert.ok(end>first,'Stage85 original notification trigger callback missing: '+name);
 const extracted=text.slice(first,end+endMark.length);
 assert.match(extracted,/CREATE TRIGGER/);
 return extracted;
}
export function build(){
 const historicalTrigger=sourceTrigger(transition,{
  name:'guard_order_status_transition',trigger:'orders_guard_status_transition'});
 const ddlMarker='DROP TRIGGER IF EXISTS orders_guard_status_transition ON public.orders';
 const start=historicalTrigger.indexOf(ddlMarker);
 assert.ok(start>0,'Original status trigger DDL missing');
 // The 20261117231504 migration REPLACED the older status callback so
 // completed orders can be securely reopened via recent-password/AMR RPC.
 // Replaying the earlier 20261107084940 body would silently break this.
 const guard=functionSql(finalGuard,'private.guard_order_status_transition')+
   '\n\nREVOKE ALL ON FUNCTION private.guard_order_status_transition() FROM PUBLIC, anon, authenticated;\n\n'+
   historicalTrigger.slice(start);
 const prevent=sourceTrigger(dispatch,{
  name:'prevent_cancellation_after_dispatch',trigger:'prevent_cancellation_after_dispatch'});
 const lock='ALTER FUNCTION private.prevent_cancellation_after_dispatch() SET search_path = \'\';';
 unique(hardened,lock);
 const fn=functionSql(ownership,'private.record_order_notification');
 const afterInsert=notificationTrigger(notifications,'orders_record_notification_after_insert');
 const afterStatus=notificationTrigger(notifications,'orders_record_notification_after_status_update');
 assert.match(guard,/geostore\.order_reactivation/);
 assert.match(fn,/NEW\.user_id IS NULL/);
 assert.match(afterStatus,/OLD\.status IS DISTINCT FROM NEW\.status/);
 return '-- Stage85 historical SQL bodies and DDL, local synthetic stack ONLY.\n'+
 [guard,prevent,lock,fn,
  'REVOKE ALL ON FUNCTION private.record_order_notification() FROM PUBLIC, anon, authenticated;',
  afterInsert,afterStatus].join('\n\n')+'\n';
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 writeFileSync(OUTPUT,build(),{mode:0o600});
 console.log('Stage85 extracted 4 authentic historical order lifecycle trigger definitions');
}
