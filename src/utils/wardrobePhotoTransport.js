// Unmounted storage adapter: no public/signed URLs or implicit legacy upload.
import {validateImageFile} from './imageSafety.js';
export const WARDROBE_BUCKET='customer-wardrobe-private';
export const WARDROBE_PHOTO_MAX_BYTES=5*1024*1024;
const extensions={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function wardrobePhotoPath(ownerId,photoId,mime){
 if(typeof ownerId!=='string'||!uuid.test(ownerId)||typeof photoId!=='string'||!uuid.test(photoId)||!Object.hasOwn(extensions,mime))throw new TypeError('Invalid private photo identity');
 return ownerId+'/'+photoId+'.'+extensions[mime];
}
export function isOwnedWardrobePhotoPath(ownerId,path){
 if(typeof ownerId!=='string'||!uuid.test(ownerId)||typeof path!=='string')return false;
 const parts=path.split('/');
 if(parts.length!==2||parts[0]!==ownerId)return false;
 const [id,ext,...rest]=parts[1].split('.');
 return !rest.length&&uuid.test(id)&&Object.values(extensions).includes(ext);
}
export function createWardrobePhotoTransport({enabled=false,client,getContext}={}){
 function scope(){
  try{
   const c=getContext();
   return c?.authLoading===false&&typeof c.ownerId==='string'&&uuid.test(c.ownerId)&&Number.isSafeInteger(c.epoch)&&c.epoch>=0
    ?{ownerId:c.ownerId,epoch:c.epoch}:null;
  }catch{return null;}
 }
 const active=s=>{const c=scope();return c&&c.ownerId===s.ownerId&&c.epoch===s.epoch;};
 return {
  async upload(file,photoId){
   if(enabled!==true)return {status:'disabled'};
   const s=scope();if(!s)return {status:'inactive'};
   let path,mime;
   try{
    mime=await validateImageFile(file,WARDROBE_PHOTO_MAX_BYTES);
    path=wardrobePhotoPath(s.ownerId,photoId,mime);
   }catch{return {status:'invalid'};}
   if(!active(s))return {status:'inactive'};
   try{
    const result=await client.storage.from(WARDROBE_BUCKET).upload(path,file,{contentType:mime,upsert:false});
    if(!active(s))return {status:'inactive'};
    if(result?.error||result?.data?.path!==path)return {status:'uncertain'};
    return {status:'uploaded',path,...s};
   }catch{return {status:active(s)?'uncertain':'inactive'};}
  },
  async download(path){
   if(enabled!==true)return {status:'disabled'};
   const s=scope();if(!s)return {status:'inactive'};
   if(!isOwnedWardrobePhotoPath(s.ownerId,path))return {status:'invalid'};
   try{
    const result=await client.storage.from(WARDROBE_BUCKET).download(path);
    if(!active(s))return {status:'inactive'};
    if(result?.error||!result?.data)return {status:'unavailable'};
    const mime=await validateImageFile(result.data,WARDROBE_PHOTO_MAX_BYTES);
    if(!active(s))return {status:'inactive'};
    if(!path.endsWith('.'+extensions[mime]))return {status:'invalid'};
    return {status:'ready',blob:result.data,...s};
   }catch{return {status:active(s)?'unavailable':'inactive'};}
  }
 };
}
