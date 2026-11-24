import test from 'node:test';
import assert from 'node:assert/strict';
import {forecastBusinessSales} from '../src/utils/businessPeriodComparison.js';
const now=new Date('2026-11-24T12:00:00Z');
const order=(date,total,status='delivered')=>({status,status_changed_at:date,rawTotalGEL:total});
const history=[...Array.from({length:4},(_,i)=>Array.from({length:3},()=>order(new Date(Date.UTC(2026,9,27+i*7)).toISOString().slice(0,10),(i+1)*10))).flat()];
const run=(orders=history,options={})=>forecastBusinessSales({orders,verified:true,now,...options});
test('four complete weeks project transparent mean and historical scenarios',()=>{
 const r=run([...history,order('2026-11-24',99999),order('2026-11-20',1000,'cancelled')]);
 assert.equal(r.status,'ready');assert.equal(r.observedOrders,12);assert.equal(r.historyFrom,'2026-10-27');assert.equal(r.historyTo,'2026-11-23');
 assert.deepEqual(r.revenue,{low:30,baseline:75,high:120});assert.deepEqual(r.orders,{low:3,baseline:3,high:3});
 assert.equal(r.forecastFrom,'2026-11-24');assert.equal(r.forecastTo,'2026-11-30');
});
test('30-day horizon scales the same baseline; zero-sales weeks count',()=>{
 const r=run([...history.slice(0,9),...history.slice(0,3)],{horizon:30});
 assert.equal(r.status,'ready');assert.equal(r.activeWeeks,3);assert.equal(r.revenue.low,0);
 assert.equal(r.forecastTo,'2026-12-23');assert.equal(r.revenue.baseline,52.5*30/7);
});
test('verified sparse or too recent history does not invent a forecast',()=>{
 assert.equal(run([]).status,'insufficient');assert.equal(run(history.slice(3)).status,'insufficient');
 assert.equal(run(history,{verified:false}).status,'unverified');assert.equal(run(history,{horizon:1}).status,'invalid');
});
test('missing raw amount, invalid date, or legacy date prevents prediction',()=>{
 assert.equal(run([...history,{...order('2026-11-20',null),totalGEL:100}]).status,'data-quality');
 assert.equal(run([...history,order('bad',10)]).missingDates,1);
 assert.equal(run([...history,{status:'delivered',created_at:'2026-11-20',total_gel:10}]).legacyDates,1);
});
test('Tbilisi midnight excludes current-day events and recomputes the window',()=>{
 const r=run([...history,order('2026-11-23T20:00:00Z',10000)],{now:new Date('2026-11-23T20:01:00Z')});
 assert.equal(r.status,'ready');assert.equal(r.observedOrders,12);assert.equal(r.revenue.baseline,75);
});
