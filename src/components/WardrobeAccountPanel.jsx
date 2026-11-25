import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createWardrobeAccountReader} from '../utils/wardrobeAccountReview.js';
import {createWardrobePhotoTransport} from '../utils/wardrobePhotoTransport.js';
import CustomerSyncStatus from './CustomerSyncStatus.jsx';
import WardrobeAccountAdd from './WardrobeAccountAdd.jsx';
import WardrobeRecoveryPanel from './WardrobeRecoveryPanel.jsx';
import {removeWardrobeAccountItem} from '../utils/wardrobeAccountRemove.js';
const copy={
 ka:['ანგარიშის გარდერობი','ანგარიშის ნივთების ნახვა','ფოტოს გახსნა','ფოტოს დახურვა','ფოტო მიუწვდომელია','ფოტოები მხოლოდ მოთხოვნით იტვირთება. ამ მოწყობილობის გარდერობი უცვლელია.','ანგარიშზე ნივთები ჯერ არ არის.'],
 en:['Account wardrobe','View account items','Open photo','Close photo','Photo unavailable','Photos load only on request. Your device wardrobe stays unchanged.','No items in your account yet.'],
 ru:['Гардероб аккаунта','Посмотреть вещи','Открыть фото','Закрыть фото','Фото недоступно','Фото загружаются только по запросу. Гардероб устройства не меняется.','В аккаунте пока нет вещей.']};
export default function WardrobeAccountPanel({client,getScope,ownerId,lang='ka'}){
 const t=copy[lang]||copy.ka;
 const [snapshot,setSnapshot]=useState(null),[status,setStatus]=useState(null),[busy,setBusy]=useState(false),[photo,setPhoto]=useState(null);
 const [writing,setWriting]=useState(false),[confirm,setConfirm]=useState(null),[removed,setRemoved]=useState(null);
 const del={ka:['ნივთის წაშლა','ანგარიშიდან წაშლის დადასტურება','გაუქმება','ნივთი წაიშალა. ფოტოს ფიზიკური წაშლა მოლოდინშია.','ნივთი წაიშალა.'],en:['Remove item','Confirm removal from account','Cancel','Item removed. Physical photo deletion is pending.','Item removed.'],ru:['Удалить вещь','Подтвердить удаление из аккаунта','Отмена','Вещь удалена. Физическое удаление фото ожидается.','Вещь удалена.']}[lang]||['ნივთის წაშლა','დადასტურება','გაუქმება','ფოტოს წაშლა მოლოდინშია.','ნივთი წაიშალა.'];
 const generation=useRef(0),urlRef=useRef(null),known=useRef(null),lock=useRef(false),current=useRef(getScope);
 current.current=getScope;
 const clearPhoto=()=>{if(urlRef.current){URL.revokeObjectURL(urlRef.current);urlRef.current=null;}setPhoto(null);};
 useLayoutEffect(()=>()=>{generation.current++;if(urlRef.current)URL.revokeObjectURL(urlRef.current);urlRef.current=null;known.current=null;},[ownerId]);
 const scope=()=>{const s=current.current();return {...s,authLoading:s.authLoading||s.ownerId!==ownerId};};
 async function run(path=null){
  if(lock.current||writing)return;lock.current=true;
  const g=++generation.current,start=scope();setBusy(true);setStatus(null);clearPhoto();
  const active=()=>{const s=scope();return g===generation.current&&!s.authLoading&&s.ownerId===start.ownerId&&s.epoch===start.epoch;};
  try{
   if(!active())return;
   const reader=createWardrobeAccountReader({enabled:true,client,getScope:scope});
   const result=await reader.read(known.current);
   if(!active())return;
   if(result.status!=='ready'){known.current=null;setSnapshot(null);setStatus(result.status);return;}
   known.current=result.snapshot;setSnapshot(result.snapshot);setStatus('ready');
   if(path){
    if(!result.snapshot.items.some(i=>i.photoPath===path)){setStatus('review');return;}
    const transport=createWardrobePhotoTransport({enabled:true,client,getContext:scope});
    const download=await transport.download(path);
    if(!active())return;
    if(download.status!=='ready'){setStatus('unavailable');return;}
    const url=URL.createObjectURL(download.blob);
    if(!active()){URL.revokeObjectURL(url);return;}
    urlRef.current=url;setPhoto({path,url});
   }
  }catch{if(active()){known.current=null;setSnapshot(null);setStatus('blocked');}}
  finally{if(g===generation.current){lock.current=false;setBusy(false);}}
 }
 async function remove(){
  if(!confirm||lock.current||writing)return;
  lock.current=true;const g=++generation.current,start=scope(),review=confirm;setBusy(true);setConfirm(null);setRemoved(null);setStatus(null);clearPhoto();
  const active=()=>{const s=scope();return g===generation.current&&!s.authLoading&&s.ownerId===start.ownerId&&s.epoch===start.epoch;};
  try{
   const r=await removeWardrobeAccountItem({enabled:true,client,getScope:scope,storage:window.localStorage,locks:navigator.locks,base:review.base,itemId:review.id,confirmed:true});
   if(!active())return;
   if(r.status==='removed'){known.current=r.snapshot;setSnapshot(r.snapshot);setRemoved(r.photoErasure);}
   else{setStatus(r.status);setSnapshot(null);}
  }catch{if(active())setStatus('blocked');}
  finally{if(g===generation.current){lock.current=false;setBusy(false);}}
 }
 // The parent unmounts the wardrobe while auth resolves. Also hide any
 // rendered private data if the parent scope is temporarily invalid.
 if(scope().authLoading)return null;
 return <section className="rounded-xl border border-stone-200 bg-white p-4 text-stone-900 space-y-3">
 <h3 className="text-sm font-semibold">{t[0]}</h3><p className="text-xs leading-5">{t[5]}</p>
 <button type="button" disabled={busy||writing} onClick={()=>run()} className="rounded-lg border px-3 py-2 text-xs">{t[1]}</button>
 {status==='unavailable'?<p role="status" className="text-xs text-amber-700">{t[4]}</p>:status&&<CustomerSyncStatus status={status} lang={lang}/>}
 {removed&&<p role="status" className="text-xs">{removed==='pending'?del[3]:del[4]}</p>}
 {confirm&&<div className="rounded-lg border border-rose-300 p-3 text-xs space-y-2"><p>{del[1]}: {confirm.name}</p><button type="button" disabled={busy||writing} onClick={remove} className="rounded-lg border px-3 py-2 mr-2">{del[1]}</button><button type="button" onClick={()=>setConfirm(null)} className="rounded-lg border px-3 py-2">{del[2]}</button></div>}
 <WardrobeRecoveryPanel client={client} getScope={scope} lang={lang} disabled={busy||writing} onBusy={setWriting} onSnapshot={next=>{known.current=next;setSnapshot(next);clearPhoto();setConfirm(null);}}/>
 {snapshot&&<WardrobeAccountAdd client={client} getScope={scope} base={snapshot} lang={lang} onBusy={setWriting} onSaved={next=>{known.current=next;setSnapshot(next);clearPhoto();}}/>}
 {snapshot&&snapshot.items.length===0&&<p className="text-xs">{t[6]}</p>}
 {snapshot&&<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{snapshot.items.map(item=><article key={item.id} className="min-w-0 rounded-lg border p-3 space-y-2 text-xs"><h4 className="font-semibold break-words">{item.name}</h4><p className="break-words">{[item.category,item.subCategory,item.color,item.season].filter(Boolean).join(' · ')}</p>{item.photoPath&&(photo?.path===item.photoPath?<><img src={photo.url} alt={item.name} className="max-h-48 w-full object-contain"/><button type="button" onClick={clearPhoto} className="rounded-lg border px-3 py-2">{t[3]}</button></>:<button type="button" disabled={busy||writing} onClick={()=>run(item.photoPath)} className="rounded-lg border px-3 py-2">{t[2]}</button>)}<button type="button" disabled={busy||writing} onClick={()=>setConfirm({id:item.id,name:item.name,base:snapshot})} className="rounded-lg border border-rose-300 px-3 py-2 text-rose-700">{del[0]}</button></article>)}</div>}
 </section>;
}
