import test from 'node:test';
import assert from 'node:assert/strict';
import {previewFlashPrices} from '../src/utils/adminFlashPricePreview.js';
const form={category:'bags',discountPercent:'20'};
const rows=[{id:'a',category:'bags',priceGEL:100},{id:'b',category:'bags',priceGEL:50,oldPriceGEL:100},{id:'v',category:'bags',priceGEL:100,variants:[{}]},{id:'other',category:'shoes',priceGEL:100},{id:'small',category:'bags',priceGEL:.01},{id:'bad',category:'bags',priceGEL:null},{id:'expiry',category:'bags',priceGEL:30,flashSaleEndsAt:'2026-11-27T00:00Z'}];
test('immediate preview matches original-price calculation and warns of price increases',()=>{
 const result=previewFlashPrices(rows,form);
 assert.equal(result.count,3);
 assert.equal(result.raisesPrice,1);
 assert.equal(result.rows.find(r=>r.id==='b').sale,8000);
 assert.equal(result.rows.find(r=>r.id==='b').raisesPrice,true);
 assert.deepEqual(result.excluded,{variants:1,invalid:1,existing:0,rounding:1});
});
test('scheduled preview skips existing discount and expiry metadata',()=>{
 const result=previewFlashPrices(rows,form,true);
 assert.deepEqual(result.rows.map(r=>r.id),['a']);
 assert.equal(result.excluded.existing,2);
});
test('exact cent rounding matches positive PostgreSQL numeric and rejects invalid inputs',()=>{
 assert.equal(previewFlashPrices([{id:'a',category:'bags',priceGEL:.03}],{...form,discountPercent:'50'}).rows[0].sale,2);
 for(const discountPercent of ['',100,-1,'2.345',true])assert.equal(previewFlashPrices(rows,{...form,discountPercent}),null);
 assert.equal(previewFlashPrices(rows,{...form,category:'ყველა'}).count,4);
 assert.equal(previewFlashPrices([...rows,rows[0]],form).count,3);
});
