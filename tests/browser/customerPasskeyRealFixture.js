import {createClient} from '@supabase/supabase-js';
import {registerCustomerPasskey,signInCustomerPasskey,manageCustomerPasskeys} from '../../src/utils/customerPasskeys.js';
let auth,owner;
const checked=async(promise)=>{const result=await promise;if(result.error)throw Error(result.error.code||result.error.name||'auth_failed');return result.data;};
window.passkeyFixture={
 async init(url,key,email,password){
  if(location.origin!=='http://localhost:4188'||new URL(url).hostname!=='127.0.0.1')throw Error('local_only');
  auth=createClient(url,key,{auth:{experimental:{passkey:true},persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}).auth;
  const result=await checked(auth.signInWithPassword({email,password}));owner=result.user.id;return owner;
 },
 async enroll(){return (await registerCustomerPasskey(auth,owner,()=>auth.registerPasskey())).id;},
 async manage(action,options){return manageCustomerPasskeys(auth,owner,action,options,()=>true);},
 async logout(){await checked(auth.signOut({scope:'local'}));},
 async quickLogin(){const user=await signInCustomerPasskey(()=>auth.signInWithPasskey());const actual=await checked(auth.getUser());if(actual.user.id!==user.id)throw Error('identity_mismatch');return user.id;},
 async hasSession(){return Boolean((await checked(auth.getSession())).session);},
 async passwordLogin(email,password){return (await checked(auth.signInWithPassword({email,password}))).user.id;}
};
