import {validateImageFile} from './imageSafety.js';

const MAX_BYTES=5*1024*1024, MIN_BYTES=128*1024, MAX_PIXELS=20_000_000, MAX_EDGE=2048;
// Inspect JPEG frame metadata before decoding, avoiding unbounded canvas
// allocations. Preserve unusual/multipicture JPEG variants conservatively.
export function inspectJpegDimensions(bytes){
 if(bytes[0]!==0xff||bytes[1]!==0xd8)return null;
 let offset=2,frame=null;
 while(offset<bytes.length){
  if(bytes[offset++]!==0xff)return null;
  while(bytes[offset]===0xff)offset++;
  const marker=bytes[offset++];
  if(marker===0xda){
   return frame;
  }
  if(marker===0xd9||marker===0x00||marker===0xd8||marker===0x01||(marker>=0xd0&&marker<=0xd7))return null;
  if(offset+2>bytes.length)return null;
  const length=bytes[offset]*256+bytes[offset+1];
  if(length<2||offset+length>bytes.length)return null;
  // APP2 can carry ICC profiles or multi-picture metadata; leave unchanged.
  if(marker===0xe2)return null;
  if(marker>=0xc0&&marker<=0xcf&&![0xc4,0xc8,0xcc].includes(marker)){
   if(![0xc0,0xc2].includes(marker)||length<8||frame||bytes[offset+2]!==8)return null;
   const height=bytes[offset+3]*256+bytes[offset+4],width=bytes[offset+5]*256+bytes[offset+6];
   if(!width||!height||width*height>MAX_PIXELS)return null;
   frame={width,height};
  }
  offset+=length;
 }
 return null;
}
export function fitImageDimensions(width,height){
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width*height>MAX_PIXELS)return null;
 const scale=Math.min(1,MAX_EDGE/Math.max(width,height));
 return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}
async function browserEncode(file,dimensions){
 if(typeof createImageBitmap!=='function'||typeof document==='undefined')return null;
 let bitmap,canvas;
 try{
  bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
  // EXIF rotation can swap the two dimensions; never accept unexpected size.
  if(!((bitmap.width===dimensions.width&&bitmap.height===dimensions.height)||(bitmap.width===dimensions.height&&bitmap.height===dimensions.width)))return null;
  const fit=fitImageDimensions(bitmap.width,bitmap.height);
  if(!fit)return null;
  canvas=document.createElement('canvas');canvas.width=fit.width;canvas.height=fit.height;
  const ctx=canvas.getContext('2d');
  if(!ctx||typeof canvas.toBlob!=='function')return null;
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(bitmap,0,0,fit.width,fit.height);
  return await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',0.86));
 }finally{
  bitmap?.close();
  if(canvas){canvas.width=0;canvas.height=0;}
 }
}
// Only new, validated JPEG uploads are candidates. PNG/GIF/WebP and remote
// URLs are never rewritten. Unsupported codecs or insufficient savings retain
// the exact input. Existing Storage MIME/size/authorization checks still apply.
export async function optimizeProductImage(file,{encode=browserEncode}={}){
 await validateImageFile(file,MAX_BYTES);
 if(file.type!=='image/jpeg'||file.size<MIN_BYTES)return file;
 try{
  const dims=inspectJpegDimensions(new Uint8Array(await file.arrayBuffer()));
  if(!dims)return file;
  const encoded=await encode(file,dims);
  if(!encoded||encoded.type!=='image/webp'||encoded.size>Math.floor(file.size*0.85))return file;
  await validateImageFile(encoded,MAX_BYTES,['image/webp']);
  return encoded;
 }catch{return file;}
}
export function readImageDataUrl(file){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>typeof reader.result==='string'?resolve(reader.result):reject(Error('ფოტოს წაკითხვა ვერ მოხერხდა.'));
  reader.onerror=reader.onabort=()=>reject(Error('ფოტოს წაკითხვა ვერ მოხერხდა.'));
  reader.readAsDataURL(file);
 });
}
