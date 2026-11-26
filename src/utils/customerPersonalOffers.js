import {conciergeProducts,conciergeSaleProducts} from './characterRecommendations.js';

// Derive suggestions from current catalogue rows, never saved price snapshots.
// No user data is transmitted and no discount or checkout authority is created.
export function customerPersonalOffers(products,wishlist,{ready=false,now=Date.now(),limit=6}={}){
  const available=conciergeProducts(products,ready);
  const max=Number.isSafeInteger(limit)?Math.min(12,Math.max(0,limit)):6;
  if(!available.length||!max)return {personal:[],sales:[]};
  const savedIds=new Set((Array.isArray(wishlist)?wishlist:[]).filter(p=>p&&p.id!=null).map(p=>String(p.id)));
  const categories=new Set(available.filter(p=>savedIds.has(p.id)&&p.category).map(p=>p.category));
  const sales=conciergeSaleProducts(products,ready,now).filter((p,i,all)=>all.findIndex(x=>x.id===p.id)===i);
  const saleIds=new Set(sales.map(p=>p.id));
  const priority=p=>savedIds.has(p.id)?2:categories.has(p.category)?1:0;
  const rank=(a,b)=>priority(b)-priority(a)||Number(b.featured)-Number(a.featured)||a.id.localeCompare(b.id);
  return {
    personal:available.filter(p=>priority(p)>0&&!saleIds.has(p.id)).sort(rank).slice(0,max).map(p=>({...p,reason:savedIds.has(p.id)?'saved':'category'})),
    sales:sales.sort(rank).slice(0,max)
  };
}
