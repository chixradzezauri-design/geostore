import test from 'node:test';
import assert from 'node:assert/strict';
import {createWardrobePhotoTransport,wardrobePhotoPath,isOwnedWardrobePhotoPath,WARDROBE_BUCKET} from '../src/utils/wardrobePhotoTransport.js';
const A='00000000-0000-4000-8000-000000000001',B='00000000-0000-4000-8000-000000000002',P='00000000-0000-4000-8000-000000000003';
const path=wardrobePhotoPath(A,P,'image/png');
const photo=new Blob([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])],{type:'image/png'});
function fixture(){
 const ctx={ownerId:A,epoch:1,authLoading:false},calls=[];
 const bucket={upload:async(...a)=>{calls.push(a);return {data:{path:a[0]}};},download:async p=>{calls.push(p);return {data:photo};}};
 const options={enabled:true,client:{storage:{from:id=>{assert.equal(id,WARDROBE_BUCKET);return bucket;}}},getContext:()=>ctx};
 return {ctx,calls,bucket,options,transport:createWardrobePhotoTransport(options)};
}
test('paths reject traversal, other owners and unsupported image types',()=>{
 assert.equal(isOwnedWardrobePhotoPath(A,path),true);
 for(const p of [path.replace(A,B),A+'/../'+P+'.png',A+'/'+P+'.svg',A+'/'+P+'.png?token=x'])assert.equal(isOwnedWardrobePhotoPath(A,p),false);
 assert.throws(()=>wardrobePhotoPath(A,'../test','image/png'));
 assert.throws(()=>wardrobePhotoPath(A,P,'image/svg+xml'));
});
test('disabled, guest and unsafe images do not call storage',async()=>{
 const f=fixture();
 assert.equal((await createWardrobePhotoTransport({...f.options,enabled:false}).upload(photo,P)).status,'disabled');
 assert.equal((await f.transport.upload(new Blob(['not png'],{type:'image/png'}),P)).status,'invalid');
 f.ctx.ownerId=null;assert.equal((await f.transport.download(path)).status,'inactive');assert.equal(f.calls.length,0);
});
test('upload is private and immutable; authenticated download returns a blob',async()=>{
 const f=fixture();
 assert.deepEqual(await f.transport.upload(photo,P),{status:'uploaded',path,ownerId:A,epoch:1});
 assert.deepEqual(f.calls[0],[path,photo,{contentType:'image/png',upsert:false}]);
 assert.equal((await f.transport.download(path)).blob,photo);
 assert.equal((await f.transport.download(path.replace(A,B))).status,'invalid');
 assert.equal(f.calls.length,2);
});
test('account switch during download discards old bytes',async()=>{
 const f=fixture();let finish;
 f.bucket.download=()=>new Promise(r=>{finish=r;});
 const pending=f.transport.download(path);f.ctx.ownerId=B;
 finish({data:photo});assert.deepEqual(await pending,{status:'inactive'});
});
test('upload failure is uncertain and never returns a public path as success',async()=>{
 const f=fixture();f.bucket.upload=async()=>({error:{message:'network'}});
 assert.deepEqual(await f.transport.upload(photo,P),{status:'uncertain'});
});
