// Staged transport only. No calls until explicitly enabled and mounted by a
// future release-approved UI. Errors never erase the local cart or wishlist.
import {validateWishlistSnapshot,projectWishlistIds,applyVersionedWishlistIntent} from './wishlistSyncContract.js';
import {validateCartSyncSnapshot,normalizeCartIntentLine,applyCartSyncIntent} from './cartSyncContract.js';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validEpoch=n=>Number.isSafeInteger(n)&&n>=0;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const contracts={
 wishlist:{validate:validateWishlistSnapshot,accepted:['changed','unchanged']},
 cart:{validate:validateCartSyncSnapshot,accepted:['accepted']}
};
export function createCustomerSyncTransport({client,enabled=false,getContext}={}){
 let busy=false;
 async function request(kind,operation,intent,guard=null){
  if(enabled!==true)return {status:'disabled'};
  const contract=contracts[kind];
  if(!contract||!client||typeof client.rpc!=='function'||typeof getContext!=='function')return {status:'invalid'};
  let ctx,known,args,predicted;
  try{
   ctx=getContext(kind);
   if(!ctx||ctx.authLoading!==false||typeof ctx.ownerId!=='string'||!uuid.test(ctx.ownerId)||!validEpoch(ctx.epoch))return {status:'inactive'};
   known=ctx.snapshot==null?null:contract.validate(ctx.snapshot);
   args={p_expected_owner:ctx.ownerId};
   if(operation==='change'){
    if(!known)return {status:'not-ready'};
    if(guard&&(guard.ownerId!==ctx.ownerId||guard.epoch!==ctx.epoch||!same(contract.validate(guard.base),known)))return {status:'review'};
    args.p_expected_revision=known.revision;
    if(kind==='wishlist'){
     if(typeof intent?.present!=='boolean')return {status:'invalid'};
     args.p_product_id=projectWishlistIds([{id:intent.productId}])[0];
     args.p_present=intent.present;
     predicted=applyVersionedWishlistIntent(known,known.revision,{productId:args.p_product_id,present:args.p_present});
    }else{
     if(!['set','remove'].includes(intent?.type))return {status:'invalid'};
     args.p_action=intent.type;
     args.p_line=normalizeCartIntentLine(intent.line);
     predicted=applyCartSyncIntent(known,known.revision,{type:args.p_action,line:args.p_line});
    }
   }
  }catch{return {status:'invalid'};}
  if(busy)return {status:'busy'};
  // Capture scalar owner and epoch, not a mutable caller-owned object.
  const ownerId=ctx.ownerId,epoch=ctx.epoch;
  const active=()=>{
   try{
    const now=getContext(kind);
    return now?.authLoading===false&&now.ownerId===ownerId&&now.epoch===epoch?now:null;
   }catch{return null;}
  };
  busy=true;
  try{
   const beforeSend=active();
   if(!beforeSend)return {status:'inactive'};
   if(guard&&operation==='change'){
    try{if(!same(contract.validate(beforeSend.snapshot),known))return {status:'review'};}
    catch{return {status:'review'};}
   }
   let result;
   try{result=await client.rpc('customer_'+kind+'_'+operation,args);}
   catch{return {status:active()?'uncertain':'inactive'};}
   const current=active();
   if(!current)return {status:'inactive'};
   if(!result||result.error||result.data==null)return {status:'uncertain'};
   try{
    const status=operation==='read'?'ready':result.data.status;
    const accepted=contract.accepted.includes(status);
    if(operation==='change'&&!accepted&&!['conflict','limit','unavailable'].includes(status))return {status:'invalid-response'};
    const snapshot=contract.validate(operation==='read'?result.data:result.data.snapshot);
    if(operation==='change'){
     const rev=known.revision;
     // A new revision alone is not proof that the intended mutation occurred.
     if(accepted&&(status!==predicted.status||!same(snapshot,predicted.snapshot)))return {status:'invalid-response'};
     if(status==='conflict'&&snapshot.revision<=rev)return {status:'invalid-response'};
     if(['limit','unavailable'].includes(status)&&(!same(snapshot,known)))return {status:'invalid-response'};
    }
    const latest=current.snapshot==null?null:contract.validate(current.snapshot);
    if(latest&&snapshot.revision<latest.revision)return {status:'stale'};
    if(latest&&snapshot.revision===latest.revision&&!same(snapshot,latest))return {status:'invalid-response'};
    return {status,snapshot,ownerId,epoch};
   }catch{return {status:'invalid-response'};}
  }finally{busy=false;}
 }
 return {
  readWishlist:()=>request('wishlist','read'),
  changeWishlist:(intent,guard)=>request('wishlist','change',intent,guard),
  readCart:()=>request('cart','read'),
  changeCart:(intent,guard)=>request('cart','change',intent,guard)
 };
}
