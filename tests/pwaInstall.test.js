import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {getInstallPlatform,isStandaloneApp} from '../src/utils/pwaInstall.js';
test('device detection handles iPad desktop mode and Android',()=>{assert.equal(getInstallPlatform({userAgent:'iPhone'}),'ios');assert.equal(getInstallPlatform({platform:'MacIntel',maxTouchPoints:5}),'ios');assert.equal(getInstallPlatform({userAgent:'Android'}),'android');assert.equal(getInstallPlatform({platform:'MacIntel',maxTouchPoints:0}),'desktop');});
test('standalone app detection',()=>{assert.equal(isStandaloneApp({navigator:{standalone:true}}),true);assert.equal(isStandaloneApp({matchMedia:()=>({matches:true})}),true);assert.equal(isStandaloneApp({}),false);});
test('local PNG icons have valid dimensions and decodable RGB scanlines',()=>{for(const size of [180,192,512]){const b=readFileSync(new URL('../public/icons/geostore-'+size+'.png',import.meta.url));assert.deepEqual([...b.subarray(0,8)],[137,80,78,71,13,10,26,10]);assert.equal(b.readUInt32BE(16),size);assert.equal(b.readUInt32BE(20),size);let pos=8;const chunks=[];while(pos<b.length){const n=b.readUInt32BE(pos),type=b.toString('ascii',pos+4,pos+8);if(type==='IDAT')chunks.push(b.subarray(pos+8,pos+8+n));pos+=12+n;}assert.equal(inflateSync(Buffer.concat(chunks)).length,size*(size*3+1));assert.ok(b.length<40000);}});
