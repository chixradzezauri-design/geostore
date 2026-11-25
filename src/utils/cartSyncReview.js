// Candidate cart reconciliation. Local checkout remains untouched.
import {projectCartIntents,validateCartSyncSnapshot,cartIntentKey,applyCartSyncIntent,validateCartIntentLines,normalizeCartIntentLine} from './cartSyncContract.js';
import {getAvailableProductSizes,getAvailableProductColors,hasSizeColorInventory,hasCustomProductVariants,getProductSizeColorVariant,getCustomProductVariant} from './productVariants.js';
import {sanitizeCartSnapshot} from './cartSafety.js';
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

// Restore one explicitly selected line, preserving unrelated local rows.
// Prices come exclusively from the current catalogue, not the account snapshot.
export function planCartReviewRestore(cart,line,products){
 try{
  const requested=normalizeCartIntentLine(line),local=projectCartIntents(cart),key=cartIntentKey(requested);
  const index=local.findIndex(x=>cartIntentKey(x)===key);
  const nextLines=index<0?[...local,requested]:local.map((x,i)=>i===index?requested:x);
  if(!validateCartReviewStock(nextLines,products))return {status:'unavailable'};
  const product=products.find(p=>p.id===requested.productId);
  const variant=hasSizeColorInventory(product)?getProductSizeColorVariant(product,requested.size,requested.color):requested.variantId?getCustomProductVariant(product,requested.variantId):null;
  const rawPrice=variant?variant.priceGEL:product.priceGEL??product.price_gel;
  const price=Number(rawPrice);
  if(rawPrice==null||String(rawPrice).trim()===''||!Number.isFinite(price)||price<0||!Number.isSafeInteger(Math.round(price*100)))return {status:'unavailable'};
  const name=String(product.name??'').trim();
  if(!name||name.length>300)return {status:'unavailable'};
  const row={id:product.id,name,image:product.image||null,selectedSize:requested.size,selectedColor:requested.color,
   customVariantId:requested.variantId,customVariantName:variant?.name||'',quantity:requested.quantity,
   giftWrap:requested.giftWrap,vipWarranty:requested.vipWarranty,giftMessage:'',
   basePriceGEL:price,priceGEL:price+(requested.giftWrap?5:0)+(requested.vipWarranty?15:0),stock:Number(variant?variant.stock:product.stock)};
  const next=index<0?[...cart,row]:cart.map((x,i)=>i===index?row:x);
  const safe=sanitizeCartSnapshot(next);
  if(safe.length!==next.length||JSON.stringify(projectCartIntents(safe))!==JSON.stringify(nextLines))return {status:'blocked'};
  // Do not sanitize or change unrelated local rows as a side effect.
  return {status:'ready',cart:next,preview:{line:requested,name,priceGEL:row.priceGEL,basePriceGEL:price,localQuantity:index<0?0:local[index].quantity}};
 }catch{return {status:'blocked'};}
}
export function matchesCartRestorePreview(expected,actual){
 return Boolean(expected&&actual&&JSON.stringify(expected)===JSON.stringify(actual));
}
