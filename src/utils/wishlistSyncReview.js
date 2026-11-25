// Release-candidate integration: explicit reconciliation, never blind overwrite.
import {validateWishlistSnapshot,projectWishlistIds} from './wishlistSyncContract.js';
export const WISHLIST_SYNC_ENABLED=false;
export function compareWishlistForReview(localIds,snapshot){
 const local=projectWishlistIds(localIds.map(id=>({id})));
 const remote=validateWishlistSnapshot(snapshot);
 const l=new Set(local),r=new Set(remote.ids);
 return {localOnly:local.filter(id=>!r.has(id)),remoteOnly:remote.ids.filter(id=>!l.has(id)),shared:local.filter(id=>r.has(id))};
}

// A pending write must still reflect the user's local membership at send time.
export function wishlistIntentStillDesired(localIds,intent){
 try{const ids=projectWishlistIds(localIds.map(id=>({id})));const id=projectWishlistIds([{id:intent?.productId}])[0];return typeof intent?.present==='boolean'&&ids.includes(id)===intent.present;}
 catch{return false;}
}
