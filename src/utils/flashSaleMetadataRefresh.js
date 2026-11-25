// Compare only public product-level flash-sale metadata; never copy a partial
// response into product state or use it as a checkout price authority.
export const FLASH_SALE_METADATA_QUERY='select=id,price_gel,old_price_gel,flash_sale_started_at,flash_sale_ends_at,flash_sale_percent&flash_sale_ends_at=not.is.null&order=id.asc';
const read=(row,camel,snake)=>row?.[camel]??row?.[snake]??null;
const time=value=>value==null||value===''?null:Date.parse(value);
const num=value=>value==null||value===''?null:Number(value);
function signature(rows,local){
 if(!Array.isArray(rows))return null;
 const values=[],seen=new Set();
 for(const row of rows){
  if(local&&(row?.isPublished===false||row?.is_published===false))continue;
  const rawEnd=read(row,'flashSaleEndsAt','flash_sale_ends_at');
  if(rawEnd==null||rawEnd===''){if(local)continue;return null;}
  const id=row?.id,end=time(rawEnd),start=time(read(row,'flashSaleStartedAt','flash_sale_started_at'));
  const price=num(read(row,'priceGEL','price_gel')),old=num(read(row,'oldPriceGEL','old_price_gel')),percent=num(read(row,'flashSalePercent','flash_sale_percent'));
  if(id==null||String(id)===''||seen.has(String(id))||!Number.isFinite(end)||!Number.isFinite(price)||(start!==null&&!Number.isFinite(start))||(old!==null&&!Number.isFinite(old))||(percent!==null&&!Number.isFinite(percent)))return null;
  seen.add(String(id));values.push([String(id),price,old,start,end,percent]);
 }
 return JSON.stringify(values.sort((a,b)=>a[0].localeCompare(b[0])));
}
export function flashSaleMetadataChanged(products,serverRows){
 const current=signature(products,true),next=signature(serverRows,false);
 return current!==null&&next!==null&&current!==next;
}
