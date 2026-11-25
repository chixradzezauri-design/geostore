// Pure staged cart synchronization contract. No live persistence or checkout wiring.
// Cart rows are intentions, never authoritative prices or inventory reservations.
export const MAX_SYNC_CART_LINES=100;
const revisionOk=n=>Number.isSafeInteger(n)&&n>=0;
const field=(value,max,required=false)=>{
  if(value==null&&!required)return null;
  if(typeof value!=='string'||value!==value.trim()||!value.length||value.length>max)throw new TypeError('Invalid cart identity');
  return value;
};
export function normalizeCartIntentLine(line){
  if(!line||typeof line!=='object'||Array.isArray(line))throw new TypeError('Invalid cart line');
  if(typeof line.giftWrap!=='boolean'||typeof line.vipWarranty!=='boolean')throw new TypeError('Invalid cart add-ons');
  if(!Number.isSafeInteger(line.quantity)||line.quantity<1||line.quantity>100)throw new RangeError('Invalid cart quantity');
  return {productId:field(line.productId,160,true),size:field(line.size,100),color:field(line.color,100),
    variantId:field(line.variantId,120),giftWrap:line.giftWrap,vipWarranty:line.vipWarranty,quantity:line.quantity};
}
export function cartIntentKey(line){
  const item=normalizeCartIntentLine(line);
  return JSON.stringify([item.productId,item.size,item.color,item.variantId,item.giftWrap,item.vipWarranty]);
}
export function validateCartIntentLines(lines){
  if(!Array.isArray(lines)||lines.length>MAX_SYNC_CART_LINES)throw new RangeError('Invalid cart length');
  const normalized=lines.map(normalizeCartIntentLine);
  const keys=normalized.map(cartIntentKey);
  if(new Set(keys).size!==keys.length)throw new Error('Ambiguous cart line identity');
  return normalized;
}
// Projection fails closed rather than silently collapsing legacy lines or uploading
// personalized text. Existing local cart stays untouched if projection is blocked.
export function projectCartIntents(cart){
  if(!Array.isArray(cart))throw new TypeError('Invalid local cart');
  return validateCartIntentLines(cart.map(item=>{
    if(!item||typeof item!=='object'||Array.isArray(item))throw new TypeError('Invalid local cart line');
    if(typeof item.giftWrap!=='boolean'||typeof item.vipWarranty!=='boolean'||
       typeof item.giftMessage!=='string'||item.giftMessage.trim()!=='')
      throw new Error('Personalized or legacy cart requires explicit resolution');
    return {productId:item.id,size:item.selectedSize??null,color:item.selectedColor??null,
      variantId:item.customVariantId??null,giftWrap:item.giftWrap,vipWarranty:item.vipWarranty,quantity:item.quantity};
  }));
}
export function validateCartSyncSnapshot(snapshot){
  if(!snapshot||!revisionOk(snapshot.revision))throw new TypeError('Invalid cart revision');
  return {revision:snapshot.revision,lines:validateCartIntentLines(snapshot.lines)};
}
// CAS, not last-write-wins. An accepted no-op consumes the revision as well.
export function applyCartSyncIntent(snapshot,expectedRevision,intent){
  const current=validateCartSyncSnapshot(snapshot);
  if(!revisionOk(expectedRevision))throw new TypeError('Invalid expected revision');
  if(expectedRevision!==current.revision)return {status:'conflict',snapshot:current};
  if(!intent||!['set','remove'].includes(intent.type))throw new TypeError('Invalid cart intent');
  const line=normalizeCartIntentLine(intent.line);
  const key=cartIntentKey(line);
  const index=current.lines.findIndex(item=>cartIntentKey(item)===key);
  let lines=[...current.lines];
  if(intent.type==='remove'){if(index>=0)lines.splice(index,1);}
  else if(index>=0)lines[index]=line;
  else {
    if(lines.length>=MAX_SYNC_CART_LINES)return {status:'limit',snapshot:current};
    lines.push(line);
  }
  if(current.revision===Number.MAX_SAFE_INTEGER)throw new RangeError('Revision exhausted');
  return {status:'accepted',snapshot:{revision:current.revision+1,lines}};
}
// A checkout clear is permitted only for the exact acknowledged cart revision,
// and never rebased onto a newer remote cart. This helper does not authorize
// checkout or validate receipts. Server-side order ownership/idempotency and
// transaction integration are required before enabling a real checkout clear.
export function planCartCheckoutClear(snapshot,checkoutRevision){
  const current=validateCartSyncSnapshot(snapshot);
  if(!revisionOk(checkoutRevision))throw new TypeError('Invalid checkout revision');
  if(current.revision!==checkoutRevision)return {status:'conflict',snapshot:current};
  if(current.revision===Number.MAX_SAFE_INTEGER)throw new RangeError('Revision exhausted');
  return {status:'candidate',snapshot:{revision:current.revision+1,lines:[]}};
}
