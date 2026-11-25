import test from 'node:test';
import assert from 'node:assert/strict';
import {runWardrobeErasureBatch} from '../release/phase4-wardrobe-erasure-worker.mjs';
const path='00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002.png';
function fixture({jobs=[{path}],removed={data:[{name:path}]},ack={data:{status:'erased'}}}={}){
 const calls=[];
 const client={rpc:async(name,args)=>{calls.push([name,args]);return name==='customer_wardrobe_erasure_batch'?{data:jobs}:ack;},
 storage:{from:bucket=>({remove:async paths=>{calls.push([bucket,paths]);return removed;}})}};
 return {client,calls};
}
test('worker disabled by default, no calls',async()=>{const f=fixture();assert.equal((await runWardrobeErasureBatch(f)).status,'disabled');assert.equal(f.calls.length,0);});
test('only exact server-queued paths in private bucket are removed and confirmed',async()=>{const f=fixture();assert.deepEqual(await runWardrobeErasureBatch({...f,enabled:true}),{status:'complete',erased:1,pending:0});assert.deepEqual(f.calls,[['customer_wardrobe_erasure_batch',{p_limit:10}],['customer-wardrobe-private',[path]],['customer_wardrobe_confirm_erasure',{p_path:path}]]);});
test('malformed or duplicate queue blocks all removal',async()=>{for(const jobs of [[{path:'products/secret.png'}],[{path},{path}]]){const f=fixture({jobs});assert.equal((await runWardrobeErasureBatch({...f,enabled:true})).status,'blocked');assert.equal(f.calls.length,1);}});
test('uncertain Storage response never confirms or frees quota',async()=>{for(const removed of [{data:[]},{error:{message:'offline'}},{data:[{name:'different'}]}]){const f=fixture({removed});assert.deepEqual(await runWardrobeErasureBatch({...f,enabled:true}),{status:'pending',erased:0,pending:1});assert.equal(f.calls.length,2);}});
test('SQL confirmation still present is retained as pending',async()=>{const f=fixture({ack:{data:{status:'still-present'}}});assert.equal((await runWardrobeErasureBatch({...f,enabled:true})).pending,1);});
