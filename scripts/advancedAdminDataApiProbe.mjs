// Read-only production Data API profile probe. Public anon key only.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';

export function readPublicConfig(source){
 const url=source.match(/^const SUPABASE_URL = '([^']+)';$/m)?.[1];
 const key=source.match(/^const SUPABASE_ANON_KEY = '([^']+)';$/m)?.[1];
 assert.equal(url,'https://xmtnszxtnfxnrojionoa.supabase.co','Unexpected project URL');
 assert.ok(key&&key.split('.').length===3,'Expected existing public anon JWT');
 let claims;
 try {claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString('utf8'));}
 catch {throw Error('Invalid public key format');}
 assert.equal(claims.role,'anon','Only the public anon role may probe');
 assert.equal(claims.ref,'xmtnszxtnfxnrojionoa','Unexpected anon key project');
 return {url,key};
}
export async function probeProfiles(config,fetchImpl=fetch){
 const {url,key}=config;
 const relation='geostore_release_probe_'+randomUUID().replaceAll('-','');
 const output=[];
 for(const schema of ['public','private','auth']){
  // Random nonexistent relation + limit=0. No rows, no RPC, no write.
  const r=await fetchImpl(url+'/rest/v1/'+relation+'?select=id&limit=0',{
   method:'GET',redirect:'error',cache:'no-store',
   headers:{apikey:key,Authorization:'Bearer '+key,'Accept-Profile':schema,Accept:'application/json'},
   signal:AbortSignal.timeout(15000)
  });
  const code=(await r.json())?.code;
  const expected=schema==='public'?[404,'PGRST205']:[406,'PGRST106'];
  if(r.status!==expected[0]||code!==expected[1])throw Error('Data API profile check not confirmed: '+schema+' HTTP '+r.status+' '+(typeof code==='string'&&/^[A-Z0-9]{1,12}$/.test(code)?code:'unknown'));
  output.push({schema,status:r.status,code});
 }
 return output;
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const config=readPublicConfig(readFileSync(new URL('../src/supabaseClient.js',import.meta.url),'utf8'));
 const profiles=await probeProfiles(config);
 for(const p of profiles)console.log('PASS Data API profile '+p.schema+' HTTP '+p.status+' '+p.code);
 console.log('PASS public schema routed; private and auth schema profiles rejected by production REST gateway');
}
