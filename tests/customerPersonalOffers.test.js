import test from 'node:test';
import assert from 'node:assert/strict';
import {customerPersonalOffers} from '../src/utils/customerPersonalOffers.js';
const now=Date.parse('2026-11-26T12:00:00Z');
const item=(id,props={})=>({id,name:'Product '+id,category:'shoes',priceGEL:50,stock:3,isPublished:true,...props});
test('personal suggestions use verified catalogue and wishlist IDs not saved prices or categories',()=>{
 const rows=[item('101'),item('102'),item('103',{category:'other'}),item('104',{stock:0}),item('105',{isPublished:false})];
 const result=customerPersonalOffers(rows,[{id:'101',priceGEL:1,category:'other'}],{ready:true,now});
 assert.deepEqual(result.personal.map(p=>[p.id,p.price,p.reason]),[['101',50,'saved'],['102',50,'category']]);
 assert.deepEqual(customerPersonalOffers(rows,[{id:'101'}],{ready:false,now}),{personal:[],sales:[]});
 assert.deepEqual(customerPersonalOffers(rows,[],{ready:true,now}).personal,[]);
});
test('only active in-stock public simple-product promotions are displayed',()=>{
 const sale={oldPriceGEL:80,flashSaleStartedAt:new Date(now-1000).toISOString(),flashSaleEndsAt:new Date(now+1000).toISOString(),flashSalePercent:37.5};
 const rows=[item('101',sale),item('102',{...sale,flashSaleEndsAt:new Date(now-1).toISOString()}),item('103',{...sale,isPublished:false}),item('104',{...sale,stock:0})];
 const result=customerPersonalOffers(rows,[{id:'101'}],{ready:true,now});
 assert.deepEqual(result.sales.map(p=>p.id),['101']);
 assert.equal(result.sales[0].price,50);
 assert.equal(result.sales[0].oldPrice,80);
 assert.ok(!result.personal.some(p=>p.id==='101'));
 assert.deepEqual(customerPersonalOffers(rows,[],{ready:true,now:now+1000}).sales,[]);
});
