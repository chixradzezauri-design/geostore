// Stage83: extract unmodified versioned Production stock-trigger SQL.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const read=n=>readFileSync(new URL('../supabase/migrations/'+n,import.meta.url),'utf8');
const old=read('20261107170000_integrate_custom_product_variants.sql');
const latest=read('20261109203329_admin_manage_custom_variant_stock.sql');
const trigger=read('20261108225558_size_color_inventory_stock.sql');
export const OUTPUT='/tmp/stage83-original-stock-triggers.sql';
const once=(text,marker)=>{
 assert.equal(text.split(marker).length,2,'Stage83 original marker absent or duplicate: '+marker);
 return text.indexOf(marker);
};
export function functionSql(text,name){
 const start=once(text,'CREATE OR REPLACE FUNCTION '+name+'()');
 const open=text.indexOf('AS $function$',start);
 const close=text.indexOf('$function$',open+13);
 const end=text.indexOf(';',close+10);
 assert.ok(open>start&&close>open&&end>close);
 assert.match(text.slice(close+10,end),/^\s*$/);
 return text.slice(start,end+1);
}
export function statements(text,first,last){
 const start=once(text,first),at=once(text,last);
 const end=text.indexOf(';',at+last.length);
 assert.ok(at>start&&end>at);
 assert.match(text.slice(at+last.length,end),/^\s*$/);
 return text.slice(start,end+1);
}
export function fixture(){
 const preserve=functionSql(old,'private.preserve_product_variant_stock');
 const aggregate=functionSql(latest,'private.sync_size_color_aggregate_stock');
 const preserveTrigger=statements(old,
  'DROP TRIGGER IF EXISTS preserve_product_variant_stock ON public.products',
  'REVOKE ALL ON FUNCTION private.preserve_product_variant_stock() FROM PUBLIC, anon, authenticated');
 const aggregateTrigger=statements(trigger,
  'DROP TRIGGER IF EXISTS zz_sync_size_color_aggregate_stock ON public.products',
  'EXECUTE FUNCTION private.sync_size_color_aggregate_stock()');
 assert.match(preserve,/geostore\.variant_stock_adjustment/);
 assert.match(aggregate,/jsonb_array_length/);
 assert.match(preserveTrigger,/BEFORE UPDATE OF variants/);
 assert.match(aggregateTrigger,/BEFORE INSERT OR UPDATE OF variants, stock/);
 return '-- Stage83 exact extracted original SQL: disposable CI only.\n'+
 [preserve,preserveTrigger,aggregate,aggregateTrigger].join('\n\n')+'\n';
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 writeFileSync(OUTPUT,fixture(),{mode:0o600});
 console.log('Stage83 exact source triggers extracted locally');
}
