// Staged admin MFA adapter; no live calls unless enabled and mounted.
// This adapter never grants admin permission. Backend AAL enforcement is separate.
// All auth-changing operations must share the same exclusive session coordinator.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function classifyAdminMfa(level){
 if(!level||!['aal1','aal2'].includes(level.currentLevel)||!['aal1','aal2'].includes(level.nextLevel))return 'blocked';
 if(level.currentLevel==='aal2')return level.nextLevel==='aal2'?'verified':'refresh-required';
 return level.nextLevel==='aal2'?'challenge-required':'enrollment-required';
}
export function createAdminMfaTransport({enabled=false,client,getContext,runAuthExclusive}={}){
 let busy=false, enrollment=null;
 function scope(){
  try{
   const c=getContext();
   return c?.authLoading===false&&c.adminEligible===true&&typeof c.ownerId==='string'&&uuid.test(c.ownerId)&&Number.isSafeInteger(c.epoch)&&c.epoch>=0
    ?{ownerId:c.ownerId,epoch:c.epoch}:null;
  }catch{return null;}
 }
 const active=s=>{const c=scope();return c&&c.ownerId===s.ownerId&&c.epoch===s.epoch;};
 async function verifiedOwner(s){
  const r=await client.auth.getUser();
  return active(s)&&!r?.error&&r?.data?.user?.id===s.ownerId;
 }
 async function run(task){
  if(enabled!==true)return {status:'disabled'};
  if(typeof runAuthExclusive!=='function')return {status:'blocked'};
  const s=scope();if(!s)return {status:'inactive'};
  if(busy)return {status:'busy'};
  busy=true;
  try{
   return await runAuthExclusive(async()=>{
    if(!active(s)||!await verifiedOwner(s))return {status:'inactive'};
    return task(s);
   });
  }catch{return {status:active(s)?'blocked':'inactive'};}
  finally{busy=false;}
 }
 async function assurance(s){
  const r=await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if(!active(s))return {status:'inactive'};
  if(r?.error)return {status:'blocked'};
  return {status:classifyAdminMfa(r?.data)};
 }
 async function factors(s){
  const r=await client.auth.mfa.listFactors();
  if(!active(s))return {status:'inactive'};
  if(r?.error||!Array.isArray(r?.data?.totp))return {status:'blocked'};
  return {status:'ready',factors:r.data.totp.filter(f=>f?.status==='verified'&&typeof f.id==='string'&&uuid.test(f.id))
   .map(f=>({id:f.id,label:typeof f.friendly_name==='string'?f.friendly_name.slice(0,80):''}))};
 }
 return {
  inspect:()=>run(async s=>{
   const info=await assurance(s);
   if(info.status!=='challenge-required')return info;
   const list=await factors(s);
   return list.status==='ready'&&list.factors.length?{...info,factors:list.factors}: {status:list.status==='inactive'?'inactive':'blocked'};
  }),
  beginEnrollment:()=>run(async s=>{
   const info=await assurance(s);
   if(info.status!=='enrollment-required')return info;
   if(enrollment&&enrollment.ownerId===s.ownerId&&enrollment.epoch===s.epoch)return {status:'enrollment-pending'};
   if(!active(s))return {status:'inactive'};
   const r=await client.auth.mfa.enroll({factorType:'totp',friendlyName:'GEOSTORE',issuer:'GEOSTORE'});
   if(!active(s))return {status:'inactive'};
   if(r?.error||!uuid.test(r?.data?.id||'')||typeof r?.data?.totp?.secret!=='string'||!r.data.totp.secret)return {status:'blocked'};
   enrollment={...s,factorId:r.data.id};
   // Secret stays in ephemeral caller memory. Never persist, log, or inject raw SVG.
   return {status:'enrollment-pending',factorId:r.data.id,secret:r.data.totp.secret,...s};
  }),
  verify:(factorId,code)=>run(async s=>{
   if(typeof factorId!=='string'||!uuid.test(factorId)||typeof code!=='string'||!/^\d{6}$/.test(code))return {status:'invalid'};
   const info=await assurance(s);
   if(!['challenge-required','enrollment-required'].includes(info.status))return info;
   const isEnrollment=info.status==='enrollment-required'&&enrollment?.factorId===factorId&&enrollment.ownerId===s.ownerId&&enrollment.epoch===s.epoch;
   if(!isEnrollment){
    if(info.status!=='challenge-required')return {status:'invalid'};
    const list=await factors(s);
    if(list.status!=='ready')return {status:list.status};
    if(!list.factors.some(f=>f.id===factorId))return {status:'invalid'};
   }
   if(!active(s))return {status:'inactive'};
   const challenge=await client.auth.mfa.challenge({factorId});
   if(!active(s))return {status:'inactive'};
   if(challenge?.error||!uuid.test(challenge?.data?.id||''))return {status:'blocked'};
   const result=await client.auth.mfa.verify({factorId,challengeId:challenge.data.id,code});
   if(result?.error)return {status:active(s)?'verification-failed':'inactive'};
   enrollment=null;
   // MFA verification may rotate the token and emit an auth event. Never
   // grant access from this response; resolve fresh user/role/AAL independently.
   return {status:active(s)?'recheck-required':'inactive'};
  }),
  forgetEnrollment:()=>{enrollment=null;}
 };
}
