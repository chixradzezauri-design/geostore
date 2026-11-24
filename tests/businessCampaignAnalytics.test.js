import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeBusinessCampaigns} from '../src/utils/businessCampaignAnalytics.js';
const now=new Date('2026-11-24T12:00:00Z');
const order=(code,discount=10,date='2026-11-20',status='delivered')=>({status,status_changed_at:date,rawTotalGEL:105-discount,checkoutBreakdown:{subtotalGEL:100,discountGEL:discount,deliveryGEL:5,couponCode:code}});
const run=(orders,options={})=>analyzeBusinessCampaigns({orders,verified:true,days:30,now,...options});
test('coupon association uses historical checkout snapshots, not current coupon list',()=>{
 const r=run([order(' sale '),order('SALE',20),order('',0),order('OLD',5),order('SALE',10,'2026-11-24'),order('SALE',10,'2026-11-20','cancelled')]);
 assert.equal(r.status,'ready');assert.equal(r.deliveredOrders,4);assert.equal(r.classifiedOrders,4);assert.equal(r.withCoupon.orders,3);assert.equal(r.withCoupon.revenue,280);assert.equal(r.withCoupon.discount,35);assert.equal(r.couponShare,75);assert.deepEqual(r.byCode.map(x=>[x.code,x.orders,x.revenue,x.discount]),[['SALE',2,180,30],['OLD',1,100,5]]);
 assert.equal(r.withoutRecordedCoupon.revenue,105);
});
test('unverified or empty data do not imply conversion, ROI or profit',()=>{
 assert.equal(run([],{verified:false}),null);const r=run([]);assert.equal(r.couponShare,null);assert.equal(r.withCoupon.averageOrder,null);assert.equal(r.deliveredOrders,0);assert.equal(r.byCode.length,0);
 assert.ok(!('roi' in r));assert.ok(!('conversion' in r));
});
test('unknown discounts and missing/mismatched totals are excluded and counted',()=>{
 const r=run([order('',10),order('ZERO',0),{...order('BAD'),rawTotalGEL:null,totalGEL:95},{...order('BAD'),rawTotalGEL:94.99},{...order('OLD'),checkoutBreakdown:null},order('OK')]);
 assert.equal(r.unknownOrders,5);assert.equal(r.classifiedOrders,1);assert.equal(r.unattributedDiscount,1);assert.equal(r.zeroDiscountCode,1);assert.equal(r.mismatch,2);assert.equal(r.missingBreakdown,1);assert.equal(r.couponShare,100);assert.equal(r.withCoupon.revenue,95);
});
test('unplaceable dates suppress report; legacy creation date is disclosed; Tbilisi day boundary',()=>{
 assert.deepEqual(run([order('SALE',10,'bad')]),{status:'data-quality',missingDates:1,overflow:false});
 const r=run([{...order('SALE'),status_changed_at:null,created_at:'2026-11-23T19:59:59Z'},order('SALE',10,'2026-11-23T20:00:00Z')]);assert.equal(r.deliveredOrders,1);assert.equal(r.legacyDates,1);assert.equal(r.to,'2026-11-23');
});
test('discounts and revenues are kept in tetri and amount overflow fails closed',()=>{
 const r=run([{...order('SALE'),rawTotalGEL:'0.09',checkoutBreakdown:{subtotalGEL:0.1,discountGEL:0.02,deliveryGEL:0.01,couponCode:'SALE'}}]);assert.equal(r.withCoupon.revenue,0.09);assert.equal(r.withCoupon.discount,0.02);
 const bad=run([order('SALE',101),order('A B',10)]);assert.equal(bad.mismatch,2);assert.equal(bad.classifiedOrders,0);
});
