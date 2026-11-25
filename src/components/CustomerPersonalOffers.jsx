import React,{useEffect,useState} from 'react';
import {customerPersonalOffers} from '../utils/customerPersonalOffers.js';
import './customerPersonalOffers.css';

const copy={
 ka:{title:'შეთავაზებები შენთვის',intro:'ფავორიტებზე დაფუძნებული რეკომენდაციები და მიმდინარე საჯარო აქციები.',personal:'შენი ფავორიტები და მსგავსი ნივთები',sales:'მოქმედი აქციები',saved:'ფავორიტებშია',category:'მსგავსი კატეგორია',from:'ფასი',open:'ნახვა',empty:'შეინახე საყვარელი ნივთები ფავორიტებში და მიიღე შესაბამისი რეკომენდაციები.',none:'ამჟამად მოქმედი აქცია არ მოიძებნა.',loading:'კატალოგის მონაცემები ჯერ არ არის დადასტურებული.',note:'ფასი და ხელმისაწვდომობა გადაამოწმე პროდუქტის გვერდზე. აქციები არ არის ექსკლუზიური.'},
 en:{title:'Offers for you',intro:'Wishlist-based suggestions and current public promotions.',personal:'Your favorites and similar items',sales:'Current promotions',saved:'In your wishlist',category:'Similar category',from:'Price',open:'View',empty:'Save favorites to receive relevant suggestions.',none:'No current promotions found.',loading:'Catalogue data is not yet verified.',note:'Check the product page for final price and availability. Promotions are not exclusive.'},
 ru:{title:'Предложения для вас',intro:'Рекомендации по избранному и действующие публичные акции.',personal:'Избранное и похожие товары',sales:'Действующие акции',saved:'В избранном',category:'Похожая категория',from:'Цена',open:'Смотреть',empty:'Добавьте товары в избранное, чтобы получать рекомендации.',none:'Действующих акций пока нет.',loading:'Данные каталога ещё не подтверждены.',note:'Проверьте цену и наличие на странице товара. Акции не эксклюзивны.'}
};
export default function CustomerPersonalOffers({products,wishlist,ready,lang='ka',formatPrice,onOpenProduct}){
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{
  let timer;
  const refresh=()=>{
   clearTimeout(timer);
   if(document.visibilityState==='hidden')return;
   const current=Date.now();setNow(current);
   if(!ready)return;
   let next=60000;
   for(const product of Array.isArray(products)?products:[]){
    for(const value of [product?.flashSaleStartedAt,product?.flashSaleEndsAt,product?.flash_sale_started_at,product?.flash_sale_ends_at]){
     const time=typeof value==='number'?value:Date.parse(String(value));
     if(Number.isFinite(time)&&time>current)next=Math.min(next,time-current);
    }
   }
   timer=setTimeout(refresh,Math.max(1,next));
  };
  refresh();
  document.addEventListener('visibilitychange',refresh);
  return()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',refresh);};
 },[products,ready]);
 const words=Object.hasOwn(copy,lang)?copy[lang]:copy.ka;
 const {personal,sales}=customerPersonalOffers(products,wishlist,{ready,now});
 const card=(p,sale=false)=><li key={p.id}><div className="gs-personal-offer-meta"><strong>{p.name}</strong>{!sale&&<small>{words[p.reason]}</small>}<span>{sale&&<del>{formatPrice(p.oldPrice)}</del>} {formatPrice(p.price)}</span></div><button type="button" aria-label={words.open+': '+p.name} onClick={()=>onOpenProduct({id:p.id})}>{words.open}</button></li>;
 return <section className="gs-personal-offers" aria-label={words.title}>
  <h3>{words.title}</h3><p>{words.intro}</p>
  {!ready?<p role="status">{words.loading}</p>:<>
   <h4>{words.personal}</h4>{personal.length?<ul>{personal.map(p=>card(p))}</ul>:<p>{words.empty}</p>}
   <h4>{words.sales}</h4>{sales.length?<ul>{sales.map(p=>card(p,true))}</ul>:<p>{words.none}</p>}
   <small>{words.note}</small>
  </>}
 </section>;
}
