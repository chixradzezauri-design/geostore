// Staged durable pending-intent journal. Not mounted in production.
// One unresolved intent per account/collection; do not silently rebase or
// replace it. Existing local cart and wishlist remain the source of UI state.
import {projectWishlistIds,validateWishlistSnapshot,applyVersionedWishlistIntent} from './wishlistSyncContract.js';
import {normalizeCartIntentLine,validateCartSyncSnapshot,applyCartSyncIntent} from './cartSyncContract.js';
const ownerPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function assertScope(ownerId,kind){
 if(typeof ownerId!=='string'||!ownerPattern.test(ownerId)||!['cart','wishlist'].includes(kind))throw new TypeError('Invalid sync scope');
}
export function pendingSyncKey(ownerId,kind){
 assertScope(ownerId,kind);return 'geostore:sync-pending:v1:'+ownerId.toLowerCase()+':'+kind;
}
const validateSnapshot=(kind,snapshot)=>kind==='cart'?validateCartSyncSnapshot(snapshot):validateWishlistSnapshot(snapshot);
function normalizeIntent(kind,intent){
 if(kind==='cart'){
  if(!['set','remove'].includes(intent?.type))throw new TypeError('Invalid cart intent');
  // This journal must not silently discard personalized or legacy cart data.
  // The caller still must run projectCartIntents over the full local cart.
  const fields=['productId','size','color','variantId','giftWrap','vipWarranty','quantity'];
  if(!intent.line||Object.keys(intent.line).some(k=>!fields.includes(k)))throw new TypeError('Unexpected cart field');
  return {type:intent.type,line:normalizeCartIntentLine(intent.line)};
 }
 if(typeof intent?.present!=='boolean')throw new TypeError('Invalid wishlist intent');
 return {productId:projectWishlistIds([{id:intent.productId}])[0],present:intent.present};
}
function normalizeEntry(ownerId,kind,entry){
 assertScope(ownerId,kind);
 if(!entry||entry.version!==1||entry.ownerId!==ownerId||entry.kind!==kind||
 !['queued','uncertain'].includes(entry.state))throw new TypeError('Invalid pending entry');
 return {version:1,ownerId,kind,state:entry.state,base:validateSnapshot(kind,entry.base),intent:normalizeIntent(kind,entry.intent)};
}
export function readPendingSync(storage,ownerId,kind){
 const key=pendingSyncKey(ownerId,kind);
 try {
  const raw=storage.getItem(key);
  if(raw===null)return {status:'empty'};
  return {status:'pending',entry:normalizeEntry(ownerId,kind,JSON.parse(raw))};
 }catch{return {status:'blocked'};}
}
// Save before sending. If persistence fails, no network request should start.
export function savePendingSync(storage,ownerId,kind,base,intent){
 const entry=normalizeEntry(ownerId,kind,{version:1,ownerId,kind,state:'queued',base,intent});
 const existing=readPendingSync(storage,ownerId,kind);
 if(existing.status!=='empty')return {status:existing.status==='blocked'?'blocked':'pending-exists'};
 try{storage.setItem(pendingSyncKey(ownerId,kind),JSON.stringify(entry));return {status:'saved',entry};}
 catch{return {status:'blocked'};}
}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
// Mark uncertain before attempting the network call; a tab crash is then
// handled as a possibly committed operation, not as a fresh edit.
export function markPendingAttempt(storage,entry){
 const normalized=normalizeEntry(entry.ownerId,entry.kind,entry);
 const existing=readPendingSync(storage,entry.ownerId,entry.kind);
 if(existing.status!=='pending'||!same(existing.entry,normalized)||normalized.state!=='queued')return {status:'blocked'};
 const next={...normalized,state:'uncertain'};
 try{storage.setItem(pendingSyncKey(entry.ownerId,entry.kind),JSON.stringify(next));return {status:'saved',entry:next};}
 catch{return {status:'blocked'};}
}
// Always read remote state first. An exact base can be retried only with the
// original revision; CAS rejects a late original request or competing edit.
// A newer revision is not proof of this operation, even if values coincide.
export function planPendingSync(entry,remote){
 const normalized=normalizeEntry(entry.ownerId,entry.kind,entry);
 const latest=validateSnapshot(entry.kind,remote);
 if(latest.revision<normalized.base.revision)return {status:'stale'};
 if(!same(latest,normalized.base))return {status:'review',snapshot:latest};
 const predicted=entry.kind==='cart'
  ?applyCartSyncIntent(latest,latest.revision,normalized.intent)
  :applyVersionedWishlistIntent(latest,latest.revision,normalized.intent);
 if(predicted.status==='limit')return {status:'review',snapshot:latest};
 return {status:'send-original',expectedRevision:latest.revision,intent:normalized.intent};
}
// Only a validated matching acknowledgement or explicit user resolution
// may clear the journal. No clear on offline errors or automatic conflicts.
export function clearPendingSync(storage,entry,{explicitResolution=false,acknowledgedSnapshot=null}={}){
 const normalized=normalizeEntry(entry.ownerId,entry.kind,entry);
 const existing=readPendingSync(storage,entry.ownerId,entry.kind);
 if(existing.status!=='pending'||!same(existing.entry,normalized))return {status:'blocked'};
 if(!explicitResolution){
  if(normalized.state!=='uncertain'||!acknowledgedSnapshot)return {status:'review'};
  const predicted=entry.kind==='cart'
   ?applyCartSyncIntent(normalized.base,normalized.base.revision,normalized.intent)
   :applyVersionedWishlistIntent(normalized.base,normalized.base.revision,normalized.intent);
  if(predicted.status==='limit'||!same(predicted.snapshot,validateSnapshot(entry.kind,acknowledgedSnapshot)))return {status:'review'};
 }
 try{storage.removeItem(pendingSyncKey(entry.ownerId,entry.kind));return {status:'cleared'};}
 catch{return {status:'blocked'};}
}
