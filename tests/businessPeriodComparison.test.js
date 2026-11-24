import test from 'node:test';
import assert from 'node:assert/strict';
import {compareBusinessPeriods,georgianBusinessDay} from '../src/utils/businessPeriodComparison.js';
const now=new Date('2026-11-24T12:00:00Z');
const order=(date,total,status='delivered')=>({status,status_changed_at:date,rawTotalGEL:total});
test('compares equal complete Tbilisi calendar windows and excludes today, cancelled and future orders',()=>{
 const r=compareBusinessPeriods({verified:true,days:7,now,orders:[order('2026-11-17',100),order('2026-11-23T19:59:59Z',50),order('2026-11-23T20:00:00Z',999),order('2026-11-10',75),order('2026-11-16',25),order('2026-11-09',900),order('2026-11-20',500,'cancelled')]});
 assert.deepEqual([r.current.from,r.current.to,r.previous.from,r.previous.to],['2026-11-17','2026-11-23','2026-11-10','2026-11-16']);
 assert.equal(r.current.revenue,150);assert.equal(r.previous.revenue,100);assert.equal(r.change.revenue,50);assert.equal(r.change.orders,0);
});
test('unverified orders never yield metrics and zero baseline never yields invented growth',()=>{
 assert.equal(compareBusinessPeriods({orders:[],now}),null);
 const r=compareBusinessPeriods({orders:[],verified:true,now});assert.equal(r.current.revenue,0);assert.equal(r.change.revenue,null);assert.equal(r.current.averageOrder,null);
});
test('raw total is authoritative and malformed total suppresses revenue but not count',()=>{
 const r=compareBusinessPeriods({verified:true,days:7,now,orders:[{...order('2026-11-20',null),totalGEL:0}]});
 assert.equal(r.current.revenue,null);assert.equal(r.current.orders,1);assert.equal(r.current.missingTotals,1);assert.equal(r.change.revenue,null);
});
test('unplaceable delivered date suppresses both periods; creation fallback is disclosed',()=>{
 const bad=compareBusinessPeriods({verified:true,days:7,now,orders:[order('2026-02-30',20)]});assert.equal(bad.missingDates,1);assert.equal(bad.current.orders,null);assert.equal(bad.previous.revenue,null);
 const good=compareBusinessPeriods({verified:true,days:7,now,orders:[{status:'დასრულებული',created_at:'20.11.2026',total_gel:'19.99'}]});assert.equal(good.current.legacyDates,1);assert.equal(good.current.revenue,19.99);
 assert.equal(georgianBusinessDay('2026-11-20T12:00:00'),null);
});
test('supports the three intended windows and Tbilisi midnight independent of host timezone',()=>{
 const r=compareBusinessPeriods({verified:true,days:90,now:new Date('2026-11-23T20:00:00Z'),orders:[]});assert.equal(r.current.to,'2026-11-23');assert.equal((Date.parse(r.current.to)-Date.parse(r.current.from))/86400000,89);assert.equal(compareBusinessPeriods({verified:true,days:8,now,orders:[]}),null);
});
