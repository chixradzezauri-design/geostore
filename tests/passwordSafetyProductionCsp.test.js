import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {checkPwnedPassword} from '../src/utils/passwordSafety.js';
const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
const csp=config.headers.find(entry=>entry.source==='/(.*)').headers.find(header=>header.key==='Content-Security-Policy').value;
const directives=Object.fromEntries(csp.split(';').map(x=>x.trim().split(/\s+/)).filter(x=>x[0]).map(([key,...values])=>[key,values]));
test('production CSP permits the precise HIBP hash-prefix API while preserving other restrictions',async()=>{
 assert.ok(directives['connect-src'].includes('https://api.pwnedpasswords.com'));
 assert.ok(directives['connect-src'].includes("'self'"));
 assert.ok(directives['connect-src'].includes('https://xmtnszxtnfxnrojionoa.supabase.co'));
 assert.ok(!directives['connect-src'].some(x=>x==='*'||x==='https:'||x.includes('*.')));
 assert.deepEqual(directives['script-src'],["'self'"]);
 assert.deepEqual(directives['object-src'],["'none'"]);
 assert.deepEqual(directives['frame-ancestors'],["'none'"]);
 const result=await checkPwnedPassword('Fixture!Password90',{cryptoApi:webcrypto,fetchImpl:async(url,options)=>{
  const target=new URL(url);
  assert.ok(directives['connect-src'].includes(target.origin),'Production policy permits actual helper endpoint');
  assert.match(target.pathname,/^\/range\/[A-F0-9]{5}$/);
  assert.equal(options.credentials,'omit');
  assert.equal(options.headers['Add-Padding'],'true');
  return {ok:true,text:async()=> '00000000000000000000000000000000000:0\r\n'};
 }});
 assert.deepEqual(result,{valid:true});
});
test('outage does not bypass existing breached-password protection',async()=>{
 const result=await checkPwnedPassword('Fixture!Password90',{cryptoApi:webcrypto,fetchImpl:async()=>{throw Error('network')}});
 assert.deepEqual(result,{valid:false,reason:'unavailable'});
});
