// Deliberately fail closed until the server RP configuration and real Auth
// ceremony are verified. A browser authenticator alone is not authentication.
export function canUseCustomerPasskeys({enabled=false,browser}={}){
 return enabled===true&&browser?.isSecureContext===true&&
  browser.location?.origin==='https://geostore.vercel.app'&&
  typeof browser.PublicKeyCredential==='function'&&
  typeof browser.navigator?.credentials?.create==='function'&&
  typeof browser.navigator?.credentials?.get==='function';
}
export const CUSTOMER_PASSKEY_ROLLOUT_ENABLED=import.meta.env?.VITE_CUSTOMER_PASSKEY_ENABLED==='true';
export function customerPasskeyAvailable(browser,auth){
 return canUseCustomerPasskeys({enabled:CUSTOMER_PASSKEY_ROLLOUT_ENABLED,browser})&&
  typeof auth?.registerPasskey==='function'&&typeof auth?.signInWithPasskey==='function';
}
export async function registerCustomerPasskey(auth,expectedOwner,register){
 if(!expectedOwner||typeof register!=='function')throw new Error('passkey_session_required');
 const {data,error}=await auth.getUser();
 if(error||data?.user?.id!==expectedOwner||data.user.is_anonymous||!(data.user.email_confirmed_at||data.user.phone_confirmed_at))throw new Error('passkey_session_required');
 const response=await register();
 if(response?.error)throw response.error;
 if(typeof response?.data?.id!=='string'||!response.data.id)throw new Error('passkey_registration_unverified');
 return response.data;
}
export async function signInCustomerPasskey(signIn){
 if(typeof signIn!=='function')throw new Error('passkey_unavailable');
 const response=await signIn();
 if(response?.error)throw response.error;
 const {session,user}=response?.data??{};
 if(!session?.access_token||!user?.id||session.user?.id!==user.id)throw new Error('passkey_session_unverified');
 return user;
}

const passkeyIdPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function normalizeCustomerPasskeyList(rows){
 if(!Array.isArray(rows))throw new Error('passkey_list_unverified');
 const seen=new Set();
 return rows.map(row=>{
  if(!row||typeof row.id!=='string'||!passkeyIdPattern.test(row.id)||seen.has(row.id))throw new Error('passkey_list_unverified');
  seen.add(row.id);
  return {id:row.id,friendlyName:typeof row.friendly_name==='string'?row.friendly_name.slice(0,120):'',createdAt:typeof row.created_at==='string'?row.created_at:null,lastUsedAt:typeof row.last_used_at==='string'?row.last_used_at:null};
 });
}
export async function manageCustomerPasskeys(auth,owner,action,options={},stillCurrent=()=>false){
 const check=()=>{if(!owner||!stillCurrent())throw new Error('passkey_session_changed');};
 const verify=async()=>{
  check();
  const result=await auth.getUser();
  check();
  if(result?.error||result?.data?.user?.id!==owner||result.data.user.is_anonymous)throw new Error('passkey_session_required');
 };
 const list=async()=>{
  check();
  const result=await auth.passkey.list();
  check();
  if(result?.error)throw result.error;
  return normalizeCustomerPasskeyList(result?.data);
 };
 if(!['list','rename','delete'].includes(action))throw new Error('passkey_action_invalid');
 await verify();
 const rows=await list();
 if(action==='list'){await verify();return rows;}
 if(!rows.some(row=>row.id===options.id))throw new Error('passkey_not_found');
 let result;
 if(action==='rename'){
  const name=typeof options.name==='string'?options.name.trim():'';
  if(!name||Array.from(name).length>120||/[\x00-\x1f\x7f]/.test(name))throw new Error('passkey_name_invalid');
  await verify();check();
  result=await auth.passkey.update({passkeyId:options.id,friendlyName:name});
 }else{
  if(options.confirmed!==true)throw new Error('passkey_delete_confirmation_required');
  await verify();check();
  result=await auth.passkey.delete({passkeyId:options.id});
 }
 check();
 if(result?.error)throw result.error;
 if(!result||!Object.hasOwn(result,'error'))throw new Error('passkey_mutation_unverified');
 await verify();
 const updated=await list();
 await verify();
 if(action==='delete'&&updated.some(row=>row.id===options.id))throw new Error('passkey_delete_unverified');
 if(action==='rename'&&!updated.some(row=>row.id===options.id&&row.friendlyName===options.name.trim()))throw new Error('passkey_rename_unverified');
 return updated;
}
