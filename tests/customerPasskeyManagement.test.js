import test from 'node:test';
import assert from 'node:assert/strict';
import {manageCustomerPasskeys,normalizeCustomerPasskeyList} from '../src/utils/customerPasskeys.js';
const id='12345678-1234-1234-1234-123456789abc';
function fixture(){
 let rows=[{id,friendly_name:'Phone',created_at:'2026-11-26'}],calls=[];
 const auth={getUser:async()=>({data:{user:{id:'owner'}},error:null}),passkey:{
 list:async()=>({data:rows,error:null}),
 update:async({passkeyId,friendlyName})=>{calls.push('rename');rows=rows.map(r=>r.id===passkeyId?{...r,friendly_name:friendlyName}:r);return {error:null}},
 delete:async({passkeyId})=>{calls.push('delete');rows=rows.filter(r=>r.id!==passkeyId);return {error:null}}
 }};
 return {auth,calls};
}
test('passkey metadata lists only allowed fields and verifies mutation with fresh list',async()=>{
 const {auth,calls}=fixture();
 const run=(action,options)=>manageCustomerPasskeys(auth,'owner',action,options,()=>true);
 assert.equal((await run('list'))[0].friendlyName,'Phone');
 assert.equal((await run('rename',{id,name:' New phone '}))[0].friendlyName,'New phone');
 assert.deepEqual(await run('delete',{id,confirmed:true}),[]);
 assert.deepEqual(calls,['rename','delete']);
});
test('passkey removal requires owned listed key and explicit confirmation',async()=>{
 const {auth,calls}=fixture();
 for(const [owner,action,options] of [['other','list',{}],['owner','delete',{id}],['owner','delete',{id:'unknown',confirmed:true}],['owner','rename',{id,name:'  '}]])await assert.rejects(manageCustomerPasskeys(auth,owner,action,options,()=>true));
 assert.deepEqual(calls,[]);
});
test('account switch invalidates stale results and invalid response does not become an empty list',async()=>{
 const {auth,calls}=fixture();
 let current=true;
 auth.passkey.list=async()=>{current=false;return {data:[],error:null}};
 await assert.rejects(manageCustomerPasskeys(auth,'owner','delete',{id,confirmed:true},()=>current));
 assert.deepEqual(calls,[]);
 assert.throws(()=>normalizeCustomerPasskeyList(null));
 assert.throws(()=>normalizeCustomerPasskeyList([{id:'bad'}]));
});
