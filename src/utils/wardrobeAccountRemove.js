import {validateWardrobeAccountSnapshot,createWardrobeAccountReader} from './wardrobeAccountReview.js';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export async function removeWardrobeAccountItem({enabled=false,client,getScope,storage,locks,base,itemId,confirmed=false}={}){
 if(enabled!==true)return {status:'disabled'};
 if(confirmed!==true)return {status:'review'};
 const start=getScope();
 if(!start||start.authLoading!==false||!start.ownerId)return {status:'inactive'};
 const active=()=>{const now=getScope();return now?.authLoading===false&&now.ownerId===start.ownerId&&now.epoch===start.epoch;};
 if(!locks?.request||!storage)return {status:'unsupported'};
 const key='geostore:wardrobe-pending:v1:'+start.ownerId;
 try{return await locks.request(key,{mode:'exclusive',ifAvailable:true},async lock=>{
  if(!lock)return {status:'busy'};
  if(!active())return {status:'inactive'};
  if(storage.getItem(key)!==null)return {status:'review'};
  const known=validateWardrobeAccountSnapshot(start.ownerId,base),item=known.items.find(i=>i.id===itemId);
  if(!item)return {status:'review'};
  const latest=await createWardrobeAccountReader({enabled:true,client,getScope}).read(known);
  if(!active())return {status:'inactive'};
  if(latest.status!=='ready'||!same(latest.snapshot,known))return {status:'review'};
  const marker=JSON.stringify({version:1,action:'remove',itemId,photoPath:item.photoPath,baseRevision:known.revision});
  storage.setItem(key,marker);
  const result=await client.rpc('customer_wardrobe_remove_item',{p_expected_owner:start.ownerId,p_expected_revision:known.revision,p_item_id:itemId});
  if(!active())return {status:'inactive'};
  if(result.error||result.data?.status!=='removed')return {status:'uncertain'};
  const remaining=known.items.filter(i=>i.id!==itemId);
  const erasure=item.photoPath===null?'none':remaining.some(i=>i.photoPath===item.photoPath)?'referenced':'pending';
  const next=validateWardrobeAccountSnapshot(start.ownerId,result.data.snapshot);
  if(result.data.photoErasure!==erasure||!same(next,{revision:known.revision+(erasure==='pending'?2:1),items:remaining}))return {status:'uncertain'};
  if(storage.getItem(key)!==marker)return {status:'uncertain'};
  storage.removeItem(key);
  return {status:'removed',photoErasure:erasure,snapshot:next};
 });}catch{return {status:active()?'blocked':'inactive'};}
}
