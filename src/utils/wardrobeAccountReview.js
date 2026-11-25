import {isOwnedWardrobePhotoPath} from './wardrobePhotoTransport.js';
export const WARDROBE_SYNC_ENABLED=false;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const fields=['id','name','category','subCategory','color','season','photoPath'];
export function validateWardrobeAccountSnapshot(ownerId,value){
 if(typeof ownerId!=='string'||!uuid.test(ownerId)||!value||Object.keys(value).length!==2||!Number.isSafeInteger(value.revision)||value.revision<0||!Array.isArray(value.items)||value.items.length>100)throw new TypeError('Invalid wardrobe snapshot');
 const seen=new Set();
 const items=value.items.map(item=>{
  if(!item||typeof item!=='object'||Array.isArray(item)||Object.keys(item).length!==fields.length||!fields.every(k=>Object.hasOwn(item,k))||typeof item.id!=='string'||!uuid.test(item.id)||seen.has(item.id))throw new TypeError('Invalid wardrobe item');
  seen.add(item.id);
  for(const k of fields.slice(1,-1))if(typeof item[k]!=='string'||Array.from(item[k]).length>160||k==='name'&&!item[k].trim())throw new TypeError('Invalid wardrobe text');
  if(item.photoPath!==null&&!isOwnedWardrobePhotoPath(ownerId,item.photoPath))throw new TypeError('Invalid private photo');
  return Object.fromEntries(fields.map(k=>[k,item[k]]));
 });
 return {revision:value.revision,items};
}
export function createWardrobeAccountReader({enabled=false,client,getScope}={}){
 let busy=false;
 const scope=()=>{try{const s=getScope();return s?.authLoading===false&&typeof s.ownerId==='string'&&uuid.test(s.ownerId)&&Number.isSafeInteger(s.epoch)&&s.epoch>=0?{ownerId:s.ownerId,epoch:s.epoch}:null;}catch{return null;}};
 const active=start=>{const s=scope();return s&&s.ownerId===start.ownerId&&s.epoch===start.epoch;};
 return {async read(known=null){
  if(enabled!==true)return {status:'disabled'};
  const start=scope();if(!start)return {status:'inactive'};
  if(busy)return {status:'busy'};busy=true;
  try{
   const u=await client.auth.getUser();
   if(!active(start))return {status:'inactive'};
   if(u.error||u.data?.user?.id!==start.ownerId||u.data.user.is_anonymous===true)return {status:'blocked'};
   const r=await client.rpc('customer_wardrobe_read',{p_expected_owner:start.ownerId});
   if(!active(start))return {status:'inactive'};
   if(r.error||!r.data)return {status:'blocked'};
   const snapshot=validateWardrobeAccountSnapshot(start.ownerId,r.data);
   if(known){const previous=validateWardrobeAccountSnapshot(start.ownerId,known);if(snapshot.revision<previous.revision||snapshot.revision===previous.revision&&JSON.stringify(snapshot)!==JSON.stringify(previous))return {status:'review'};}
   return {status:'ready',snapshot,...start};
  }catch{return {status:active(start)?'blocked':'inactive'};}finally{busy=false;}
 }};
}
