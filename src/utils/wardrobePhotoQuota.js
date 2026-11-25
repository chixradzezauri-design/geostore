// Provisional quota planning, not an enforced backend quota.
// Charge full 5 MiB per reserved path until verified physical erasure.
export const WARDROBE_PHOTO_LIMIT=20;
export const WARDROBE_RESERVED_BYTES=5*1024*1024;
export function planWardrobePhotoReservation(records,path){
 if(!Array.isArray(records)||typeof path!=='string'||!path.length)throw new TypeError('Invalid reservation input');
 const seen=new Set();let charged=0;
 for(const row of records){
  if(!row||typeof row.path!=='string'||!row.path.length||seen.has(row.path)||!['reserved','uploaded','erasure-pending','erased'].includes(row.status))throw new TypeError('Invalid reservation record');
  seen.add(row.path);
  if(row.status!=='erased')charged++;
 }
 if(seen.has(path))return {status:'path-used',charged};
 if(charged>=WARDROBE_PHOTO_LIMIT)return {status:'limit',charged};
 return {status:'candidate',charged:charged+1,reservedBytes:(charged+1)*WARDROBE_RESERVED_BYTES};
}
