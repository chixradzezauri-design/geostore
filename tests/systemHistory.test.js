import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSystemHistory,createSystemHistoryReader} from '../src/utils/systemHistory.js';
const row={hour_at:'2026-11-25T06:00:00Z',code:'browser_runtime_error',observations:7};
test('accepts only fixed hourly aggregates',()=>{assert.deepEqual(normalizeSystemHistory([row]),[{hourAt:Date.parse(row.hour_at),code:row.code,count:7}]);for(const rows of [[{...row,email:'private'}],[{...row,code:'private token'}],[row,row],[{...row,observations:1000001}],[{...row,hour_at:'2026-11-25T06:01:00Z'}]])assert.equal(normalizeSystemHistory(rows),null);});
test('disabled reader never calls backend and late responses are discarded',async()=>{const ctx={ownerId:'fixture',isOwner:true,epoch:1};let calls=0;const client={auth:{getUser:async()=>({data:{user:{id:'fixture'}}})},rpc:async()=>{calls++;ctx.epoch++;return {data:[row]};}};const opts={client,getContext:()=>ctx};assert.equal((await createSystemHistoryReader(opts)(24)).status,'disabled');assert.equal(calls,0);assert.equal((await createSystemHistoryReader({...opts,enabled:true})(24)).status,'inactive');});
