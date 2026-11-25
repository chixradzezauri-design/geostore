import test from 'node:test';
import assert from 'node:assert/strict';
import {customerPurchaseStatistics,purchaseMonth} from '../src/utils/customerPurchaseStatistics.js';
const now=Date.parse('2026-11-26T10:00:00Z');
const row=(id,status,totalGEL,created_at='2026-11-10T00:00:00Z')=>({id,status,totalGEL,created_at});
test('statistics use completed order totals only and deduplicate order IDs',()=>{
 const rows=[row('a','completed',12.35),row('b','დასრულებული',20.15),row('c','cancelled',100),row('d','new',500),row('a','completed',12.35),row('e','unknown',700)];
 const s=customerPurchaseStatistics(rows,{now});
 assert.equal(s.total,5);assert.equal(s.completed,2);assert.equal(s.pending,1);assert.equal(s.cancelled,1);assert.equal(s.unknown,1);
 assert.equal(s.totalGEL,32.5);assert.equal(s.averageGEL,16.25);
 assert.equal(s.months.at(-1).totalGEL,32.5);
});
test('periods follow Tbilisi calendar and chart keeps the last six months',()=>{
 assert.equal(purchaseMonth('2026-10-31T21:00:00Z'),'2026-11');
 assert.equal(purchaseMonth('invalid'),null);
 const rows=[row('a','delivered',10,'2026-10-31T21:00:00Z'),row('b','completed',20,'2026-07-01T00:00:00Z'),row('c','completed',50,'2026-05-01T00:00:00Z')];
 assert.equal(customerPurchaseStatistics(rows,{period:'month',now}).totalGEL,10);
 assert.equal(customerPurchaseStatistics(rows,{period:'six',now}).totalGEL,30);
 assert.equal(customerPurchaseStatistics(rows,{now}).totalGEL,80);
 assert.deepEqual(customerPurchaseStatistics(rows,{now}).months.map(m=>m.key),['2026-06','2026-07','2026-08','2026-09','2026-10','2026-11']);
});
test('empty and invalid totals do not create fictitious payments',()=>{
 assert.equal(customerPurchaseStatistics([], {now}).averageGEL,null);
 const s=customerPurchaseStatistics([row('a','completed',NaN),row('b','completed',-10)],{now});
 assert.equal(s.completed,2);assert.equal(s.totalGEL,0);assert.equal(s.averageGEL,null);
});
