import React,{useEffect,useRef,useState} from 'react';
import {createCustomerSyncTransport} from '../utils/customerSyncTransport.js';
import {createCustomerSyncCoordinator} from '../utils/customerSyncCoordinator.js';
import {compareCartForReview,planCartReviewPublish} from '../utils/cartSyncReview.js';
import {cartIntentKey} from '../utils/cartSyncContract.js';
import {readPendingSync} from '../utils/customerSyncJournal.js';
import CustomerSyncStatus from './CustomerSyncStatus.jsx';
const copy={
 ka:['კალათის სინქრონიზაცია','შედარება','მხოლოდ მოწყობილობაზე','მხოლოდ ანგარიშში','განსხვავებული რაოდენობა','ანგარიშზე შენახვა','დადასტურება','გაუქმება','შეინახება მხოლოდ არჩეული პროდუქტის ვარიანტი და რაოდენობა. მარაგი არ დაჯავშნება. ადგილობრივი კალათა უცვლელია.','მოლოდინში მყოფი ცვლილების შემოწმება','მოთხოვნის გაუქმება','გაუქმდება მხოლოდ მოლოდინში მყოფი მოთხოვნა, არა ანგარიშის მონაცემები.','მარაგი, ვარიანტი ან კატალოგი ვერ დადასტურდა.'],
 en:['Cart sync','Compare','Only on device','Only in account','Different quantity','Save to account','Confirm','Cancel','Only the selected product variant and quantity are saved. Stock is not reserved. Your local cart stays unchanged.','Check pending change','Discard pending request','Only the pending request is discarded, not account data.','Stock, variant or catalogue could not be verified.'],
 ru:['Синхронизация корзины','Сравнить','Только на устройстве','Только в аккаунте','Разное количество','Сохранить в аккаунте','Подтвердить','Отмена','Сохраняются только выбранный вариант и количество. Товар не резервируется. Локальная корзина не меняется.','Проверить ожидающее изменение','Отменить запрос','Отменяется только ожидающий запрос, не данные аккаунта.','Не удалось подтвердить остаток, вариант или каталог.']};
export default function CartSyncPanel({client,getScope,getCart,validateStock,lang='ka'}){
 const t=copy[lang]||copy.ka;
 const [review,setReview]=useState(null),[status,setStatus]=useState(null),[busy,setBusy]=useState(false),[confirm,setConfirm]=useState(null),[pending,setPending]=useState(null);
 const snapshot=useRef(null),locked=useRef(false),mounted=useRef(false),current=useRef(null);
 current.current={getScope,getCart,validateStock};
 useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;snapshot.current=null;};},[]);
 function context(){const s=current.current.getScope();return {...s,authLoading:s.authLoading||!mounted.current,snapshot:snapshot.current};}
 function active(scope){const now=context();return !now.authLoading&&now.ownerId===scope.ownerId&&now.epoch===scope.epoch;}
 async function run(action,entry){
  if(locked.current)return;locked.current=true;setBusy(true);setStatus(null);setConfirm(null);
  const scope=context();let result;
  try{
   if(!active(scope))return;
   const user=await client.auth.getUser();
   if(!active(scope))return;
   if(user.error||user.data?.user?.id!==scope.ownerId||user.data.user.is_anonymous===true){setStatus('blocked');return;}
   const transport=createCustomerSyncTransport({enabled:true,client,getContext:context});
   const plan=line=>planCartReviewPublish(current.current.getCart(),snapshot.current,line,current.current.validateStock);
   const coordinator=createCustomerSyncCoordinator({enabled:true,locks:navigator.locks,storage:window.localStorage,transport,getContext:context,isOnline:()=>navigator.onLine!==false,canSendIntent:(kind,intent)=>kind==='cart'&&intent.type==='set'&&plan(intent.line).status==='ready'});
   if(action==='compare'||action==='retry'){
    result=await transport.readCart();
    if(!active(scope))return;
    if(result.status==='ready'){snapshot.current=result.snapshot;setReview(compareCartForReview(current.current.getCart(),result.snapshot));if(action==='retry')result=await coordinator.reconnect('cart');}
    else setReview(null);
   }else if(action==='publish'){
    const p=plan(entry);
    if(p.status!=='ready'){setStatus(p.status);setReview(null);return;}
    result=await coordinator.enqueue('cart',snapshot.current,p.intent);
    if(!active(scope))return;
    if(result.status==='queued')result=await coordinator.reconnect('cart');
   }else if(action==='discard'){result=await coordinator.discard('cart',entry,true);}
   if(!active(scope))return;
   if(result?.status==='accepted'){snapshot.current=result.snapshot;setReview(compareCartForReview(current.current.getCart(),result.snapshot));}
   else if(action!=='compare')setReview(null);
   setStatus(result?.status||'blocked');
  }catch{if(active(scope)){setStatus('blocked');setReview(null);}}
  finally{locked.current=false;if(active(scope)){try{const p=readPendingSync(window.localStorage,scope.ownerId,'cart');setPending(p.status==='pending'?p.entry:null);}catch{setPending(null);}}if(mounted.current)setBusy(false);}
 }
 const describe=line=>[line.productId,line.size,line.color,line.variantId,line.giftWrap?'Gift':null,line.vipWarranty?'VIP':null].filter(Boolean).join(' · ')+' × '+line.quantity;
 const groups=review?[[t[2],review.localOnly.map(line=>({line})),true],[t[3],review.remoteOnly.map(line=>({line})),false],[t[4],review.quantityChanged,true]]:[];
 return <section className="rounded-xl border border-stone-200 bg-white p-4 text-stone-900 space-y-3">
 <h3 className="text-sm font-semibold">{t[0]}</h3><p className="text-xs leading-5">{t[8]}</p>
 <div className="flex flex-wrap gap-2">{[['compare',t[1]],['retry',t[9]]].map(([action,label])=><button key={action} type="button" disabled={busy} onClick={()=>run(action)} className="rounded-lg border px-3 py-2 text-xs">{label}</button>)}{pending&&<button type="button" disabled={busy} onClick={()=>setConfirm({action:'discard',entry:pending})} className="rounded-lg border px-3 py-2 text-xs">{t[10]}</button>}</div>
 {status==='unavailable'?<p role="status" className="text-xs text-amber-700">{t[12]}</p>:status&&<CustomerSyncStatus status={status} lang={lang}/>}
 {confirm&&<div className="border rounded-lg p-3 text-xs space-y-2"><p>{confirm.action==='publish'?describe(confirm.entry):t[11]}</p><div className="flex gap-2"><button type="button" disabled={busy} onClick={()=>run(confirm.action,confirm.entry)} className="rounded-lg border px-3 py-2">{t[6]}</button><button type="button" onClick={()=>setConfirm(null)} className="rounded-lg border px-3 py-2">{t[7]}</button></div></div>}
 {groups.length>0&&<div className="grid gap-3 sm:grid-cols-2">{groups.map(([label,items,canPublish])=><div key={label} className="min-w-0"><h4 className="text-xs font-semibold">{label} ({items.length})</h4>{items.map(({line,remoteQuantity})=><div key={cartIntentKey(line)} className="flex flex-wrap gap-2 justify-between border-b py-2 text-xs"><span className="break-all">{describe(line)}{remoteQuantity!==undefined?' / '+remoteQuantity:''}</span>{canPublish&&<button type="button" disabled={busy} onClick={()=>setConfirm({action:'publish',entry:line})} className="rounded-lg border px-2 py-1">{t[5]}</button>}</div>)}</div>)}</div>}
 </section>;
}
