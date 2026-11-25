// Staged transport only. No calls until explicitly enabled and mounted by a
// future release-approved UI. Errors never erase the local cart or wishlist.
import {validateWishlistSnapshot,projectWishlistIds} from './wishlistSyncContract.js';
import {validateCartSyncSnapshot,normalizeCartIntentLine} from './cartSyncContract.js';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validEpoch=n=>Number.isSafeInteger(n)&&n>=0;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const contracts={
 wishlist:{validate:validateWishlistSnapshot,accepted:['changed','unchanged']},
 cart:{validate:validateCartSyncSnapshot,accepted:['accepted']}
};
export function createCustomerSyncTransport({client,enabled=false,getContext}={}){
 let busy=false;
 async function request(kind,operation,intent){
  if(enabled!==true)return {status:'disabled'};
  const contract=contracts[kind];
  if(!contract||!client||typeof client.rpc!=='function'||typeof getContext!=='function')return {status:'invalid'};
  let ctx,known,args;
  try{
   ctx=getContext(kind);
   if(!ctx||ctx.authLoading!==false||typeof ctx.ownerId!=='string'||!uuid.test(ctx.ownerId)||!validEpoch(ctx.epoch))return {status:'inactive'};
   known=ctx.snapshot==null?null:contract.validate(ctx.snapshot);
   args={p_expected_owner:ctx.ownerId};
   if(operation==='change'){
    if(!known)return {status:'not-ready'};
    args.p_expected_revision=known.revision;
    if(kind==='wishlist'){
     if(typeof intent?.present!=='boolean')return {status:'invalid'};
     args.p_product_id=projectWishlistIds([{id:intent.productId}])[0];
     args.p_present=intent.present;
    }else{
     if(!['set','remove'].includes(intent?.type))return {status:'invalid'};
     args.p_action=intent.type;
     args.p_line=normalizeCartIntentLine(intent.line);
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
   if(!active())return {status:'inactive'};
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
     if(accepted&&snapshot.revision!==rev+1)return {status:'invalid-response'};
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
  changeWishlist:intent=>request('wishlist','change',intent),
  readCart:()=>request('cart','read'),
  changeCart:intent=>request('cart','change',intent)
 };
}
