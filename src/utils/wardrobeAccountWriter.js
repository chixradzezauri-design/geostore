import {validateWardrobeAccountSnapshot,createWardrobeAccountReader} from './wardrobeAccountReview.js';
import {prepareWardrobePhoto} from './prepareWardrobePhoto.js';
import {wardrobePhotoPath,createWardrobePhotoTransport} from './wardrobePhotoTransport.js';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function createWardrobeAccountWriter({enabled=false,client,getScope,storage,locks,makeId=()=>crypto.randomUUID(),prepare=prepareWardrobePhoto}={}){
 const scope=()=>{try{const s=getScope();return s?.authLoading===false&&uuid.test(s.ownerId)&&Number.isSafeInteger(s.epoch)&&s.epoch>=0?{ownerId:s.ownerId,epoch:s.epoch}:null;}catch{return null;}};
 return {async add({base,fields,file=null,confirmed=false}={}){
  if(enabled!==true)return {status:'disabled'};
  if(confirmed!==true)return {status:'review'};
  const start=scope();if(!start)return {status:'inactive'};
  if(!locks||typeof locks.request!=='function'||!storage)return {status:'unsupported'};
  const active=()=>{const now=scope();return now&&now.ownerId===start.ownerId&&now.epoch===start.epoch;};
  const key='geostore:wardrobe-pending:v1:'+start.ownerId;
  try{return await locks.request(key,{mode:'exclusive',ifAvailable:true},async lock=>{
   if(!lock)return {status:'busy'};
   if(!active())return {status:'inactive'};
   if(storage.getItem(key)!==null)return {status:'review'};
   const known=validateWardrobeAccountSnapshot(start.ownerId,base);
   if(known.items.length>=100||known.revision===Number.MAX_SAFE_INTEGER)return {status:'limit'};
   const itemId=makeId(),photoId=file?makeId():null;
   if(!uuid.test(itemId)||(photoId&&!uuid.test(photoId)))return {status:'invalid'};
   const path=photoId?wardrobePhotoPath(start.ownerId,photoId,'image/jpeg'):null;
   const item=validateWardrobeAccountSnapshot(start.ownerId,{revision:0,items:[{id:itemId,name:fields?.name?.trim(),category:fields?.category??'',subCategory:fields?.subCategory??'',color:fields?.color??'',season:fields?.season??'',photoPath:path}]}).items[0];
   if(known.items.some(x=>x.id===item.id))return {status:'review'};
   let prepared=null;
   if(file){try{prepared=await prepare(file);}catch{return {status:'invalid-photo'};}if(!active())return {status:'inactive'};}
   const reader=createWardrobeAccountReader({enabled:true,client,getScope});
   const latest=await reader.read(known);
   if(!active())return {status:'inactive'};
   if(latest.status!=='ready'||!same(latest.snapshot,known))return {status:'review'};
   // Durable marker holds IDs only; never store the photo or item description.
   // Any ambiguous reservation/upload/write blocks further adds until reviewed.
   const marker=JSON.stringify({version:1,itemId,photoPath:path,baseRevision:known.revision});
   storage.setItem(key,marker);
   const clear=()=>{if(storage.getItem(key)!==marker)return false;storage.removeItem(key);return true;};
   if(!active())return {status:'inactive'};
   if(path){
    const reserve=await client.rpc('customer_wardrobe_reserve_photo',{p_expected_owner:start.ownerId,p_path:path});
    if(!active())return {status:'inactive'};
    if(!reserve.error&&reserve.data?.status==='limit'){clear();return {status:'limit'};}
    if(reserve.error||reserve.data?.status!=='reserved')return {status:'uncertain'};
    const transport=createWardrobePhotoTransport({enabled:true,client,getContext:getScope});
    const uploaded=await transport.upload(prepared,photoId);
    if(!active())return {status:'inactive'};
    if(uploaded.status!=='uploaded'||uploaded.path!==path||uploaded.ownerId!==start.ownerId||uploaded.epoch!==start.epoch)return {status:'uncertain'};
   }
   if(!active())return {status:'inactive'};
   const result=await client.rpc('customer_wardrobe_change',{p_expected_owner:start.ownerId,p_expected_revision:known.revision,p_action:'set',p_item:item});
   if(!active())return {status:'inactive'};
   if(result.error||result.data?.status!=='accepted')return {status:'uncertain'};
   const snapshot=validateWardrobeAccountSnapshot(start.ownerId,result.data.snapshot);
   if(!same(snapshot,{revision:known.revision+1,items:[...known.items,item]}))return {status:'uncertain'};
   if(!clear())return {status:'uncertain'};
   return {status:'accepted',snapshot,...start};
  });}catch{return {status:active()?'blocked':'inactive'};}
 }};
}
