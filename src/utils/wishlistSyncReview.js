// First release-candidate integration: explicit additive reconciliation only.
import {validateWishlistSnapshot,projectWishlistIds} from './wishlistSyncContract.js';
export const WISHLIST_SYNC_ENABLED=false;
export function compareWishlistForReview(localIds,snapshot){
 const local=projectWishlistIds(localIds.map(id=>({id})));
 const remote=validateWishlistSnapshot(snapshot);
 const l=new Set(local),r=new Set(remote.ids);
 return {localOnly:local.filter(id=>!r.has(id)),remoteOnly:remote.ids.filter(id=>!l.has(id)),shared:local.filter(id=>r.has(id))};
}
