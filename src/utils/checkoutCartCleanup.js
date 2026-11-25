import {groupCheckoutItems,validateOrderCreationResponse} from './orderSafety.js';
import {sanitizeCartSnapshot} from './cartSafety.js';
// Full snapshot comparison is deliberately conservative: any difference
// (including metadata) means the cart may have been edited. No blind subtraction.
export function captureCheckoutCart(cart){
 try{return Array.isArray(cart)?JSON.stringify(cart):null;}catch{return null;}
}
export function checkoutCartUnchanged(submitted,current){
 return typeof submitted==='string'&&captureCheckoutCart(current)===submitted;
}
export function planConfirmedLocalCartCleanup({quickBuy,submitted,current,persisted,requestedItems,receipt,orderId}){
 if(quickBuy===true)return {status:'preserve'};
 if(!validateOrderCreationResponse(receipt,orderId).valid)return {status:'review'};
 if(!checkoutCartUnchanged(submitted,current)||!Array.isArray(persisted))return {status:'review'};
 // Persisted rows use the existing cart sanitizer; compare the exact expected
 // serialized storage representation, not the unnormalized React object.
 try{if(JSON.stringify(sanitizeCartSnapshot(JSON.parse(submitted)))!==JSON.stringify(persisted))return {status:'review'};}catch{return {status:'review'};}
 try{
  if(!Array.isArray(requestedItems)||!requestedItems.length||JSON.stringify(groupCheckoutItems(requestedItems))!==JSON.stringify(groupCheckoutItems(receipt.items)))return {status:'review'};
  return {status:'clear'};
 }catch{return {status:'review'};}
}
