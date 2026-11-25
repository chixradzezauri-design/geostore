import test from 'node:test';
import assert from 'node:assert/strict';
import {parseWardrobePending,classifyWardrobeRecovery,reviewWardrobePending} from '../src/utils/wardrobePendingRecovery.js';
const A='00000000-0000-4000-8000-000000000001',I='00000000-0000-4000-8000-000000000002';
const path=A+'/'+I+'.jpg',item={id:I,name:'Coat',category:'',subCategory:'',color:'',season:'',photoPath:path};
const raw=JSON.stringify({version:1,itemId:I,photoPath:path,baseRevision:0}),marker=parseWardrobePending(raw,A),snapshot={revision:1,items:[item]};
test('only observed account result can be acknowledged; absent or reserved file stays blocked',()=>{assert.equal(classifyWardrobeRecovery(marker,snapshot,'present'),'observed');assert.equal(classifyWardrobeRecovery(marker,{revision:1,items:[]},'reserved'),'review');assert.equal(classifyWardrobeRecovery(marker,{revision:1,items:[]},'present'),'orphan');assert.equal(classifyWardrobeRecovery({...marker,action:'remove'},{revision:2,items:[]},'pending'),'observed');assert.equal(classifyWardrobeRecovery({...marker,action:'remove'},{revision:2,items:[]},'unknown'),'review');assert.throws(()=>parseWardrobePending(raw.replace(A,'00000000-0000-4000-8000-000000000003'),A));});
test('read-only proof must be rechecked before explicit marker removal',async()=>{let stored=raw;const calls=[];let data={snapshot,photoState:'present',reserved:1,pending:0};const opts={enabled:true,getScope:()=>({ownerId:A,epoch:1,authLoading:false}),storage:{getItem:()=>stored,removeItem:()=>{stored=null;}},locks:{request:async(k,o,cb)=>cb({name:k})},client:{auth:{getUser:async()=>({data:{user:{id:A}}})},rpc:async(n)=>{calls.push(n);return {data};}}};const r=await reviewWardrobePending(opts);assert.equal(r.outcome,'observed');assert.equal(stored,raw);data={...data,snapshot:{revision:2,items:[]},photoState:'pending'};assert.equal((await reviewWardrobePending({...opts,confirm:r.proof})).status,'review');assert.equal(stored,raw);data={snapshot,photoState:'present',reserved:1,pending:0};assert.equal((await reviewWardrobePending({...opts,confirm:r.proof})).status,'cleared');assert.equal(stored,null);assert.ok(calls.every(n=>n==='customer_wardrobe_recovery_status'));});

test('uploaded orphan at unchanged revision can be explicitly retired, never auto-cleared',async()=>{
 let stored=raw,rev=0,state='present';const calls=[];
 const opts={enabled:true,getScope:()=>({ownerId:A,epoch:1,authLoading:false}),storage:{getItem:()=>stored,removeItem:()=>{stored=null;}},locks:{request:async(k,o,cb)=>cb({name:k})},client:{auth:{getUser:async()=>({data:{user:{id:A}}})},rpc:async(n,args)=>{calls.push(n);if(n==='customer_wardrobe_recovery_status')return {data:{snapshot:{revision:rev,items:[]},photoState:state,reserved:1,pending:state==='pending'?1:0}};assert.deepEqual(args,{p_expected_owner:A,p_expected_revision:0,p_path:path});state='pending';rev=1;return {data:{status:'pending',revision:1}};}}};
 const first=await reviewWardrobePending(opts);assert.equal(first.outcome,'orphan');assert.equal(stored,raw);
 assert.equal((await reviewWardrobePending({...opts,retire:{...first.proof,revision:9}})).status,'review');
 assert.equal((await reviewWardrobePending({...opts,retire:first.proof})).status,'retirement-requested');assert.equal(stored,raw);
 const second=await reviewWardrobePending(opts);assert.equal(second.outcome,'retired');assert.equal(second.reserved,1);
 assert.equal((await reviewWardrobePending({...opts,confirm:second.proof})).status,'cleared');assert.equal(stored,null);
 assert.equal(calls.filter(n=>n==='customer_wardrobe_request_erasure').length,1);
});
test('orphan retirement never allowed for referenced, reserved or absent files',()=>{
 const empty={revision:0,items:[]};
 assert.equal(classifyWardrobeRecovery(marker,empty,'reserved'),'review');
 assert.equal(classifyWardrobeRecovery(marker,empty,'unknown'),'review');
 assert.equal(classifyWardrobeRecovery(marker,{revision:0,items:[{...item,id:'00000000-0000-4000-8000-000000000009'}]},'present'),'review');
});
