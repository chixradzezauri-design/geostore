import test from 'node:test';
import assert from 'node:assert/strict';
import {canUseCustomerPasskeys,registerCustomerPasskey,signInCustomerPasskey,CUSTOMER_PASSKEY_ROLLOUT_ENABLED} from '../src/utils/customerPasskeys.js';
const browser={isSecureContext:true,location:{origin:'https://geostore.vercel.app'},PublicKeyCredential:function(){},navigator:{credentials:{get(){},create(){}}}};
test('passkey rollout defaults off and rejects preview or insecure origins',()=>{
 assert.equal(CUSTOMER_PASSKEY_ROLLOUT_ENABLED,false);
 assert.equal(canUseCustomerPasskeys({browser}),false);
 assert.equal(canUseCustomerPasskeys({enabled:true,browser}),true);
 assert.equal(canUseCustomerPasskeys({enabled:true,browser:{...browser,location:{origin:'https://preview.vercel.app'}}}),false);
 assert.equal(canUseCustomerPasskeys({enabled:true,browser:{...browser,isSecureContext:false}}),false);
});
test('registration requires confirmed server user and server-issued credential id',async()=>{
 const auth={getUser:async()=>({data:{user:{id:'owner',email_confirmed_at:'now'}}})};
 let calls=0;
 const register=async()=>{calls++;return {data:{id:'credential'}}};
 await assert.rejects(registerCustomerPasskey(auth,'other',register));
 assert.equal(calls,0);
 assert.equal((await registerCustomerPasskey(auth,'owner',register)).id,'credential');
 await assert.rejects(registerCustomerPasskey(auth,'owner',async()=>({data:{}})));
});
test('sign in accepts only real SDK session for matching user',async()=>{
 await assert.rejects(signInCustomerPasskey(async()=>({data:{user:{id:'owner'}}})));
 await assert.rejects(signInCustomerPasskey(async()=>({data:{session:{access_token:'token',user:{id:'other'}},user:{id:'owner'}}})));
 assert.equal((await signInCustomerPasskey(async()=>({data:{session:{access_token:'token',user:{id:'owner'}},user:{id:'owner'}}}))).id,'owner');
});
