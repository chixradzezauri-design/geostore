// Deliberately compile-time disabled: not a runtime user preference.
// Do not switch on until full real Auth/Storage/API and recovery rehearsal passes.
export const ADMIN_MFA_ROLLOUT_ENABLED=false;
export function createAdminAuthCoordinator({locks,lockName='geostore:admin-auth:v1'}={}){
 return async function runExclusive(task){
  if(typeof task!=='function'||typeof locks?.request!=='function')throw new Error('Secure auth coordination unavailable');
  // Separate lock name from Supabase SDK internals. All explicit auth mutations
  // in this app must acquire this lock before entering the SDK.
  return locks.request(lockName,{mode:'exclusive'},async()=>task());
 };
}
export const runAdminAuthExclusive=createAdminAuthCoordinator({locks:typeof navigator==='undefined'?null:navigator.locks});
