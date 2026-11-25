import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium,webkit} from 'playwright';
const host='http://127.0.0.1:4187';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4187','--strictPort'],{stdio:['ignore','pipe','pipe']});
let output='';server.stdout.on('data',v=>output+=v);server.stderr.on('data',v=>output+=v);
try{
 let ready=false;
 for(let i=0;i<80;i++){
  if(server.exitCode!==null)throw Error(output.slice(-2000));
  try{const r=await fetch(host+'/tests/browser/adminMfaFixture.html',{signal:AbortSignal.timeout(1000)});if(r.ok){ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,250));
 }
 assert.ok(ready,'Fixture server available');
 for(const engine of [chromium,webkit]){
  const browser=await engine.launch({headless:true});
  try{
   const context=await browser.newContext({viewport:{width:390,height:850},serviceWorkers:'block'});
   // No external requests, even in the event of accidental fixture regression.
   await context.route('**/*',route=>new URL(route.request().url()).origin===host?route.continue():route.abort());
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(host+'/tests/browser/adminMfaFixture.html',{waitUntil:'domcontentloaded'});
   const panel=page.getByRole('region',{name:'Two-factor authentication'});
   await panel.getByRole('button',{name:'Check status'}).click();
   const code=panel.getByLabel('Six-digit code');
   await code.waitFor({state:'visible'});
   await code.fill('123456');
   await panel.getByRole('button',{name:'Verify code'}).click();
   await panel.getByRole('status').filter({hasText:'Code could not be verified'}).waitFor({state:'visible'});
   assert.equal(await page.getByTestId('protected-fixture').count(),0);
   await code.fill('012345');
   await panel.getByRole('button',{name:'Verify code'}).click();
   await panel.getByRole('button',{name:'Recheck session'}).waitFor({state:'visible'});
   assert.equal(await page.getByTestId('protected-fixture').count(),0,'Verification alone must not grant access');
   await panel.getByRole('button',{name:'Recheck session'}).click();
   await page.getByTestId('protected-fixture').waitFor({state:'visible'});
   await page.getByRole('button',{name:'Switch fixture account'}).click();
   await page.getByTestId('protected-fixture').waitFor({state:'detached'});
   assert.equal(await panel.count(),0);
   assert.equal(await page.getByTestId('access').textContent(),'signed-out');
   assert.deepEqual(errors,[]);
   await context.close();
   console.log('PASS isolated enabled MFA UI '+engine.name()+' invalid code, recheck, account switch');
  }finally{await browser.close();}
 }
}finally{server.kill('SIGTERM');}
