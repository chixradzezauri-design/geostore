import test from 'node:test';
import assert from 'node:assert/strict';
import {splitCompiledCss} from '../scripts/splitAdminCss.mjs';
const start='.gs-build-admin-css-start{--gs-build-admin-css-slot:start}',end='.gs-build-admin-css-end{--gs-build-admin-css-slot:end}';
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
