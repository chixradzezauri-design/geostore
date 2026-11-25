import {productPath} from './catalogueSeo.js';
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
