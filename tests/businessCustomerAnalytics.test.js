import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeBusinessCustomers} from '../src/utils/businessCustomerAnalytics.js';
const now=new Date('2026-11-24T12:00:00Z');
const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002';
const row=(date,id,items=[],status='delivered')=>({status,status_changed_at:date,user_id:id,items,phone:'same-phone',user_email:'same@example.test'});
const run=(orders,extra={})=>analyzeBusinessCustomers({orders,now,days:30,verified:true,...extra});
test('account IDs distinguish registered customers; prior delivered orders classify returning accounts',()=>{
 const r=run([row('2026-10-01',A),row('2026-11-10',A),row('2026-11-11',A),row('2026-11-12',B),row('2026-11-13',null),row('2026-11-14',null),row('2026-11-24',B),row('2026-11-10',B,[],'cancelled')]);
 assert.equal(r.status,'ready');assert.equal(r.deliveredOrders,5);assert.equal(r.registeredOrders,3);assert.equal(r.unlinkedOrders,2);assert.equal(r.activeAccounts,2);assert.equal(r.firstObservedAccounts,1);assert.equal(r.returningAccounts,1);assert.equal(r.repeatInPeriod,1);assert.equal(r.returningRate,50);assert.equal(r.repeatRate,50);
 assert.ok(!JSON.stringify(r).includes(A));assert.ok(!JSON.stringify(r).includes('same@example.test'));
});
test('category snapshot counts units and distinct orders, discloses incomplete data',()=>{
 const r=run([row('2026-11-10',A,[{category:'ფეხსაცმელი',quantity:2},{category:'ფეხსაცმელი',quantity:'3'},{category:'',quantity:4},{category:'ტანსაცმელი',quantity:'bad'}]),row('2026-11-11',B,[{category:'ტანსაცმელი',quantity:1},{category:'ფეხსაცმელი',quantity:1}]),row('2026-11-12',null)]);
 assert.deepEqual(r.categories,[{category:'ფეხსაცმელი',units:6,orders:2},{category:'ტანსაცმელი',units:1,orders:1}]);assert.equal(r.knownUnits,7);assert.equal(r.unknownCategoryUnits,4);assert.equal(r.missingLines,1);assert.equal(r.invalidQuantityLines,1);
});
test('empty and unverified histories differ; invalid delivery dates suppress cohort totals',()=>{
 assert.equal(run([],{verified:false}),null);const r=run([]);assert.equal(r.activeAccounts,0);assert.equal(r.repeatRate,null);assert.equal(r.returningRate,null);
 assert.deepEqual(run([row('invalid',A)]),{status:'data-quality',missingDates:1});
});
test('legacy creation date is disclosed and Tbilisi midnight excludes today',()=>{
 const r=run([{status:'დასრულებული',created_at:'2026-11-23T19:59:59Z',user_id:A,items:[]},row('2026-11-23T20:00:00Z',B)]);
 assert.equal(r.deliveredOrders,1);assert.equal(r.legacyDates,1);assert.equal(r.to,'2026-11-23');
});
test('identity does not fall back to email or phone; invalid IDs are unlinked',()=>{
 const r=run([row('2026-11-01','not-uuid'),row('2026-11-02',null),row('2026-11-03',A.toUpperCase()),row('2026-11-04',A)]);
 assert.equal(r.activeAccounts,1);assert.equal(r.unlinkedOrders,2);assert.equal(r.repeatInPeriod,1);
});
