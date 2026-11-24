import test from 'node:test';
import assert from 'node:assert/strict';
import {readPublicConfig,probeProfiles} from '../scripts/advancedAdminDataApiProbe.mjs';
const jwt=role=>'e30.'+Buffer.from(JSON.stringify({role,ref:'xmtnszxtnfxnrojionoa'})).toString('base64url')+'.test';
const source=role=>"const SUPABASE_URL = 'https://xmtnszxtnfxnrojionoa.supabase.co';\nconst SUPABASE_ANON_KEY = '"+jwt(role)+"';";
test('production profile probe only accepts the existing project anon credential',()=>{
 assert.equal(readPublicConfig(source('anon')).key,jwt('anon'));
 assert.throws(()=>readPublicConfig(source('service_role')),/public anon role/);
 assert.throws(()=>readPublicConfig(source('anon').replace('xmtnszxtnfxnrojionoa.supabase.co','example.com')),/Unexpected project URL/);
});
test('probe reads only a nonexistent random relation with limit zero; private and auth must be rejected',async()=>{
 const config=readPublicConfig(source('anon')),calls=[];
 const result=await probeProfiles(config,async(url,opts)=>{
  calls.push({url,opts});
  const pub=opts.headers['Accept-Profile']==='public';
  return {status:pub?404:406,json:async()=>({code:pub?'PGRST205':'PGRST106'})};
 });
 assert.deepEqual(result.map(x=>x.schema),['public','private','auth']);
 assert.equal(new Set(calls.map(x=>x.url)).size,1);
 for(const {url,opts} of calls){
  assert.match(url,/\/rest\/v1\/geostore_release_probe_[a-f0-9]{32}\?select=id&limit=0$/);
  assert.equal(opts.method,'GET');assert.equal(opts.redirect,'error');
 }
 for(const invalid of [{status:404,code:'PGRST205'},{status:401,code:'PGRST301'},{status:200,code:null}]){
  await assert.rejects(probeProfiles(config,async(_,opts)=>opts.headers['Accept-Profile']==='public'?{status:404,json:async()=>({code:'PGRST205'})}:{status:invalid.status,json:async()=>({code:invalid.code})}),/not confirmed: private/);
 }
});
