import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build,extract} from '../scripts/stage84ExtractOrderTriggers.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('Stage84 extracts original three order triggers, never unrelated historical SQL',()=>{
 const src=build();
 for(const text of ['private.bind_order_to_auth_user()',
 'private.require_valid_guest_checkout_email()','private.set_order_status_changed_at()',
 'orders_bind_auth_user_before_insert','orders_require_valid_guest_checkout_email',
 'orders_set_status_changed_at','REVOKE ALL ON FUNCTION'])
 assert.ok(src.includes(text),'Missing original SQL statement: '+text);
 assert.doesNotMatch(src,/ALTER TABLE public.orders|DROP FUNCTION/);
});
test('Stage84 source extractor fails closed on changes to names or missing body',()=>{
 const p={name:'set_order_status_changed_at',trigger:'orders_set_status_changed_at'};
 const original=read('../supabase/migrations/20261103155226_track_order_status_change_time.sql');
 assert.throws(()=>extract(original,{...p,name:'absent_trigger'}),/missing\/duplicate/);
 assert.throws(()=>extract(original.replace('$function$;', '$broken$;'),p),
  /did not terminate/);
});
test('Stage84 local CI puts original order triggers before signed checkout then denial checks',()=>{
 const wf=read('../.github/workflows/stage78-free-supabase-auth-postgrest.yml');
 const install=wf.indexOf('stage84-install-order-triggers.sql');
 const signed=wf.indexOf('stage80RealCheckoutHttp.mjs',install);
 const verifier=wf.indexOf('stage84OrderTriggerHttp.mjs',signed);
 assert.ok(install>0&&signed>install&&verifier>signed,'Stage84 ordering is unsafe');
 assert.match(read('./stage78-supabase/stage84-install-order-triggers.sql'),
  /\\i \/tmp\/stage84-original-order-triggers\.sql/);
});
test('Stage84 assures real live trigger parity and no user or inventory mutation on failed checkout',()=>{
 const script=read('../scripts/stage84OrderTriggerHttp.mjs');
 for(const h of ['05ce287ad79d503487ecb04de243ff7d',
 '8054195435f9246d9be2a04aadb27804',
 '760ff7476bfcfcf7007a07df49f6e262',
 'STAGE84-NO-EMAIL','STAGE84-BAD-EMAIL','user_id','inventory_movements',
 'status_changed_at','22023'])
 assert.ok(script.includes(h),'Missing safety check '+h);
 const doc=read('../docs/stage84-order-ownership-email-status-ci.md');
 for(const h of ['NOT RELEASE-READY','Production unchanged','no paid staging',
 'Phase A','Phase B','full-schema','11','8'])
 assert.ok(doc.includes(h),'Missing release qualification '+h);
});
