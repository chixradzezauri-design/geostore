import React,{useRef,useState,useEffect} from 'react';
import {createCustomerSyncTransport} from '../utils/customerSyncTransport.js';
import {createCustomerSyncCoordinator} from '../utils/customerSyncCoordinator.js';
import {compareWishlistForReview} from '../utils/wishlistSyncReview.js';
import CustomerSyncStatus from './CustomerSyncStatus.jsx';
const copy={ka:['ფავორიტების სინქრონიზაცია','შედარება','მხოლოდ ამ მოწყობილობაზე','მხოლოდ ანგარიშში','ანგარიშში დამატება','მოწყობილობაზე დამატება','არსებული სიები არ წაიშლება. თითოეული დამატება დაადასტურეთ ცალ-ცალკე.','დარჩენილი ცვლილების შემოწმება'],en:['Wishlist sync','Compare','Only on this device','Only in account','Add to account','Add to device','Existing lists are not deleted. Confirm each addition separately.','Check pending change'],ru:['Синхронизация избранного','Сравнить','Только на устройстве','Только в аккаунте','Добавить в аккаунт','Добавить на устройство','Списки не удаляются. Подтверждайте каждое добавление отдельно.','Проверить ожидающее изменение']};
export default function WishlistSyncPanel({client,getScope,getLocalIds,importFavorite,lang='ka'}){
 const t=copy[lang]||copy.ka;
 const [review,setReview]=useState(null),[status,setStatus]=useState(null),[busy,setBusy]=useState(false);
 const snapshot=useRef(null),locked=useRef(false),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;snapshot.current=null;};},[]);
 const current=useRef({getScope,getLocalIds,importFavorite});
 current.current={getScope,getLocalIds,importFavorite};
 function context(){const s=current.current.getScope();return {...s,authLoading:s.authLoading||!mounted.current,snapshot:snapshot.current};}
 function active(scope){const now=context();return !now.authLoading&&now.ownerId===scope.ownerId&&now.epoch===scope.epoch;}
 async function run(action,id){
  if(locked.current)return;locked.current=true;setBusy(true);setStatus(null);
  const scope=context();let result;
  try{
   if(!active(scope))return;
   const user=await client.auth.getUser();
   if(!active(scope))return;
   if(user.error||user.data?.user?.id!==scope.ownerId||user.data.user.is_anonymous===true){setStatus('blocked');return;}
   const transport=createCustomerSyncTransport({enabled:true,client,getContext:context});
   const coordinator=createCustomerSyncCoordinator({enabled:true,locks:navigator.locks,storage:window.localStorage,transport,getContext:context,isOnline:()=>navigator.onLine!==false});
   if(action==='compare'){
    result=await transport.readWishlist();
    if(!active(scope))return;
    if(result.status==='ready'){snapshot.current=result.snapshot;setReview(compareWishlistForReview(current.current.getLocalIds(),result.snapshot));}
    else setReview(null);
   }else if(action==='import'){
    // Re-read remote membership before importing, never overwrite local items.
    result=await transport.readWishlist();
    if(!active(scope))return;
    if(result.status==='ready'){
     snapshot.current=result.snapshot;
     if(!result.snapshot.ids.includes(id)||!current.current.importFavorite(id,scope)){setStatus('review');setReview(null);return;}
     setReview(compareWishlistForReview(current.current.getLocalIds(),result.snapshot));result={status:'changed'};
    }
   }else if(action==='publish'){
    if(!snapshot.current||!current.current.getLocalIds().includes(id)||snapshot.current.ids.includes(id)){setStatus('review');setReview(null);return;}
    result=await coordinator.enqueue('wishlist',snapshot.current,{productId:id,present:true});
    if(!active(scope))return;
    if(result.status==='queued')result=await coordinator.reconnect('wishlist');
   }else if(action==='retry'){
    // Refresh known snapshot before processing a durable pending intent.
    result=await transport.readWishlist();
    if(!active(scope))return;
    if(result.status==='ready'){snapshot.current=result.snapshot;result=await coordinator.reconnect('wishlist');}
   }
   if(!active(scope))return;
   if(['changed','unchanged'].includes(result?.status)&&result.snapshot){snapshot.current=result.snapshot;setReview(compareWishlistForReview(current.current.getLocalIds(),result.snapshot));}
   else if(action==='publish'||action==='retry')setReview(null);
   setStatus(result?.status||'blocked');
  }catch{if(active(scope)){setStatus('blocked');setReview(null);}}
  finally{locked.current=false;if(mounted.current)setBusy(false);}
 }
 return <section className="rounded-xl border border-stone-200 bg-white p-4 text-stone-900 space-y-3">
 <h3 className="text-sm font-semibold">{t[0]}</h3><p className="text-xs">{t[6]}</p>
 <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={()=>run('compare')} className="rounded-lg border px-3 py-2 text-xs">{t[1]}</button><button type="button" disabled={busy} onClick={()=>run('retry')} className="rounded-lg border px-3 py-2 text-xs">{t[7]}</button></div>
 {status&&<CustomerSyncStatus status={status} lang={lang}/>}
 {review&&<div className="grid gap-3 sm:grid-cols-2">{[[review.localOnly,t[2],t[4],'publish'],[review.remoteOnly,t[3],t[5],'import']].map(([ids,title,label,action])=><div key={action} className="min-w-0"><h4 className="text-xs font-semibold">{title} ({ids.length})</h4>{ids.map(id=><div key={id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-xs"><span className="break-all">{id}</span><button type="button" disabled={busy} onClick={()=>run(action,id)} className="rounded-lg border px-2 py-1">{label}</button></div>)}</div>)}</div>}
 </section>;
}
