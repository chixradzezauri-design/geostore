import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyReactivationTotp,listReactivationTotpFactors} from '../src/utils/adminOrderReactivationMfa.js';
const ownerId='00000000-0000-4000-8000-000000000001',factorId='00000000-0000-4000-8000-000000000002',challengeId='00000000-0000-4000-8000-000000000003';
function fixture(){
 const calls=[],user={id:ownerId,app_metadata:{role:'admin'}};
 const auth={getUser:async token=>({data:{user}}),getSession:async()=>({data:{session:{access_token:'new-token',user}}}),mfa:{
 listFactors:async()=>({data:{totp:[{id:factorId,status:'verified',friendly_name:'Device'}]}}),
 challenge:async args=>{calls.push(args);return {data:{id:challengeId}};},
 verify:async args=>{calls.push(args);return {data:{access_token:'new-token'}};},
 getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal2',nextLevel:'aal2'}})}};
 return {auth,calls,opts:{client:{auth},ownerId,factorId,code:'012345',isCurrent:()=>true}};
}
test('selected verified factor returns only exact new AAL2 token',async()=>{const f=fixture();assert.equal(await verifyReactivationTotp(f.opts),'new-token');assert.deepEqual(f.calls,[{factorId},{factorId,challengeId,code:'012345'}]);});
test('unverified factor or invalid code cannot start challenge',async()=>{const f=fixture();await assert.rejects(verifyReactivationTotp({...f.opts,code:'12345'}));await assert.rejects(verifyReactivationTotp({...f.opts,factorId:challengeId}));assert.equal(f.calls.length,0);});
test('bad code, mismatched token and AAL downgrade all fail closed',async()=>{for(const mode of ['bad','token','aal']){const f=fixture();if(mode==='bad')f.auth.mfa.verify=async()=>({error:{message:'invalid'}});if(mode==='token')f.auth.getSession=async()=>({data:{session:{access_token:'different'}}});if(mode==='aal')f.auth.mfa.getAuthenticatorAssuranceLevel=async()=>({data:{currentLevel:'aal1',nextLevel:'aal2'}});await assert.rejects(verifyReactivationTotp(f.opts));}});
test('scope change during challenge prevents verification',async()=>{const f=fixture();let active=true;f.auth.mfa.challenge=async()=>{active=false;return {data:{id:challengeId}};};await assert.rejects(verifyReactivationTotp({...f.opts,isCurrent:()=>active}));assert.equal(f.calls.length,0);});
test('only verified TOTP devices are offered',async()=>{const f=fixture();f.auth.mfa.listFactors=async()=>({data:{totp:[{id:factorId,status:'verified'},{id:challengeId,status:'unverified'}]}});assert.deepEqual(await listReactivationTotpFactors(f.opts.client),[{id:factorId,label:''}]);});
