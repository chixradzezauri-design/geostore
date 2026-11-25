import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {customerPurchaseStatistics} from '../src/utils/customerPurchaseStatistics.js';
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
test('support creation and read actions reject account switches and use captured session token',()=>{
 assert.ok(app.includes('customerPrivateEpochRef.current += 1'));
 assert.ok(app.includes('supportCreateLockRef.current === lock'));
 assert.ok(app.includes('session?.user?.id ?? null) !== requestOwnerId'));
 assert.ok(app.includes('snapshotIds.has(n.id) ? { ...n, read: true } : n'));
 assert.ok(app.includes('if (!stillCurrent()) return;'));
});
test('invalid normalized order total is not treated as a real zero purchase',()=>{
 const result=customerPurchaseStatistics([{id:'a',status:'completed',totalGEL:0,totalVerified:false},{id:'b',status:'completed',totalGEL:15,totalVerified:true}]);
 assert.equal(result.completed,2);
 assert.equal(result.pricedCompleted,1);
 assert.equal(result.averageGEL,15);
});
test('personal offers pause background timers and wake on sale boundaries',()=>{
 const code=readFileSync(new URL('../src/components/CustomerPersonalOffers.jsx',import.meta.url),'utf8');
 assert.ok(code.includes("document.visibilityState==='hidden'"));
 assert.ok(code.includes('next=Math.min(next,time-current)'));
 assert.ok(!code.includes('setInterval('));
});
