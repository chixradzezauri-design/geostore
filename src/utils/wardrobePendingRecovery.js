import {validateWardrobeAccountSnapshot} from './wardrobeAccountReview.js';
import {isOwnedWardrobePhotoPath} from './wardrobePhotoTransport.js';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function parseWardrobePending(raw,ownerId){
 if(raw===null)return null;
 const m=JSON.parse(raw);
 if(!m||m.version!==1||!uuid.test(m.itemId)||!Number.isSafeInteger(m.baseRevision)||m.baseRevision<0||!(m.photoPath===null||isOwnedWardrobePhotoPath(ownerId,m.photoPath))||!Object.keys(m).every(k=>['version','action','itemId','photoPath','baseRevision'].includes(k))||!(m.action===undefined||m.action==='remove'))throw Error('Invalid pending marker');
 return {...m,action:m.action||'add'};
}
export function classifyWardrobeRecovery(marker,snapshot,photoState){
 if(!marker)return 'none';
 if(snapshot.revision<marker.baseRevision)return 'review';
 const item=snapshot.items.find(i=>i.id===marker.itemId);
 const referenced=marker.photoPath!==null&&snapshot.items.some(i=>i.photoPath===marker.photoPath);
 // A successful upload may precede the metadata write, leaving revision unchanged.
 if(marker.action==='add'&&!item&&!referenced&&marker.photoPath!==null&&photoState==='present')return 'orphan';
 if(snapshot.revision<=marker.baseRevision)return 'review';
 if(marker.action==='add'&&!item&&!referenced&&marker.photoPath!==null&&['pending','erased'].includes(photoState))return 'retired';
 if(marker.action==='add'&&item&&item.photoPath===marker.photoPath&&(marker.photoPath===null||photoState==='present'))return 'observed';
 if(marker.action==='remove'&&!item&&(marker.photoPath===null||(referenced&&photoState==='present')||(!referenced&&['pending','erased'].includes(photoState))))return 'observed';
 return 'review';
}
export async function reviewWardrobePending({enabled=false,client,getScope,storage,locks,confirm=null,retire=null}={}){
 if(enabled!==true)return {status:'disabled'};
 const start=getScope();if(start?.authLoading!==false||typeof start.ownerId!=='string'||!uuid.test(start.ownerId)||!Number.isSafeInteger(start.epoch)||start.epoch<0)return {status:'inactive'};
 if(!storage||!locks?.request)return {status:'unsupported'};
 const active=()=>{const s=getScope();return s?.authLoading===false&&s.ownerId===start.ownerId&&s.epoch===start.epoch;};
 const key='geostore:wardrobe-pending:v1:'+start.ownerId;
 try{return await locks.request(key,{mode:'exclusive',ifAvailable:true},async lock=>{
  if(!lock)return {status:'busy'};
  if(!active())return {status:'inactive'};
  const raw=storage.getItem(key),marker=parseWardrobePending(raw,start.ownerId);
  const auth=await client.auth.getUser();
  if(!active())return {status:'inactive'};
  if(auth.error||auth.data?.user?.id!==start.ownerId||auth.data.user.is_anonymous===true)return {status:'blocked'};
  const r=await client.rpc('customer_wardrobe_recovery_status',{p_expected_owner:start.ownerId,p_path:marker?.photoPath??null});
  if(!active())return {status:'inactive'};
  const d=r.data;if(r.error||!d||!['none','present','reserved','unknown','pending','erased'].includes(d.photoState)||!Number.isSafeInteger(d.reserved)||d.reserved<0||d.reserved>20||!Number.isSafeInteger(d.pending)||d.pending<0)return {status:'blocked'};
  const snapshot=validateWardrobeAccountSnapshot(start.ownerId,d.snapshot);
  const outcome=classifyWardrobeRecovery(marker,snapshot,d.photoState);
  const proof={raw,revision:snapshot.revision,outcome,photoState:d.photoState};
  if(retire){
   // Explicitly abandon only the exact unreferenced uploaded path reviewed by the user.
   if(confirm||JSON.stringify(retire)!==JSON.stringify(proof)||outcome!=='orphan'||storage.getItem(key)!==raw||snapshot.revision===Number.MAX_SAFE_INTEGER)return {status:'review',snapshot};
   const retired=await client.rpc('customer_wardrobe_request_erasure',{p_expected_owner:start.ownerId,p_expected_revision:snapshot.revision,p_path:marker.photoPath});
   if(!active())return {status:'inactive'};
   if(retired.error||retired.data?.status!=='pending'||retired.data.revision!==snapshot.revision+1)return {status:'uncertain'};
   // Do not clear the marker or claim physical deletion. Re-observe the tombstone.
   return {status:'retirement-requested'};
  }
  if(confirm){
   if(JSON.stringify(confirm)!==JSON.stringify(proof)||!['observed','retired'].includes(outcome)||storage.getItem(key)!==raw)return {status:'review',snapshot};
   storage.removeItem(key);return {status:'cleared',snapshot,reserved:d.reserved,pending:d.pending};
  }
  return {status:'ready',snapshot,reserved:d.reserved,pending:d.pending,outcome,photoState:d.photoState,proof};
 });}catch{return {status:active()?'blocked':'inactive'};}
}
