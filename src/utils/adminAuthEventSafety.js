// Keep the Auth SDK callback synchronous. Even a microtask may run before
// the SDK releases its internal lock; use a separate task and cancel stale work.
export function createDeferredAuthResolution({scheduleTask=fn=>setTimeout(fn,0),cancelTask=id=>clearTimeout(id)}={}){
 let timer=null,generation=0;
 function cancel(){generation++;if(timer!==null){cancelTask(timer);timer=null;}}
 return {cancel,schedule(task){
  cancel();const g=generation;
  timer=scheduleTask(()=>{if(g!==generation)return;timer=null;void task();});
 }};
}
export function advanceMfaScope(previous,userId,event){
 const ownerId=userId||null;
 // Recovery remains non-privileged until a signed-out boundary or a different
 // authenticated account. USER_UPDATED and TOKEN_REFRESHED cannot clear it.
 const recovery=Boolean(ownerId&&(event==='PASSWORD_RECOVERY'||(previous?.ownerId===ownerId&&previous.recovery===true)));
 return {ownerId,epoch:(previous?.epoch??0)+1,authLoading:!ownerId,adminEligible:false,recovery};
}
export function isMfaScopeCurrent(start,current){
 return Boolean(start?.ownerId&&start.ownerId===current?.ownerId&&start.epoch===current.epoch&&current.recovery!==true);
}
