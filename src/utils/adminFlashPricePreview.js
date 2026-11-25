// Local read-only estimate: the server remains authoritative for eligibility and price writes.
const cents=value=>{
 if(typeof value!=='number'&&typeof value!=='string')return null;
 if(!/^\d+(?:\.\d{1,2})?$/.test(String(value).trim()))return null;
 const n=Math.round(Number(value)*100);
 return Number.isSafeInteger(n)&&n>=0?n:null;
};
export function previewFlashPrices(products,form,scheduled=false){
 const percent=cents(form?.discountPercent),category=String(form?.category??'').trim();
 if(!Array.isArray(products)||!category||percent===null||percent<=0||percent>=10000)return null;
 const rows=[],seen=new Set();
 const excluded={variants:0,invalid:0,existing:0,rounding:0};
 for(const p of products){
  if(!p||(category!=='ყველა'&&p.category!==category))continue;
  if(p.id==null||String(p.id)===''||seen.has(String(p.id))){excluded.invalid++;continue;}
  seen.add(String(p.id));
  if(p.variants!=null&&(!Array.isArray(p.variants)||p.variants.length)){excluded.variants++;continue;}
  const rawOld=p.oldPriceGEL??p.old_price_gel;
  const price=cents(p.priceGEL??p.price_gel),old=rawOld==null||rawOld===''?0:cents(rawOld);
  if(price===null||old===null){excluded.invalid++;continue;}
  const hasEnd=(p.flashSaleEndsAt??p.flash_sale_ends_at)!=null&&(p.flashSaleEndsAt??p.flash_sale_ends_at)!=='';
  if(scheduled&&(hasEnd||old>price)){excluded.existing++;continue;}
  const reference=scheduled?price:Math.max(price,old);
  // PostgreSQL numeric ROUND on a positive amount rounds exact half cents up.
  const sale=Number((BigInt(reference)*BigInt(10000-percent)+5000n)/10000n);
  if(reference<=0||sale>=reference){excluded.rounding++;continue;}
  rows.push({id:String(p.id),name:String(p.name||p.title||p.id),category:String(p.category??''),current:price,reference,sale,raisesPrice:sale>price,existing:hasEnd||old>price});
 }
 return {rows,excluded,count:rows.length,raisesPrice:rows.filter(r=>r.raisesPrice).length,existing:rows.filter(r=>r.existing).length};
}
