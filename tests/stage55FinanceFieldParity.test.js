import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { redactCustomerCheckoutItems } from '../src/utils/orderSafety.js';

const checkout=readFileSync(new URL('../supabase/migrations/20261121170000_strip_private_costs_from_checkout_rpc.sql',import.meta.url),'utf8');
const history=readFileSync(new URL('../supabase/migrations/20261121190000_redact_alternate_costs_from_order_history.sql',import.meta.url),'utf8');
const writer=readFileSync(new URL('../supabase/migrations/20261117160000_stable_checkout_idempotency_ordering.sql',import.meta.url),'utf8');
const sqlTest=readFileSync(new URL('./sql/stage52_checkout_contract.sql',import.meta.url),'utf8');

const collect=(sql,re)=> {
  const match=sql.match(re);
  assert.ok(match,'Cannot extract public-facing redaction list');
  return match[1].match(/'[^']+'/g).map(x=>x.slice(1,-1));
};

test('Stage55: both customer-facing SQL paths remove the same internal finance keys',()=>{
  const publicFields=collect(checkout,/entry\.item - ARRAY\[([\s\S]*?)\]::text\[\]/);
  const historyFields=collect(history,/item\.value - ARRAY\[([\s\S]*?)\]::text\[\]/);
  assert.deepEqual(publicFields,historyFields);
  for (const field of [
    'purchase_cost','purchaseCost','cost_price','costPrice','vendor',
    'unit_cost','unitCost','cost','margin','profit','supplier','supplier_name','supplierName'
  ]) assert.ok(publicFields.includes(field),'Internal field not redacted: '+field);
  assert.match(writer,/'vendor', v_product\.vendor/);
});

test('Stage55: client redaction keeps customer-selected variants and prices only',()=>{
  const internal={
    id:'item',price:150,base_price:130,addon_total:20,quantity:2,
    selectedSize:'L',customVariantName:'Premium',gift_wrap:true,
    purchase_cost:25,purchaseCost:26,cost_price:27,costPrice:28,
    vendor:'internal-vendor',unit_cost:29,unitCost:30,cost:31,
    margin:32,profit:33,supplier:'internal-supplier',
    supplier_name:'hidden',supplierName:'hidden'
  };
  const publicItem=redactCustomerCheckoutItems([internal])[0];
  assert.deepEqual(publicItem,{
    id:'item',price:150,base_price:130,addon_total:20,quantity:2,
    selectedSize:'L',customVariantName:'Premium',gift_wrap:true
  });
  assert.equal(internal.vendor,'internal-vendor','Redaction must never mutate financial snapshots');
});

test('Stage55: disposable PostgreSQL fixture proves vendor, supplier and finance aliases are stripped',()=>{
  assert.match(sqlTest,/'vendor', 'internal-maker'/);
  assert.match(sqlTest,/'supplier', 'internal-supplier'/);
  assert.match(sqlTest,/ARRAY\['purchase_cost','purchaseCost','cost_price','costPrice','vendor'/);
  assert.match(sqlTest,/result->'items'->0 \? 'vendor'/);
  assert.match(sqlTest,/replay->'items'/);
  assert.match(sqlTest,/finance->'items'->0->>'vendor'/);
  assert.doesNotMatch(checkout,/UPDATE public\.orders|DELETE FROM public\.orders|INSERT INTO public\.orders/i);
});
