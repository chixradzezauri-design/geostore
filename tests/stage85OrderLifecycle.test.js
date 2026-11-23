import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from '../scripts/stage85ExtractOrderLifecycle.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('Stage85 extracts four historical order lifecycle SQL triggers without replaying full migrations',()=>{
 const t=build();
 for(const name of [
 'private.guard_order_status_transition()',
 'private.prevent_cancellation_after_dispatch()',
 'private.record_order_notification()',
 'orders_guard_status_transition','prevent_cancellation_after_dispatch',
 'orders_record_notification_after_insert','orders_record_notification_after_status_update',
 "ALTER FUNCTION private.prevent_cancellation_after_dispatch() SET search_path = ''"])
 assert.ok(t.includes(name),'Lost original SQL '+name);
 assert.doesNotMatch(t,/ALTER TABLE public.orders|UPDATE public.orders SET user_id/);
 assert.match(t,/geostore\.completed_order_reactivation/);
 assert.match(t,/geostore\.order_reactivation/);
});
test('Stage85 untracked published guard is explicitly fixture-only and source hash is checked',()=>{
 const fixture=read('./stage78-supabase/stage85-live-published-guard.sql');
 assert.match(fixture,/fixture-only snapshot|fixture-only live copy/i);
 assert.match(fixture,/is_published = false/);
 assert.match(fixture,/USING ERRCODE = '23514'/);
 assert.match(fixture,/CREATE TRIGGER reject_unpublished_products_in_new_orders/);
 const checker=read('../scripts/stage85OrderLifecycleHttp.mjs');
 for(const h of ['83728cba6f42d3c645d7da353a508d0e',
  '32a3405eecdb3731a9d53305ea61d405',
  '1d9416404461fe1a62cfd48c6360fdd3',
  '9d76f0e24a34ba8838eebe032fad80fe',
  'created:ახალი','status_changed_at','STAGE85-UNPUBLISHED',
  '23514','inventory_movements','auth','order_notifications'])
 assert.ok(checker.includes(h),'Missing Stage85 source/behavior assertion '+h);
});
test('Stage85 complete 8-trigger SQL test executes before real signed checkout',()=>{
 const wf=read('../.github/workflows/stage78-free-supabase-auth-postgrest.yml');
 const source=wf.indexOf('stage85ExtractOrderLifecycle.mjs',wf.indexOf('run: |'));
 const install=wf.indexOf('stage85-order-lifecycle.sql',source);
 const signed=wf.indexOf('stage80RealCheckoutHttp.mjs',install);
 const verify=wf.indexOf('stage85OrderLifecycleHttp.mjs',signed);
 assert.ok(source>0&&install>source&&signed>install&&verify>signed,
  'Stage85 source-real order triggers must be enabled before signed checkout');
 const sql=read('./stage78-supabase/stage85-order-lifecycle.sql');
 assert.match(sql,/\\i \/tmp\/stage85-original-order-lifecycle.sql/);
 assert.match(sql,/\\ir stage85-live-published-guard.sql/);
 assert.match(sql,/<> 8 THEN/);
 assert.doesNotMatch(wf,/supabase db push|supabase link|SUPABASE_ACCESS_TOKEN/);
});
test('Stage85 remains explicitly blocked from untested Production cutover',()=>{
 const doc=read('../docs/stage85-eight-order-triggers-ci.md');
 for(const term of ['NOT RELEASE-READY','Production unchanged','no paid staging',
 'Phase A','Phase B','full-schema','11','8','source','untracked'])
 assert.ok(doc.includes(term),'Missing release caveat '+term);
});
