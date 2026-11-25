// Candidate: add-only backup factor management; no recovery bypass or removal.
import {normalizeMfaEffectiveAccess} from './adminMfaAccessResolver.js';
import {hasAnyAdminAccess} from './adminAccess.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createAdminBackupMfa({enabled=false,client,getContext,runAuthExclusive}={}){
 let pending=null,busy=false;
 function scope(){
  try{const c=getContext();return c?.authLoading===false&&c.adminEligible===true&&typeof c.ownerId==='string'&&uuid.test(c.ownerId)&&Number.isSafeInteger(c.epoch)&&c.epoch>=0?{ownerId:c.ownerId,epoch:c.epoch}:null;}catch{return null;}
 }
 const active=s=>{const c=scope();return c?.ownerId===s.ownerId&&c?.epoch===s.epoch;};
 async function run(task){
  if(enabled!==true)return {status:'disabled'};
  if(typeof runAuthExclusive!=='function')return {status:'blocked'};
  const s=scope();if(!s)return {status:'inactive'};
  if(busy)return {status:'busy'};
  busy=true;
  try{return await runAuthExclusive(async()=>{
   if(!active(s))return {status:'inactive'};
   const u=await client.auth.getUser();
   if(!active(s))return {status:'inactive'};
   if(u?.error||u?.data?.user?.id!==s.ownerId)return {status:'blocked'};
   const l=await client.auth.mfa.getAuthenticatorAssuranceLevel();
   if(!active(s))return {status:'inactive'};
   if(l?.error||l?.data?.currentLevel!=='aal2'||l.data.nextLevel!=='aal2')return {status:'blocked'};
   const p=await client.rpc('get_my_admin_access');
   if(!active(s))return {status:'inactive'};
   if(p?.error||!hasAnyAdminAccess(normalizeMfaEffectiveAccess(p?.data,u.data.user)))return {status:'blocked'};
   return task(s);
  });}catch{return {status:active(s)?'blocked':'inactive'};}
  finally{busy=false;}
 }
 async function list(s){
  const r=await client.auth.mfa.listFactors();
  if(!active(s))return {status:'inactive'};
  if(r?.error||!Array.isArray(r?.data?.all)||!Array.isArray(r?.data?.totp))return {status:'blocked'};
  const verified=r.data.totp.filter(f=>f?.status==='verified'&&typeof f.id==='string'&&uuid.test(f.id)).map(f=>({id:f.id,label:typeof f.friendly_name==='string'?f.friendly_name.slice(0,80):''}));
  return {status:'ready',verified,unfinished:r.data.all.some(f=>f?.status==='unverified'),total:r.data.all.length};
 }
 return {
  inspect:()=>run(list),
  begin:()=>run(async s=>{
   const before=await list(s);if(before.status!=='ready')return before;
   if(!before.verified.length)return {status:'blocked'};
   if(before.unfinished||pending&&active(pending))return {status:'unfinished'};
   if(before.total>=10)return {status:'limit'};
   if(!active(s))return {status:'inactive'};
   const r=await client.auth.mfa.enroll({factorType:'totp',friendlyName:'GEOSTORE backup '+(before.verified.length+1),issuer:'GEOSTORE'});
   if(!active(s))return {status:'inactive'};
   if(r?.error||typeof r?.data?.id!=='string'||!uuid.test(r.data.id)||typeof r?.data?.totp?.secret!=='string'||!/^[A-Z2-7]{16,128}={0,6}$/i.test(r.data.totp.secret))return {status:'blocked'};
   pending={...s,factorId:r.data.id};
   return {status:'setup',factorId:r.data.id,secret:r.data.totp.secret};
  }),
  verify:(code)=>run(async s=>{
   if(!pending||!active(pending)||typeof code!=='string'||!/^\d{6}$/.test(code))return {status:'invalid'};
   const factorId=pending.factorId;
   const c=await client.auth.mfa.challenge({factorId});if(!active(s))return {status:'inactive'};
   if(c?.error||typeof c?.data?.id!=='string'||!uuid.test(c.data.id))return {status:'blocked'};
   const v=await client.auth.mfa.verify({factorId,challengeId:c.data.id,code});
   if(v?.error)return {status:active(s)?'invalid':'inactive'};
   pending=null;
   // Auth may rotate epoch. Never infer backup readiness from verify alone.
   if(!active(s))return {status:'inactive'};
   const fresh=await list(s);
   return fresh.status==='ready'&&fresh.verified.some(f=>f.id===factorId)?fresh:{status:'recheck'};
  }),
  forget:()=>{pending=null;}
 };
}
