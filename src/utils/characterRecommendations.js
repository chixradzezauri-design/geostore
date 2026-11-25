import {productPath} from './catalogueSeo.js';
import {getActiveFlashSaleProducts} from './flashSaleTime.js';
import {getProductAvailableStock,getProductStartingPrice} from './productVariants.js';

// Recommendations use only verified published inventory, never private product data.
export function conciergeProducts(products,ready){
 if(!ready||!Array.isArray(products))return [];
 const seen=new Set();
 return products.flatMap(p=>{
  if(!p||p.isPublished===false||p.is_published===false||!productPath(p.id)||typeof p.name!=='string'||!p.name.trim())return [];
  const id=String(p.id);if(seen.has(id))return [];
  const price=getProductStartingPrice(p);
  if(!Number.isFinite(price)||price<=0||!(getProductAvailableStock(p)>0))return [];
  seen.add(id);
  return [{id,name:p.name.trim().slice(0,100),featured:p.isFeatured===true,category:typeof p.category==='string'?p.category:'',path:productPath(p.id)}];
 });
}
export function chooseConciergeProduct(products,{ready=false,mode='featured',category='',index=0,excludeId=null}={}){
 const available=conciergeProducts(products,ready);
 const others=available.filter(p=>p.id!==String(excludeId));
 const pool=others.length?others:available;
 const local=category&&category!=='ყველა'?pool.filter(p=>p.category===category):[];
 const candidates=mode==='category'&&local.length?local:mode==='featured'&&pool.some(p=>p.featured)?pool.filter(p=>p.featured):pool;
 const n=Number.isFinite(index)?Math.max(0,Math.floor(index)):0;
 return candidates.length?candidates[n%candidates.length]:null;
}
export const CONCIERGE_PRODUCT_COPY=Object.freeze({
 ka:{intro:'ამ ნივთსაც გადახედე — შესაძლოა მოგეწონოს!',action:'ნივთის ნახვა'},
 en:{intro:'Here is another find you might like!',action:'View product'},
 ru:{intro:'Взгляни на эту находку — возможно, она тебе понравится!',action:'Смотреть товар'}
});

// Use existing campaign validity rules and only unambiguous, in-stock public prices.
// No discount percentage stored in marketing metadata is trusted as a price calculation.
export function conciergeSaleProducts(products,ready,now=Date.now()){
 if(!ready||!Number.isFinite(now)||!Array.isArray(products))return [];
 const publicRows=products.filter(p=>p&&p.isPublished!==false&&p.is_published!==false&&(!Array.isArray(p.variants)||!p.variants.length));
 const available=conciergeProducts(publicRows,true);
 const byId=new Map(available.map(p=>[p.id,p]));
 const eligible=publicRows.filter(p=>byId.has(String(p.id)));
 return getActiveFlashSaleProducts(eligible,now).flatMap(p=>{
  const item=byId.get(String(p.id));
  const price=Number(p.priceGEL??p.price_gel),old=Number(p.oldPriceGEL??p.old_price_gel);
  const raw=p.flashSaleEndsAt??p.flash_sale_ends_at;
  const endsAt=typeof raw==='number'?raw:Date.parse(String(raw));
  const savings=Math.round((old-price)*100)/100;
  if(!item||!Number.isFinite(endsAt)||endsAt<=now||!Number.isFinite(savings)||savings<=0)return [];
  return [{...item,price,oldPrice:old,savings,endsAt,sale:true}];
 });
}
export function chooseConciergeSale(products,{ready=false,now=Date.now(),index=0,excludeId=null}={}){
 const list=conciergeSaleProducts(products,ready,now);
 const others=list.filter(p=>p.id!==String(excludeId));
 const pool=others.length?others:list;
 const n=Number.isFinite(index)?Math.max(0,Math.floor(index)):0;
 return pool.length?pool[n%pool.length]:null;
}
export const CONCIERGE_SALE_COPY=Object.freeze({
 ka:{intro:'მოქმედი შეთავაზება',saving:'ფასთა სხვაობა',action:'შეთავაზების ნახვა'},
 en:{intro:'Current offer',saving:'Price difference',action:'View offer'},
 ru:{intro:'Действующее предложение',saving:'Разница в цене',action:'Смотреть предложение'}
});
