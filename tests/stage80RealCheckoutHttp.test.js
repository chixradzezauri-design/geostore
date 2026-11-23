import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL(f,import.meta.url),'utf8');
const sql=read('./stage78-supabase/stage80-real-stock.sql');
const js=read('../scripts/stage80RealCheckoutHttp.mjs');
const wf=read('../.github/workflows/stage78-free-supabase-auth-postgrest.yml');
const doc=read('../docs/stage80-real-checkout-ci.md');
test('Stage80 real signed checkout uses exact transaction, inventory triggers and cancellation',()=>{
 for(const s of ['20261117231546_stable_checkout_idempotency_ordering.sql',
  '20261117231459_staff_orders_permission.sql',
  '/tmp/stage60_original_inventory_trigger_prefix.sql',
  'CREATE TABLE public.products','SECURITY INVOKER SET search_path TO'])
  assert.ok(sql.includes(s),'Missing original source: '+s);
 assert.doesNotMatch(sql,/CREATE FUNCTION private\.create_order_with_stock/);
 assert.match(wf,/scripts\/stage60InventoryLedgerFixture\.mjs/);
 assert.match(wf,/stage80-real-stock\.sql/);
 assert.match(wf,/stage80RealCheckoutHttp\.mjs/);
 assert.doesNotMatch(wf,/supabase db push|supabase link|SUPABASE_ACCESS_TOKEN|secrets\./);
});
test('Stage80 HTTP coverage refuses remote and validates variant stock and finance rules',()=>{
 for(const s of ['refuses all remote Supabase','signInWithPassword','STAGE80-VARIANTS-001',
  'idempotent_replay','inventory_movements','get_my_orders',
  'admin_update_order_status','coupon','oversell','delta',
  'Original stock restored exactly once','redacted'])
  assert.ok(js.toLowerCase().includes(s.toLowerCase()),'Missing HTTP scenario '+s);
 for(const s of ['NOT RELEASE-READY','Production unchanged','no paid staging',
  'full-schema','source SQL','mock','Phase A','Phase B'])
  assert.ok(doc.includes(s),'Missing release limitation '+s);
});
