// Staged cross-tab coordinator. All future sync writers must use this same lock.
// Without Web Locks, fail closed: localStorage read/modify/write is not a mutex.
import {pendingSyncKey,readPendingSync,savePendingSync,markPendingAttempt,planPendingSync,clearPendingSync} from './customerSyncJournal.js';

export function createCustomerSyncCoordinator({enabled=false,locks,storage,transport,getContext,isOnline=()=>true}={}){
 async function run(kind,task){
  if(enabled!==true)return {status:'disabled'};
  if(!locks||typeof locks.request!=='function')return {status:'unsupported'};
  if(!storage||!transport||typeof getContext!=='function')return {status:'blocked'};
  let ownerId,epoch,key;
  try{
   const initial=getContext(kind);
   if(initial?.authLoading!==false||!Number.isSafeInteger(initial.epoch)||initial.epoch<0)return {status:'inactive'};
   ownerId=initial.ownerId;epoch=initial.epoch;
   key=pendingSyncKey(ownerId,kind);
  }catch{return {status:'inactive'};}
  const active=()=>{
   try{
    const ctx=getContext(kind);
    return ctx?.authLoading===false&&ctx.ownerId===ownerId&&ctx.epoch===epoch?ctx:null;
   }catch{return null;}
  };
  try{
   return await locks.request(key,{mode:'exclusive',ifAvailable:true},async lock=>{
    if(!lock)return {status:'busy'};
    if(!active())return {status:'inactive'};
    return task({ownerId,epoch,active});
   });
  }catch{return {status:'blocked'};}
 }
 const methods=kind=>kind==='cart'
  ?{read:transport.readCart,change:transport.changeCart}
  :{read:transport.readWishlist,change:transport.changeWishlist};
 async function process(kind,{ownerId,epoch,active}){
  const pending=readPendingSync(storage,ownerId,kind);
  if(pending.status!=='pending')return {status:pending.status};
  if(!isOnline())return {status:'offline'};
  const api=methods(kind);
  const read=await api.read();
  if(!active())return {status:'inactive'};
  if(read?.status!=='ready')return {status:read?.status||'blocked'};
  if(read.ownerId!==ownerId||read.epoch!==epoch)return {status:'inactive'};
  const plan=planPendingSync(pending.entry,read.snapshot);
  if(plan.status!=='send-original')return plan;
  let entry=pending.entry;
  if(entry.state==='queued'){
   const marked=markPendingAttempt(storage,entry);
   if(marked.status!=='saved')return {status:'blocked'};
   entry=marked.entry;
  }
  if(!active())return {status:'inactive'};
  // The transport verifies the exact original base immediately before sending.
  const result=await api.change(plan.intent,{ownerId,epoch,base:entry.base});
  if(!active())return {status:'inactive'};
  const accepted=kind==='cart'?['accepted']:['changed','unchanged'];
  if(!accepted.includes(result?.status))return result||{status:'blocked'};
  if(result.ownerId!==ownerId||result.epoch!==epoch)return {status:'inactive'};
  const cleared=clearPendingSync(storage,entry,{acknowledgedSnapshot:result.snapshot});
  return cleared.status==='cleared'?result:{status:cleared.status};
 }
 return {
  enqueue:(kind,base,intent)=>run(kind,({ownerId,active})=>{
   if(!active())return {status:'inactive'};
   const saved=savePendingSync(storage,ownerId,kind,base,intent);
   return {status:saved.status==='saved'?(isOnline()?'queued':'offline'):saved.status};
  }),
  reconnect:kind=>run(kind,scope=>process(kind,scope)),
  // Explicit resolution means discard the pending intent, not modify the server.
  // UI must first show the conflict and receive a deliberate user confirmation.
  discard:(kind,entry,confirmed=false)=>run(kind,({ownerId,active})=>{
   if(!confirmed||entry?.ownerId!==ownerId||entry.kind!==kind)return {status:'review'};
   if(!active())return {status:'inactive'};
   return clearPendingSync(storage,entry,{explicitResolution:true});
  })
 };
}
