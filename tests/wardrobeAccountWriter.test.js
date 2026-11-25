import test from 'node:test';
import assert from 'node:assert/strict';
import {createWardrobeAccountWriter} from '../src/utils/wardrobeAccountWriter.js';
import {fitWardrobePhoto,prepareWardrobePhoto} from '../src/utils/prepareWardrobePhoto.js';
const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002',I='00000000-0000-4000-8000-000000000003',P='00000000-0000-4000-8000-000000000004';
const base={revision:0,items:[]},fields={name:'Coat',category:'Clothes'};
const jpg=()=>new Blob([Uint8Array.from([255,216,255,192,0,8,8,0,1,0,1,1,255,218])],{type:'image/jpeg'});
function fixture(){
 const ctx={ownerId:A,epoch:1,authLoading:false},map=new Map(),calls=[],ids=[I,P];
 const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
 const client={auth:{getUser:async()=>({data:{user:{id:A}}})},rpc:async(n,args)=>{calls.push(n);if(n==='customer_wardrobe_read')return {data:base};if(n==='customer_wardrobe_reserve_photo')return {data:{status:'reserved'}};return {data:{status:'accepted',snapshot:{revision:1,items:[args.p_item]}}};},storage:{from:()=>({upload:async(path,blob,options)=>{calls.push('upload');assert.equal(options.upsert,false);assert.equal(options.cacheControl,'0');return {data:{path}};}})}};
 const opts={enabled:true,client,getScope:()=>ctx,storage,locks:{request:async(k,o,cb)=>cb({name:k})},makeId:()=>ids.shift(),prepare:async()=>jpg()};
 return {ctx,map,calls,client,opts,writer:createWardrobeAccountWriter(opts)};
}
test('photo dimensions bounded, no original fallback or unsupported source',async()=>{assert.deepEqual(fitWardrobePhoto(4000,3000),{width:1600,height:1200});assert.equal(fitWardrobePhoto(10000,10000),null);const f=jpg();await assert.rejects(()=>prepareWardrobePhoto(f,{encode:async()=>f}));await assert.rejects(()=>prepareWardrobePhoto(new Blob(['abc'],{type:'image/png'})));});
test('explicit consent and disabled gate send nothing',async()=>{const f=fixture();assert.equal((await f.writer.add({base,fields})).status,'review');assert.equal((await createWardrobeAccountWriter({...f.opts,enabled:false}).add({base,fields,confirmed:true})).status,'disabled');assert.equal(f.calls.length,0);});
test('reservation before immutable photo upload and exact metadata acknowledgement',async()=>{const f=fixture();const r=await f.writer.add({base,fields,file:jpg(),confirmed:true});assert.equal(r.status,'accepted');assert.deepEqual(f.calls,['customer_wardrobe_read','customer_wardrobe_reserve_photo','upload','customer_wardrobe_change']);assert.equal(r.snapshot.items[0].photoPath,A+'/'+P+'.jpg');assert.equal(f.map.size,0);});
test('uncertain acknowledgement leaves durable marker and blocks another upload',async()=>{const f=fixture();const rpc=f.client.rpc;f.client.rpc=async(n,args)=>n==='customer_wardrobe_change'?{data:{status:'accepted',snapshot:{revision:1,items:[]}}}:rpc(n,args);assert.equal((await f.writer.add({base,fields,file:jpg(),confirmed:true})).status,'uncertain');assert.equal(f.map.size,1);assert.equal((await f.writer.add({base,fields,file:jpg(),confirmed:true})).status,'review');});
test('account switch during reservation blocks photo upload',async()=>{const f=fixture(),rpc=f.client.rpc;f.client.rpc=async(n,args)=>{if(n==='customer_wardrobe_reserve_photo'){f.ctx.ownerId=B;return {data:{status:'reserved'}};}return rpc(n,args);};assert.equal((await f.writer.add({base,fields,file:jpg(),confirmed:true})).status,'inactive');assert.equal(f.calls.includes('upload'),false);assert.equal(f.map.size,1);});
