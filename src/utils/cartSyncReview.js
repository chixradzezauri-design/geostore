// Candidate cart reconciliation. Local checkout remains untouched.
import {projectCartIntents,validateCartSyncSnapshot,cartIntentKey,applyCartSyncIntent,validateCartIntentLines} from './cartSyncContract.js';
import {getAvailableProductSizes,getAvailableProductColors,hasSizeColorInventory,hasCustomProductVariants,getProductSizeColorVariant,getCustomProductVariant} from './productVariants.js';
export const CART_SYNC_ENABLED=false;
export function compareCartForReview(cart,snapshot){
 const local=projectCartIntents(cart),remote=validateCartSyncSnapshot(snapshot).lines;
 const l=new Map(local.map(x=>[cartIntentKey(x),x])),r=new Map(remote.map(x=>[cartIntentKey(x),x]));
 return {localOnly:local.filter(x=>!r.has(cartIntentKey(x))),remoteOnly:remote.filter(x=>!l.has(cartIntentKey(x))),
 quantityChanged:local.filter(x=>r.has(cartIntentKey(x))&&r.get(cartIntentKey(x)).quantity!==x.quantity).map(line=>({line,remoteQuantity:r.get(cartIntentKey(line)).quantity})),
 shared:local.filter(x=>r.get(cartIntentKey(x))?.quantity===x.quantity)};
}
export function validateCartReviewStock(lines,products){
 try{
  const normalized=validateCartIntentLines(lines);
  if(!Array.isArray(products))return false;
  const totals=new Map();
  for(const line of normalized){
   const matching=products.filter(p=>p.id===line.productId&&p.isPublished!==false&&p.is_published!==false);
   if(matching.length!==1)return false;
   const p=matching[0],sizes=getAvailableProductSizes(p),colors=getAvailableProductColors(p);
   if((sizes.length&&!line.size)||(colors.length&&!line.color)||(line.size&&!sizes.includes(line.size))||(line.color&&!colors.includes(line.color)))return false;
   const matrix=hasSizeColorInventory(p),custom=hasCustomProductVariants(p);
   if(matrix&&custom)return false;
   let variant=null;
   if(matrix)variant=getProductSizeColorVariant(p,line.size,line.color);
   else if(custom)variant=getCustomProductVariant(p,line.variantId);
   if((matrix||custom)&&(!variant||variant.id!==line.variantId))return false;
   if(!matrix&&!custom&&line.variantId!==null)return false;
   const raw=variant?variant.stock:p.stock,stock=Number(raw);
   if(raw==null||!Number.isSafeInteger(stock)||stock<1)return false;
   const key=JSON.stringify([line.productId,line.variantId]),total=(totals.get(key)||0)+line.quantity;
   if(total>stock)return false;totals.set(key,total);
  }
  return true;
 }catch{return false;}
}
export function planCartReviewPublish(cart,snapshot,line,validateStock){
 try{
  const local=projectCartIntents(cart),key=cartIntentKey(line),exact=local.find(x=>cartIntentKey(x)===key);
  if(!exact||exact.quantity!==line.quantity)return {status:'review'};
  const base=validateCartSyncSnapshot(snapshot),intent={type:'set',line:exact};
  const next=applyCartSyncIntent(base,base.revision,intent);
  if(next.status!=='accepted')return {status:next.status};
  if(validateStock(next.snapshot.lines)!==true)return {status:'unavailable'};
  return {status:'ready',intent};
 }catch{return {status:'blocked'};}
}
