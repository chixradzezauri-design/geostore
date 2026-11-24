import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePurchaseLines,verifyPurchaseRows,createAdminPurchaseApi,purchaseOperationConfirmed,purchaseCatalogOptions,purchaseLineKey} from '../src/utils/adminPurchaseApi.js';
const id='10000000-0000-4000-8000-000000000001',supplier='20000000-0000-4000-8000-000000000001',lineId='30000000-0000-4000-8000-000000000001',receipt='40000000-0000-4000-8000-000000000001';
const line={id:lineId,purchase_id:id,product_id:'base',product_name:'Base',quantity:5,received_quantity:2,unit_cost:4.25};
const received={id:receipt,purchase_id:id,line_id:lineId,quantity:2,stock_before:10,stock_after:12,unit_cost:4.25,received_at:'2026-11-24T12:00:00Z'};
const order={id,supplier_id:supplier,supplier_name:'Supplier',status:'partial',revision:3,created_at:'2026-11-24T12:00:00Z',admin_purchase_lines:[line],admin_purchase_receipts:[received]};
const owner='1060de3d-d28a-45f8-9a64-5e0368cffc4b';
const fixture=(fetchImpl,extra={})=>createAdminPurchaseApi({loadSession:async()=>({data:{session:{user:{id:owner,app_metadata:{role:'admin'}},access_token:'fixture'}}}),expectedUserId:owner,supabaseUrl:'https://fixture.invalid',apiKey:'fixture',fetchImpl,...extra});
test('validates amount, distinct base product IDs and quantities',()=>{assert.deepEqual(normalizePurchaseLines([{product_id:'p',quantity:'1',unit_cost:'0'}]),[{product_id:'p',quantity:1,unit_cost:0}]);assert.equal(normalizePurchaseLines([line,line]),null);assert.equal(normalizePurchaseLines([{...line,unit_cost:''}]),null);});
test('reconciles immutable receipts to lines and status',()=>{assert.deepEqual(verifyPurchaseRows([order]),[order]);assert.throws(()=>verifyPurchaseRows([{...order,admin_purchase_receipts:[]}]));assert.throws(()=>verifyPurchaseRows([{...order,status:'received'}]));assert.throws(()=>verifyPurchaseRows([{...order,admin_purchase_receipts:[{...received,stock_after:13}]}]));});
test('pending operations only resolve from matching server history',()=>{assert.equal(purchaseOperationConfirmed({type:'receive',orderId:id,line,receiptId:receipt,quantity:2},order),true);assert.equal(purchaseOperationConfirmed({type:'receive',orderId:id,line,receiptId:receipt,quantity:3},order),false);assert.equal(purchaseOperationConfirmed({type:'create',orderId:id,supplierId:supplier,lines:[{product_id:'base',quantity:5,unit_cost:4.25}]},order),true);});
test('receipt request uses same UUID and revision and requires exact acknowledgement',async()=>{const before={...order,status:'approved',revision:2},beforeLine={...line,received_quantity:0};const api=fixture(async(url,opts)=>{assert.match(url,/rpc\/admin_receive_purchase$/);assert.deepEqual(JSON.parse(opts.body),{p_id:id,p_line:lineId,p_receipt:receipt,p_revision:2,p_quantity:2});return {ok:true,json:async()=>({...received,idempotent_replay:true})};});assert.equal((await api.receive(before,beforeLine,receipt,2)).idempotent_replay,true);await assert.rejects(api.receive(before,beforeLine,receipt,6));});
test('owner and session guards prevent unauthorized network requests',async()=>{let calls=0;const f=async()=>{calls++;return {ok:true,json:async()=>[]};};await assert.rejects(fixture(f,{expectedUserId:'other'}).list());await assert.rejects(fixture(f,{isCurrent:()=>false}).list());assert.equal(calls,0);});

test('purchase catalog keeps independent variant identities and rejects malformed or duplicate stock',()=>{
 const product={id:'p',name:'Shoe',vendor:'Supplier',stock:0,variants:[{id:'red',name:'Red S',variantType:'size_color',stock:2},{id:'blue',name:'Blue M',variantType:'size_color',stock:4}]};
 const opts=purchaseCatalogOptions([product,{id:'base',name:'Base',vendor:'Supplier',stock:3,variants:[]}],'Supplier');
 assert.deepEqual(opts.map(x=>[x.product_id,x.variant_id,x.stock]),[['p','red',2],['p','blue',4],['base',null,3]]);
 assert.deepEqual(purchaseCatalogOptions([{...product,variants:[product.variants[0],product.variants[0]]}],'Supplier'),[]);
 assert.notEqual(purchaseLineKey('p','red'),purchaseLineKey('p','blue'));
 const one={product_id:'p',variant_id:'red',quantity:2,unit_cost:1},two={...one,variant_id:'blue'};
 assert.deepEqual(normalizePurchaseLines([one,two]),[one,two]);assert.equal(normalizePurchaseLines([one,one]),null);assert.equal(normalizePurchaseLines([{...one,variant_id:''}]),null);
});
test('variant history and create confirmation verify exact variant identity',()=>{
 const vline={...line,variant_id:'red',variant_name:'Red S',variant_type:'size_color'};
 const vorder={...order,admin_purchase_lines:[vline]};
 assert.deepEqual(verifyPurchaseRows([vorder]),[vorder]);
 assert.throws(()=>verifyPurchaseRows([{...vorder,admin_purchase_lines:[{...vline,variant_name:null}]}]));
 const op={type:'create',orderId:id,supplierId:supplier,lines:[{product_id:'base',variant_id:'red',quantity:5,unit_cost:4.25}]};
 assert.equal(purchaseOperationConfirmed(op,vorder),true);
 assert.equal(purchaseOperationConfirmed({...op,lines:[{...op.lines[0],variant_id:'blue'}]},vorder),false);
});


test('only explicit PT409 is classified as revision conflict; no automatic retry',async()=>{for(const [status,body,conflict] of [[409,{code:'PT409'},true],[409,{code:'23505'},false],[500,{code:'PT409'},false],[409,null,false]]){let calls=0;const api=fixture(async()=>{calls++;return {ok:false,status,json:async()=>body};});await assert.rejects(api.transition({...order,status:'draft'},'approve'),err=>(err.code==='PT409')===conflict);assert.equal(calls,1);}});
