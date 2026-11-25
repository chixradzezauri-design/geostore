import React,{useRef,useState} from 'react';
import {reviewWardrobePending} from '../utils/wardrobePendingRecovery.js';
const copy={
 ka:['ატვირთვისა და მეხსიერების შემოწმება','შენახული ფოტოების რეზერვაციები','წაშლის მოლოდინში','მოთხოვნის შედეგი ანგარიშზე ჩანს. გადაამოწმეთ ნივთები და დაადასტურეთ შეზღუდვის მოხსნა.','შეზღუდვის მოხსნა','მოთხოვნა გაურკვეველია. ხელახლა ატვირთვა ჯერ შეზღუდულია.','შეზღუდვა მოხსნილია.','გადამოწმება ვერ მოხერხდა.','დაუმთავრებელი მოთხოვნა არ არის.'],
 en:['Check uploads and storage','Photo reservations','Pending deletion','The requested outcome is visible in your account. Review the items and confirm unlocking.','Unlock uploads','The request is uncertain. Repeat uploads remain blocked.','Upload lock cleared.','Unable to verify.','No pending request.'],
 ru:['Проверить загрузки и хранилище','Резервации фото','Ожидают удаления','Результат виден в аккаунте. Проверьте вещи и подтвердите разблокировку.','Разблокировать загрузки','Результат запроса неясен. Повторная загрузка заблокирована.','Блокировка снята.','Не удалось проверить.','Нет ожидающего запроса.']};
export default function WardrobeRecoveryPanel({client,getScope,lang,onSnapshot,onBusy,disabled}){
 const t=copy[lang]||copy.ka,[result,setResult]=useState(null),[busy,setBusy]=useState(false);
 const lock=useRef(false);
 async function run(confirm=null){
  if(lock.current||disabled)return;
  lock.current=true;setBusy(true);onBusy(true);
  const start=getScope();
  try{
   const r=await reviewWardrobePending({enabled:true,client,getScope,storage:window.localStorage,locks:navigator.locks,confirm});
   const now=getScope();if(now.authLoading||now.ownerId!==start.ownerId||now.epoch!==start.epoch)return;
   setResult(r);if(r.snapshot)onSnapshot(r.snapshot);
  }catch{setResult({status:'blocked'});}
  finally{lock.current=false;setBusy(false);onBusy(false);}
 }
 return <div className="rounded-lg border p-3 text-xs space-y-2">
 <button type="button" disabled={busy||disabled} onClick={()=>run()} className="rounded-lg border px-3 py-2">{t[0]}</button>
 {result&&<div role="status" className="space-y-2">{Number.isInteger(result.reserved)&&<p>{t[1]}: {result.reserved}/20 · {t[2]}: {result.pending}</p>}
 <p>{result.status==='cleared'?t[6]:result.status!=='ready'?t[7]:result.outcome==='none'?t[8]:result.outcome==='observed'?t[3]:t[5]}</p>
 {result.status==='ready'&&result.outcome==='observed'&&<button type="button" disabled={busy||disabled} onClick={()=>run(result.proof)} className="rounded-lg border px-3 py-2">{t[4]}</button>}</div>}
 </div>;
}
