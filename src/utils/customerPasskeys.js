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
