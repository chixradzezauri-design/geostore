import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyAdminFlashSales,previewFlashSaleWindow,formatFlashSaleTime} from '../src/utils/adminFlashSalePlanning.js';
const now=Date.parse('2026-11-25T12:00:00Z');
const p=(id,start,end,extra={})=>({id,flashSaleStartedAt:new Date(now+start).toISOString(),flashSaleEndsAt:new Date(now+end).toISOString(),priceGEL:80,oldPriceGEL:100,...extra});
test('admin counts every active sale and separates future, invalid and expired records',()=>{
 const summary=classifyAdminFlashSales([p('future',60000,120000),p('active',-1,60000),p('expired',-1000,-1),p('invalid',2000,1000),p('variant',-1,1000,{variants:[{}]}),...Array.from({length:5},(_,i)=>p('extra'+i,-1,2000+i))],now);
 assert.equal(summary.count,6);
 assert.deepEqual(summary.upcomingProducts.map(p=>p.id),['future']);
 assert.equal(summary.nextStartsAt,now+60000);
 assert.equal(summary.expiringCount,6);
});
test('planned date means Georgian time regardless of device timezone and does not activate',()=>{
 assert.deepEqual(previewFlashSaleWindow(3,'2026-11-26T10:00',now),{startsAt:Date.parse('2026-11-26T06:00Z'),endsAt:Date.parse('2026-11-26T09:00Z'),planningOnly:true});
 assert.equal(previewFlashSaleWindow(3,'2026-11-25T10:00',now),null);
 assert.equal(previewFlashSaleWindow(3,'2027-02-30T10:00',now),null);
 assert.equal(previewFlashSaleWindow(5,'',now),null);
 assert.deepEqual(previewFlashSaleWindow(1,'',now),{startsAt:now,endsAt:now+3600000,planningOnly:false});
 assert.ok(formatFlashSaleTime(now).includes('16:00'));
});
