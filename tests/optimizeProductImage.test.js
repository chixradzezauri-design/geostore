import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectJpegDimensions,fitImageDimensions,optimizeProductImage} from '../src/utils/optimizeProductImage.js';
function jpeg(width=2400,height=1600,extra=[]){
 const header=[255,216,...extra,255,192,0,8,8,height>>8,height&255,width>>8,width&255,3,255,218];
 const data=new Uint8Array(160*1024);data.set(header);
 return new Blob([data],{type:'image/jpeg'});
}
const webp=()=>new Blob([Uint8Array.from([82,73,70,70,0,0,0,0,87,69,66,80]),new Uint8Array(40000)],{type:'image/webp'});
test('preflight bounds JPEG dimensions and preserves aspect ratio',async()=>{
 assert.deepEqual(inspectJpegDimensions(new Uint8Array(await jpeg().arrayBuffer())),{width:2400,height:1600});
 assert.deepEqual(fitImageDimensions(2400,1600),{width:2048,height:1365});
 assert.deepEqual(fitImageDimensions(600,800),{width:600,height:800});
 assert.equal(fitImageDimensions(9000,9000),null);
 assert.equal(inspectJpegDimensions(new Uint8Array(await jpeg(9000,9000).arrayBuffer())),null);
 assert.equal(inspectJpegDimensions(new Uint8Array(await jpeg(2400,1600,[255,226,0,4,77,80]).arrayBuffer())),null);
});
test('accepts only validated substantially smaller WebP',async()=>{
 const original=jpeg(),encoded=webp();
 assert.equal(await optimizeProductImage(original,{encode:async()=>encoded}),encoded);
 for(const encode of [async()=>null,async()=>{throw Error('unsupported')},async()=>new Blob(['not webp'],{type:'image/webp'}),async()=>new Blob([new Uint8Array(original.size)],{type:'image/webp'})]){
  assert.equal(await optimizeProductImage(original,{encode}),original);
 }
});
test('original PNG, GIF, WebP and small JPEG never reach the encoder',async()=>{
 const png=new Blob([Uint8Array.from([137,80,78,71,13,10,26,10])],{type:'image/png'});
 const gif=new Blob([Uint8Array.from([71,73,70,56,57,97])],{type:'image/gif'});
 const small=new Blob([Uint8Array.from([255,216,255])],{type:'image/jpeg'});
 let calls=0;
 for(const file of [png,gif,webp(),small])assert.equal(await optimizeProductImage(file,{encode:async()=>{calls++;return webp();}}),file);
 assert.equal(calls,0);
 await assert.rejects(optimizeProductImage(new Blob(['bad'],{type:'image/jpeg'})));
});
