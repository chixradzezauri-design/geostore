import test from 'node:test';
import assert from 'node:assert/strict';
import {startSystemHistoryRefresh,HISTORY_REFRESH_INTERVAL} from '../src/utils/systemHistoryRefresh.js';
test('refresh is opt-in, every two minutes, only on visible page and no overlap',async()=>{
 let tick,visible=false,calls=0,resolve,cleared=false;
 const stop=startSystemHistoryRefresh({visible:()=>visible,refresh:()=>{calls++;return new Promise(r=>{resolve=r;});},setTimer:(fn,ms)=>{tick=fn;assert.equal(ms,120000);return 9;},clearTimer:id=>{assert.equal(id,9);cleared=true;}});
 assert.equal(calls,0);await tick();assert.equal(calls,0);
 visible=true;const pending=tick();await tick();assert.equal(calls,1);resolve();await pending;
 stop();await tick();assert.equal(calls,1);assert.equal(cleared,true);
});
test('failed read does not trigger a retry burst or disable future ticks',async()=>{
 let tick,calls=0;
 const stop=startSystemHistoryRefresh({visible:()=>true,refresh:async()=>{calls++;throw Error('fixture');},setTimer:(fn,ms)=>{assert.equal(ms,HISTORY_REFRESH_INTERVAL);tick=fn;return 1;},clearTimer:()=>{}});
 await tick();assert.equal(calls,1);await tick();assert.equal(calls,2);stop();
});
