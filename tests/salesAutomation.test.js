import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSalesAlert, isVerifiedSalesObservation } from '../src/utils/salesAutomation.js';

const now = 5000;
const sub = {id:'s1',userId:'u1',productId:'p1',variantId:'v1',kind:'price_drop',channel:'in_app',
  enabled:true,consent:true,consumedAt:null,createdAt:1000,expiresAt:6000,targetPriceTetri:null};
const old = {verified:true,published:true,productId:'p1',variantId:'v1',observedAt:2000,priceTetri:12000,stock:2};
const next = {...old,observedAt:3000,priceTetri:10000};
const evaluate = (s = sub, p = old, c = next, n = now) => evaluateSalesAlert(s,p,c,n);
test('verified price drop produces a one-shot event with exact owner and variant', () => {
  const result = evaluate();
  assert.deepEqual(result,{eventKey:JSON.stringify(['sales-alert-v1','s1']),subscriptionId:'s1',userId:'u1',kind:'price_drop',channel:'in_app',productId:'p1',variantId:'v1',priceTetri:10000,stock:2,observedAt:3000});
  assert.equal(evaluate(sub,old,{...next,observedAt:4000},5500).eventKey,result.eventKey);
});
test('price threshold is optional, exact integer tetri and inclusive', () => {
  assert.ok(evaluate({...sub,targetPriceTetri:10000}));
  for(const value of [9999,-1,NaN,10000.1,'10000',undefined]) assert.equal(evaluate({...sub,targetPriceTetri:value}),null);
});
test('restock requires zero to positive stock for the same variant', () => {
  const restock={...sub,kind:'restock'};
  assert.ok(evaluate(restock,{...old,stock:0},next));
  assert.equal(evaluate(restock,old,next),null);
  assert.equal(evaluate(restock,{...old,stock:0},{...next,stock:0}),null);
  assert.equal(evaluate(restock,{...old,stock:0},{...next,variantId:'v2'}),null);
});
test('no event for unchanged or rising price or unavailable item', () => {
  for(const patch of [{priceTetri:12000},{priceTetri:13000},{stock:0}]) assert.equal(evaluate(sub,old,{...next,...patch}),null);
});
test('requires explicit current consent, enabled state, unconsumed alert and in-app channel', () => {
  for(const patch of [{consent:false},{consent:undefined},{enabled:false},{consumedAt:4000},{consumedAt:undefined},{channel:'email'},{userId:''},{kind:'unknown'}]) assert.equal(evaluate({...sub,...patch}),null);
});
test('expired or future subscriptions cannot trigger', () => {
  for(const patch of [{expiresAt:now},{expiresAt:999},{createdAt:now+1},{createdAt:0}]) assert.equal(evaluate({...sub,...patch}),null);
});
test('observations must be verified, published, chronological and post-consent', () => {
  for(const patch of [{verified:false},{published:false},{observedAt:2000},{observedAt:5001},{observedAt:0}]) assert.equal(evaluate(sub,old,{...next,...patch}),null);
  for(const patch of [{verified:false},{published:false},{observedAt:999}]) assert.equal(evaluate(sub,{...old,...patch},next),null);
});
test('never substitutes base stock or a different product for a selected variant', () => {
  for(const patch of [{productId:'p2'},{variantId:null},{variantId:'v2'},{variantId:undefined}]) assert.equal(evaluate(sub,old,{...next,...patch}),null);
  assert.ok(evaluate({...sub,variantId:null},{...old,variantId:null},{...next,variantId:null}));
});
test('invalid, missing or coercible prices and stock fail closed', () => {
  for(const field of ['priceTetri','stock']) for(const value of [null,undefined,'0',-1,0.1,Infinity,NaN]) {
    const bad={...next,[field]:value};
    assert.equal(isVerifiedSalesObservation(bad),false);
    assert.equal(evaluate(sub,old,bad),null);
  }
  assert.equal(evaluate(sub,null,next),null);
  assert.equal(evaluate(sub,old,null),null);
});
test('does not mutate inputs or generate a new event key for retries', () => {
  const s=Object.freeze({...sub}), p=Object.freeze({...old}), c=Object.freeze({...next});
  assert.deepEqual(evaluate(s,p,c),evaluate(s,p,c));
  assert.notEqual(evaluate({...s,id:'s2'},p,c).eventKey,evaluate(s,p,c).eventKey);
});
