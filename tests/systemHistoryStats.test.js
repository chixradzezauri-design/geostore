import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeSystemHistory,pageSystemHistory} from '../src/utils/systemHistoryStats.js';
import {SYSTEM_HISTORY_ENABLED} from '../src/utils/systemHistory.js';
test('monitoring release gate remains off',()=>assert.equal(SYSTEM_HISTORY_ENABLED,false));
test('summary counts observations rather than unique incidents, warnings limited to current hour',()=>{
 const rows=[{code:'catalogue_render_error',hourAt:7200000,count:4},{code:'catalogue_render_error',hourAt:3600000,count:6},{code:'browser_runtime_error',hourAt:7200000,count:9}];
 assert.deepEqual(summarizeSystemHistory(rows,7200000),{total:19,types:2,warningTypes:1,byCode:[{code:'catalogue_render_error',count:10},{code:'browser_runtime_error',count:9}]});
 assert.equal(summarizeSystemHistory([],7200000).total,0);
});
test('history pagination bounds DOM rows and clamps page',()=>{
 const rows=Array.from({length:41},(_,i)=>i);
 assert.deepEqual(pageSystemHistory(rows,99),{page:3,pages:3,rows:[40]});
 assert.equal(pageSystemHistory(rows,1).rows.length,20);
 assert.deepEqual(pageSystemHistory([],0),{page:1,pages:1,rows:[]});
});
