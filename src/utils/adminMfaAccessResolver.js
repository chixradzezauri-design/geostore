// Disabled-by-default bridge for staged MFA rollout. This is not a server guard.
// Existing normalizeAdminAccess has an owner shortcut; do not use it here.
import {ADMIN_PERMISSION_KEYS,EMPTY_ADMIN_ACCESS,OWNER_ADMIN_ACCESS,isOwnerAdmin} from './adminAccess.js';
import {classifyAdminMfa} from './adminMfaTransport.js';
export function normalizeMfaEffectiveAccess(payload,user){
 if(!payload||!user?.id)return EMPTY_ADMIN_ACCESS;
 if(payload.is_admin===true&&payload.is_staff===false&&payload.role==='owner'&&isOwnerAdmin(user)
  &&ADMIN_PERMISSION_KEYS.every(k=>payload.permissions?.[k]===true))return OWNER_ADMIN_ACCESS;
 if(payload.is_admin!==false||payload.is_staff!==true||isOwnerAdmin(user))return EMPTY_ADMIN_ACCESS;
 const permissions=Object.fromEntries(ADMIN_PERMISSION_KEYS.map(k=>[k,payload.permissions?.[k]===true]));
 if(!Object.values(permissions).some(Boolean))return EMPTY_ADMIN_ACCESS;
 return {is_admin:false,is_staff:true,role:typeof payload.role==='string'?payload.role:null,
  display_name:typeof payload.display_name==='string'?payload.display_name.slice(0,100):'',permissions};
}
export function createAdminMfaAccessResolver({enabled=false,client,getContext,runAuthExclusive}={}){
 const result=(status,eligible=false,access=EMPTY_ADMIN_ACCESS)=>({status,eligible,access});
 function scope(){
  try{const c=getContext();return c?.authLoading===false&&typeof c.ownerId==='string'&&c.ownerId&&Number.isSafeInteger(c.epoch)?{ownerId:c.ownerId,epoch:c.epoch}:null;}
  catch{return null;}
 }
 return async function resolve(){
  if(enabled!==true)return result('disabled');
  if(typeof runAuthExclusive!=='function')return result('blocked');
  const start=scope();if(!start)return result('inactive');
  const active=()=>{const c=scope();return c?.ownerId===start.ownerId&&c?.epoch===start.epoch;};
  try{return await runAuthExclusive(async()=>{
   if(!active())return result('inactive');
   const userResponse=await client.auth.getUser();
   if(!active())return result('inactive');
   const user=userResponse?.data?.user;
   if(userResponse?.error||user?.id!==start.ownerId)return result('blocked');
   const eligibility=await client.rpc('admin_mfa_eligible');
   if(!active())return result('inactive');
   if(eligibility?.error||typeof eligibility?.data!=='boolean')return result('blocked');
   if(!eligibility.data)return result('not-eligible');
   const level=await client.auth.mfa.getAuthenticatorAssuranceLevel();
   if(!active())return result('inactive');
   if(level?.error)return result('blocked',true);
   const status=classifyAdminMfa(level?.data);
   if(status!=='verified')return result(status,true);
   const effective=await client.rpc('get_my_admin_access');
   if(!active())return result('inactive');
   if(effective?.error)return result('blocked',true);
   const access=normalizeMfaEffectiveAccess(effective?.data,user);
   if(access===EMPTY_ADMIN_ACCESS)return result('blocked',true);
   return result('authorized',true,access);
  });}catch{return result(active()?'blocked':'inactive');}
 };
}
