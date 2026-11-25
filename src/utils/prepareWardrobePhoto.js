import {validateImageFile} from './imageSafety.js';
import {inspectJpegDimensions} from './optimizeProductImage.js';
export const WARDROBE_PREPARED_MAX_BYTES=1536*1024;
const MAX_EDGE=1600;
export function fitWardrobePhoto(width,height){
 if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width*height>20_000_000)return null;
 const scale=Math.min(1,MAX_EDGE/Math.max(width,height));
 return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}
// Canvas creates new pixels, rather than copying the original file metadata.
// Reject encoded output with application metadata other than JFIF or comments.
function cleanJpegHeader(bytes){
 let i=2;
 while(i<bytes.length){
  if(bytes[i++]!==255)return false;
  while(bytes[i]===255)i++;
  const m=bytes[i++];
  if(m===0xda)return true;
  if((m>=0xe1&&m<=0xef)||m===0xfe)return false;
  if(i+2>bytes.length)return false;
  const n=bytes[i]*256+bytes[i+1];
  if(n<2||i+n>bytes.length)return false;
  if(m===0xe0&&(n!==16||String.fromCharCode(...bytes.slice(i+2,i+7))!=='JFIF\0'||bytes[i+14]!==0||bytes[i+15]!==0))return false;
  i+=n;
 }
 return false;
}
async function browserEncode(file,source){
 let bitmap,canvas;
 try{
  if(typeof createImageBitmap!=='function'||typeof document==='undefined')return null;
  bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
  if(!((bitmap.width===source.width&&bitmap.height===source.height)||(bitmap.width===source.height&&bitmap.height===source.width)))return null;
  const fit=fitWardrobePhoto(bitmap.width,bitmap.height);
  if(!fit)return null;
  canvas=document.createElement('canvas');canvas.width=fit.width;canvas.height=fit.height;
  const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return null;
  ctx.drawImage(bitmap,0,0,fit.width,fit.height);
  return await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.82));
 }finally{bitmap?.close();if(canvas){canvas.width=0;canvas.height=0;}}
}
export async function prepareWardrobePhoto(file,{encode=browserEncode}={}){
 // Conservative JPEG-only first rollout. Never fall back to original bytes.
 await validateImageFile(file,5*1024*1024,['image/jpeg']);
 const dimensions=inspectJpegDimensions(new Uint8Array(await file.arrayBuffer()));
 if(!dimensions)throw Error('Unsupported JPEG');
 const output=await encode(file,dimensions);
 if(!output||output===file)throw Error('Photo preparation unavailable');
 await validateImageFile(output,WARDROBE_PREPARED_MAX_BYTES,['image/jpeg']);
 const bytes=new Uint8Array(await output.arrayBuffer()),d=inspectJpegDimensions(bytes);
 const fit=fitWardrobePhoto(dimensions.width,dimensions.height);
 if(!d||!fit||!((d.width===fit.width&&d.height===fit.height)||(d.width===fit.height&&d.height===fit.width))||!cleanJpegHeader(bytes))throw Error('Invalid prepared JPEG');
 return output;
}
