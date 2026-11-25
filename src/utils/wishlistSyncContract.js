// Pure wishlist synchronization contract. Not wired to the live client or database.
// Server snapshots must be versioned; client operations express explicit membership,
// not a toggle, so repeating an operation cannot invert the desired state.
export const MAX_SYNC_FAVORITES=100;
const isId=value=>typeof value==='string'&&value.length>0&&value.length<=160&&value===value.trim();
const validRevision=value=>Number.isSafeInteger(value)&&value>=0;
export function projectWishlistIds(items){
  if(!Array.isArray(items))throw new TypeError('Invalid wishlist');
  const ids=[];
  const seen=new Set();
  for(const item of items){
    const id=item?.id;
    if(!isId(id))throw new TypeError('Invalid product ID');
    if(seen.has(id))continue;
    seen.add(id);ids.push(id);
    if(ids.length>MAX_SYNC_FAVORITES)throw new RangeError('Wishlist limit exceeded');
  }
  return ids;
}
export function validateWishlistSnapshot(snapshot){
  if(!snapshot||!validRevision(snapshot.revision)||!Array.isArray(snapshot.ids)||
    snapshot.ids.length>MAX_SYNC_FAVORITES||!snapshot.ids.every(isId)||
    new Set(snapshot.ids).size!==snapshot.ids.length)throw new TypeError('Invalid wishlist snapshot');
  return {revision:snapshot.revision,ids:[...snapshot.ids]};
}
export function applyWishlistIntent(snapshot,intent){
  const current=validateWishlistSnapshot(snapshot);
  if(!intent||!isId(intent.productId)||typeof intent.present!=='boolean')throw new TypeError('Invalid wishlist intent');
  const exists=current.ids.includes(intent.productId);
  if(exists===intent.present)return {status:'unchanged',snapshot:current};
  if(intent.present&&current.ids.length>=MAX_SYNC_FAVORITES)return {status:'limit',snapshot:current};
  if(current.revision===Number.MAX_SAFE_INTEGER)throw new RangeError('Revision exhausted');
  const ids=intent.present?[...current.ids,intent.productId]:current.ids.filter(id=>id!==intent.productId);
  return {status:'changed',snapshot:{revision:current.revision+1,ids}};
}
// An old or mismatched owner response must not replace local account state.
// A stale write should instead receive an explicit conflict from the server.
export function acceptWishlistResponse({requestOwnerId,activeOwnerId,requestEpoch,activeEpoch,knownRevision,snapshot}){
  if(!requestOwnerId||requestOwnerId!==activeOwnerId||requestEpoch!==activeEpoch)return null;
  if(!validRevision(knownRevision))throw new TypeError('Invalid known revision');
  const next=validateWishlistSnapshot(snapshot);
  return next.revision<knownRevision?null:next;
}
