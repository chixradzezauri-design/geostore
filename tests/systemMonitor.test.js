import test from 'node:test';
import assert from 'node:assert/strict';
import {createSystemMonitor,installBrowserDiagnostics} from '../src/utils/systemMonitor.js';
test('only fixed codes are accepted and snapshots contain no supplied detail',()=>{
 const m=createSystemMonitor({now:()=>123456});
 assert.equal(m.record('token=private'),false);
 assert.equal(m.record({code:'browser_runtime_error',password:'private'}),false);
 assert.equal(m.record('browser_runtime_error',{message:'private'}),true);
 assert.deepEqual(m.snapshot(),[{code:'browser_runtime_error',minute:120000,count:1}]);
 const rows=m.snapshot();rows[0].count=99;assert.equal(m.snapshot()[0].count,1);
});
test('duplicate counts capped, old buckets expire and memory bounded',()=>{
 let time=0;const m=createSystemMonitor({now:()=>time});
 for(let i=0;i<1500;i++)m.record('browser_runtime_error');
 assert.equal(m.snapshot()[0].count,1000);
 for(let i=0;i<50;i++){time+=60000;m.record('browser_runtime_error');m.record('react_root_render_error');}
 assert.equal(m.snapshot().length,30);
 time+=30*60000;assert.deepEqual(m.snapshot(),[]);
});
test('clock errors and backwards time are safe',()=>{
 let time=120000;const m=createSystemMonitor({now:()=>time});
 m.record('browser_resource_error');time=0;m.record('browser_resource_error');
 assert.equal(m.snapshot()[0].count,2);
 time=NaN;assert.equal(m.record('browser_resource_error'),false);assert.deepEqual(m.snapshot(),[]);
});
test('event listeners use classification only and remove themselves',()=>{
 const handlers=new Map(),target={addEventListener:(n,f)=>handlers.set(n,f),removeEventListener:(n,f)=>{assert.equal(handlers.get(n),f);handlers.delete(n);}};
 const m=createSystemMonitor({now:()=>0});
 const dispose=installBrowserDiagnostics(target,m);
 handlers.get('error')({target,message:'private url'});
 handlers.get('error')({target:{src:'private url'}});
 handlers.get('unhandledrejection')({reason:new Error('private token')});
 assert.deepEqual(m.snapshot().map(r=>r.code),['browser_runtime_error','browser_resource_error','browser_unhandled_rejection']);
 assert.equal(JSON.stringify(m.snapshot()).includes('private'),false);
 dispose();assert.equal(handlers.size,0);m.clear();assert.deepEqual(m.snapshot(),[]);
});
test('monitor failure does not interrupt browser events',()=>{
 const handlers={};const target={addEventListener:(n,f)=>handlers[n]=f,removeEventListener:()=>{}};
 installBrowserDiagnostics(target,{record(){throw Error('fixture');}});
 assert.doesNotThrow(()=>handlers.unhandledrejection({reason:'private'}));
});
