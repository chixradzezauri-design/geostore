// Stage83: original extracted product stock triggers vs live effective MD5.
// Only disposable localhost Supabase, no remote SQL or customers.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const {API_URL}=process.env;
assert.ok(API_URL,'Stage83 local credentials required');
const address=new URL(API_URL);
assert.equal(address.protocol,'http:');
assert.ok(['localhost','127.0.0.1'].includes(address.hostname),
 'Stage83 never queries a Production Supabase API');
let checks=0;
const ok=(cond,label)=>{assert.ok(cond,label);checks++};
function sql(query){
 return execFileSync('psql',['-h','127.0.0.1','-p','54322',
 '-U','postgres','-d','postgres','-X','-A','-t','-v','ON_ERROR_STOP=1','-c',query],{
  encoding:'utf8',timeout:30000,env:{...process.env,PGPASSWORD:'postgres'}
 }).trim();
}
const n=query=>Number(sql(query));
const variant=id=>n("SELECT (v->>'stock')::integer FROM public.products p, "+
 "jsonb_array_elements(p.variants) v WHERE p.id='STAGE80-SHOE' AND v->>'id'='"+id+"'");
const parent=()=>n("SELECT stock FROM public.products WHERE id='STAGE80-SHOE'");
const md5=JSON.parse(sql(
 "SELECT jsonb_build_object('preserve',"+
 "md5(pg_get_functiondef('private.preserve_product_variant_stock()'::regprocedure)),"+
 "'aggregate',md5(pg_get_functiondef('private.sync_size_color_aggregate_stock()'::regprocedure)))::text"
));
ok(md5.preserve==='6cd5f0a9ad0927af1e17368d43491995',
 'Original preserve-variant-stock source matches current Production function MD5');
ok(md5.aggregate==='f08ae438ed985b79b6317d034bc1b780',
 'Original aggregate-size-color-stock source matches current Production function MD5');
ok(variant('red-s')===3&&variant('blue-m')===2&&parent()===5,
 'Signed checkout then cancellation restores two variant quantities and parent sum');
ok(n("SELECT count(*) FROM private.inventory_movements WHERE related_order_id='STAGE80-VARIANTS-001' "+
 "AND reason='order_deduction'")===2&&
 n("SELECT count(*) FROM private.inventory_movements WHERE related_order_id='STAGE80-VARIANTS-001' "+
 "AND reason='order_cancellation'")===2,
 'Actual inventory ledger contains expected variant stock deduction and restoration');
ok(n("SELECT coalesce(sum(quantity_delta),0) FROM private.inventory_movements "+
 "WHERE related_order_id='STAGE80-VARIANTS-001'")===0,
 'Completed cancellation balances original product order stock movement');
// Catalog editing lacks trusted inventory context and must preserve original stock.
sql("UPDATE public.products SET variants=jsonb_set(variants,'{0,stock}','99'::jsonb) "+
 "WHERE id='STAGE80-SHOE'");
ok(variant('red-s')===3&&variant('blue-m')===2&&parent()===5,
 'Untrusted product catalog edit cannot overwrite checkout-owned stock');
ok(n("SELECT count(*) FROM private.inventory_movements WHERE product_id='STAGE80-SHOE' "+
 "AND reason='unclassified_database_change'")===0,
 'Ignored stock edit does not generate fake stock movements');
// The variant was used in a real staged order, even when canceled.
assert.throws(()=>sql("UPDATE public.products SET variants=variants-0 "+
 "WHERE id='STAGE80-SHOE'"),/ERROR:/);
checks++;
ok(variant('red-s')===3&&parent()===5,
 'Referenced size/color variant cannot be deleted from order history');
// The trusted stock RPC context is the only path for a real stock adjustment.
sql("BEGIN; SELECT set_config('geostore.variant_stock_adjustment','on',true); "+
 "SELECT set_config('geostore.inventory_reason','manual_adjustment',true); "+
 "UPDATE public.products SET variants=jsonb_set(variants,'{0,stock}','4'::jsonb) "+
 "WHERE id='STAGE80-SHOE'; COMMIT;");
ok(variant('red-s')===4&&variant('blue-m')===2&&parent()===6,
 'Authorized stock change recomputes parent 4+2 under real trigger');
ok(n("SELECT count(*) FROM private.inventory_movements WHERE product_id='STAGE80-SHOE' "+
 "AND reason='manual_adjustment' AND quantity_delta=1")===1,
 'Authorized stock change creates exactly one manual movement');
sql("UPDATE public.products SET variants=jsonb_set(variants,'{0,stock}','800'::jsonb) "+
 "WHERE id='STAGE80-SHOE'");
ok(variant('red-s')===4&&parent()===6,
 'Stale ordinary editor cannot restore incorrect inventory after approved adjustment');
ok(n("SELECT count(*) FROM public.orders WHERE id LIKE 'STAGE80-%'")===3,
 'Product trigger tests never create or modify checkout orders');
console.log('PASS Stage83: '+checks+
 ' authentic extracted trigger, inventory preservation, source-parity and audit checks (localhost only).');
