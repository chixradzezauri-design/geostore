import test from 'node:test';
import assert from 'node:assert/strict';
import {splitCompiledCss,splitBuild} from '../scripts/splitAdminCss.mjs';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const start='.gs-build-admin-css-start-v3{--gs-build-admin-css-slot:start-v3}',end='.gs-build-admin-css-end-v3{--gs-build-admin-css-slot:end-v3}';
test('split leaves each rule in its original order',()=>{
 const a='.shop{color:red}',b='.admin-dashboard-pro.admin-dashboard-shell button{color:blue}',c='.admin-dashboard-pro.admin-dashboard-shell button{color:green}';
 const parts=splitCompiledCss(a+start+b+end+c);
 assert.deepEqual(parts,{before:a,admin:b,after:c});
});
test('fails closed for global rule, mixed selector or missing markers',()=>{
 for(const css of ['.shop{color:red}', '.admin-dashboard-pro.admin-dashboard-shell button,.shop{color:red}']){
  assert.throws(()=>splitCompiledCss('.x{color:red}'+start+css+end+'.y{color:red}'),/Non-admin/);
 }
 assert.throws(()=>splitCompiledCss('.x{color:red}'),/markers/);
});
test('conditional admin rules remain intact',()=>{
 const b='@media (max-width:600px){.admin-dashboard-pro.admin-dashboard-shell :is(button,input){color:red}}';
 assert.equal(splitCompiledCss('.x{color:red}'+start+b+end+'.y{color:red}').admin,b);
});

test('preserves Vite preload dependency path and cascade slots without modifying JS',()=>{
 const root=mkdtempSync(join(tmpdir(),'geostore-css-split-'));
 try{
  const dir=join(root,'assets');mkdirSync(dir);
  const name='index-fixture123.css';
  const before='.shop{color:red}',admin='.admin-dashboard-pro.admin-dashboard-shell button{color:blue}',after='.shop{color:green}';
  const entry='const deps=["assets/'+name+'"];';
  writeFileSync(join(dir,name),before+start+admin+end+after);
  writeFileSync(join(dir,'index-fixture123.js'),entry);
  const initial='<link rel="stylesheet" crossorigin href="/assets/'+name+'">';
  writeFileSync(join(root,'index.html'),'<html><head>'+initial+'</head><body></body></html>');
  splitBuild(root);
  const shell=readFileSync(join(root,'index.html'),'utf8');
  const files=readdirSync(dir);
  const deferred=files.find(n=>/^admin-core-[a-f0-9]{20}\.css$/.test(n));
  const overrides=files.find(n=>/^store-overrides-[a-f0-9]{20}\.css$/.test(n));
  assert.ok(deferred&&overrides);
  assert.equal(readFileSync(join(dir,name),'utf8'),before);
  assert.equal(readFileSync(join(dir,deferred),'utf8'),admin);
  assert.equal(readFileSync(join(dir,overrides),'utf8'),after);
  assert.equal(readFileSync(join(dir,'index-fixture123.js'),'utf8'),entry);
  assert.ok(shell.includes(initial));
  assert.ok(shell.indexOf(initial)<shell.indexOf('gs-admin-css-slot'));
  assert.ok(shell.indexOf('gs-admin-css-slot')<shell.indexOf(overrides));
  assert.ok(!shell.includes('rel="stylesheet" crossorigin href="/assets/'+deferred+'"'));
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('rejects a deceptively similar root and mixed selector after nested commas',()=>{
 for(const rule of ['.admin-dashboard-pro.admin-dashboard-shell-other{color:red}', '.admin-dashboard-pro.admin-dashboard-shell :is(button,input),.shop{color:red}']){
  assert.throws(()=>splitCompiledCss('.x{color:red}'+start+rule+end+'.y{color:red}'),/Non-admin/);
 }
});

test('actual four admin source files satisfy the exact selector safety contract',()=>{
 const sources=['adminDashboard.css','adminDashboardSections.css','adminDashboardModals.css','adminDashboardPolish.css'].map(file=>readFileSync(new URL('../src/'+file,import.meta.url),'utf8'));
 const admin=sources.join('\n');
 const result=splitCompiledCss('.shop{color:red}'+start+admin+end+'.shop{color:blue}');
 assert.ok(result.admin.includes('.admin-command-center'));
 assert.ok(result.admin.includes('.admin-dashboard-pro.admin-dashboard-shell'));
});
test('only audited command center selectors are accepted outside the admin root',()=>{
 const approved='.admin-command-center{display:grid}.admin-command-kpi:focus-visible,.admin-command-panel button:focus-visible{outline:2px solid}';
 assert.equal(splitCompiledCss('.shop{color:red}'+start+approved+end+'.shop{color:blue}').admin,approved);
 for(const selector of ['.admin-command-center-other','.admin-command-center + .shop','.admin-command-kpi,.shop','.admin-unknown']){
  assert.throws(()=>splitCompiledCss('.x{color:red}'+start+selector+'{color:red}'+end+'.y{color:red}'),/Non-admin/);
 }
});
