// Synthetic local identities only. Browser receives no service-role key.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {createClient} from '@supabase/supabase-js';
import {chromium} from 'playwright';
const {API_URL,ANON_KEY,SERVICE_ROLE_KEY}=process.env;
assert.ok(API_URL&&ANON_KEY&&SERVICE_ROLE_KEY,'Missing disposable local credentials');
const api=new URL(API_URL);
assert.equal(api.origin,'http://127.0.0.1:54321','Refuse hosted Auth');
const host='http://localhost:4188';
const email='passkey-ci-'+randomUUID()+'@example.test',password='Local-Only-A7!'+randomUUID();
const admin=createClient(API_URL,SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const created=await admin.auth.admin.createUser({email,password,email_confirm:true});
assert.equal(created.error,null,'Synthetic identity creation');
const owner=created.data.user.id;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','localhost','--port','4188','--strictPort'],{stdio:'ignore'});
let browser;
try{
 let ready=false;
 for(let i=0;i<100;i++){
  try{if((await fetch(host+'/tests/browser/customerPasskeyRealFixture.html',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}
  if(server.exitCode!==null)break;
  await new Promise(resolve=>setTimeout(resolve,250));
 }
 assert.ok(ready,'Local fixture server ready');
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({serviceWorkers:'block'});
 await context.route('**/*',route=>[host,api.origin].includes(new URL(route.request().url()).origin)?route.continue():route.abort());
 const page=await context.newPage();
 const cdp=await context.newCDPSession(page);
 await cdp.send('WebAuthn.enable');
 const {authenticatorId}=await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}});
 await page.goto(host+'/tests/browser/customerPasskeyRealFixture.html');
 await page.waitForFunction(()=>Boolean(window.passkeyFixture));
 assert.equal(await page.evaluate(args=>window.passkeyFixture.init(...args),[API_URL,ANON_KEY,email,password]),owner);
 const id=await page.evaluate(()=>window.passkeyFixture.enroll());
 assert.ok(id,'Server-confirmed credential ID');
 const stored=await cdp.send('WebAuthn.getCredentials',{authenticatorId});
 assert.equal(stored.credentials.length,1,'Actual virtual authenticator stores one credential');
 assert.equal(stored.credentials[0].rpId,'localhost');
 const rows=await page.evaluate(()=>window.passkeyFixture.manage('list'));
 assert.ok(rows.some(row=>row.id===id),'Auth server returns enrolled credential');
 await page.evaluate(()=>window.passkeyFixture.logout());
 assert.equal(await page.evaluate(()=>window.passkeyFixture.hasSession()),false);
 assert.equal(await page.evaluate(()=>window.passkeyFixture.quickLogin()),owner,'Passkey cryptographic ceremony issues verified session');
 const renamed=await page.evaluate(id=>window.passkeyFixture.manage('rename',{id,name:'CI virtual device'}),id);
 assert.equal(renamed.find(row=>row.id===id)?.friendlyName,'CI virtual device');
 const remaining=await page.evaluate(id=>window.passkeyFixture.manage('delete',{id,confirmed:true}),id);
 assert.equal(remaining.some(row=>row.id===id),false);
 await page.evaluate(()=>window.passkeyFixture.logout());
 await assert.rejects(page.evaluate(()=>window.passkeyFixture.quickLogin()),'Revoked authenticator rejected by real Auth');
 assert.equal(await page.evaluate(()=>window.passkeyFixture.hasSession()),false);
 assert.equal(await page.evaluate(args=>window.passkeyFixture.passwordLogin(...args),[email,password]),owner,'Password fallback remains valid');
 console.log('PASS real local Auth WebAuthn enrollment, session, rename, revocation, revoked-key rejection and password fallback');
 await cdp.send('WebAuthn.removeVirtualAuthenticator',{authenticatorId});
}finally{
 if(browser)await browser.close();
 server.kill();
}
