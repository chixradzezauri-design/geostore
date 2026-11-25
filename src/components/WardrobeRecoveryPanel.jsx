import React,{useRef,useState} from 'react';
import {reviewWardrobePending} from '../utils/wardrobePendingRecovery.js';
const copy={
 ka:['ატვირთვისა და მეხსიერების შემოწმება','შენახული ფოტოების რეზერვაციები','წაშლის მოლოდინში','მოთხოვნის შედეგი ანგარიშზე ჩანს. გადაამოწმეთ ნივთები და დაადასტურეთ შეზღუდვის მოხსნა.','შეზღუდვის მოხსნა','მოთხოვნა გაურკვეველია. ხელახლა ატვირთვა ჯერ შეზღუდულია.','შეზღუდვა მოხსნილია.','გადამოწმება ვერ მოხერხდა.','დაუმთავრებელი მოთხოვნა არ არის.'],
 en:['Check uploads and storage','Photo reservations','Pending deletion','The requested outcome is visible in your account. Review the items and confirm unlocking.','Unlock uploads','The request is uncertain. Repeat uploads remain blocked.','Upload lock cleared.','Unable to verify.','No pending request.'],
 ru:['Проверить загрузки и хранилище','Резервации фото','Ожидают удаления','Результат виден в аккаунте. Проверьте вещи и подтвердите разблокировку.','Разблокировать загрузки','Результат запроса неясен. Повторная загрузка заблокирована.','Блокировка снята.','Не удалось проверить.','Нет ожидающего запроса.']};
export default function WardrobeRecoveryPanel({client,getScope,lang,onSnapshot,onBusy,disabled}){
 const t=copy[lang]||copy.ka,[result,setResult]=useState(null),[busy,setBusy]=useState(false);
 const lock=useRef(false);
 const [confirmRetire,setConfirmRetire]=useState(false);
 const cleanup={
 ka:['გამოუყენებელი ფოტო აღმოჩნდა. შეგიძლიათ გააუქმოთ ეს ატვირთვა და მოითხოვოთ ფოტოს წაშლა.','ფოტოს წაშლის მოთხოვნა','დადასტურება: გაუქმდეს ატვირთვა','გაუქმება','წაშლის მოთხოვნა მიღებულია. ფიზიკური წაშლა ჯერ არ დადასტურებულა. ხელახლა შეამოწმეთ.','ატვირთვა გაუქმებულია. შეგიძლიათ მოხსნათ შეზღუდვა; მეხსიერება მხოლოდ ფიზიკური წაშლის შემდეგ გათავისუფლდება.'],
 en:['An unreferenced photo was found. You may abandon this upload and request deletion.','Request photo deletion','Confirm abandoning upload','Cancel','Deletion requested, not physically confirmed. Check again.','The upload is retired. You may unlock uploads; capacity is released only after verified physical deletion.'],
 ru:['Найдено фото без связанной вещи. Можно отменить загрузку и запросить удаление.','Запросить удаление фото','Подтвердить отмену загрузки','Отмена','Удаление запрошено, но ещё не подтверждено. Проверьте снова.','Загрузка отменена. Можно снять блокировку; место освобождается только после подтверждённого удаления.']
 }[lang]||[];
 async function run(confirm=null,retire=null){
  if(lock.current||disabled)return;
  lock.current=true;setBusy(true);onBusy(true);setConfirmRetire(false);
  const start=getScope();
  try{
   const r=await reviewWardrobePending({enabled:true,client,getScope,storage:window.localStorage,locks:navigator.locks,confirm,retire});
   const now=getScope();if(now.authLoading||now.ownerId!==start.ownerId||now.epoch!==start.epoch)return;
   setResult(r);if(r.snapshot)onSnapshot(r.snapshot);
  }catch{setResult({status:'blocked'});}
  finally{lock.current=false;setBusy(false);onBusy(false);}
 }
 return <div className="rounded-lg border p-3 text-xs space-y-2">
 <button type="button" disabled={busy||disabled} onClick={()=>run()} className="rounded-lg border px-3 py-2">{t[0]}</button>
 {result&&<div role="status" className="space-y-2">{Number.isInteger(result.reserved)&&<p>{t[1]}: {result.reserved}/20 · {t[2]}: {result.pending}</p>}
 <p>{result.status==='cleared'?t[6]:result.status==='retirement-requested'?cleanup[4]:result.status!=='ready'?t[7]:result.outcome==='none'?t[8]:result.outcome==='observed'?t[3]:result.outcome==='orphan'?cleanup[0]:result.outcome==='retired'?cleanup[5]:t[5]}</p>
 {result.status==='ready'&&['observed','retired'].includes(result.outcome)&&<button type="button" disabled={busy||disabled} onClick={()=>run(result.proof)} className="rounded-lg border px-3 py-2">{t[4]}</button>}
 {result.status==='ready'&&result.outcome==='orphan'&&(!confirmRetire?<button type="button" disabled={busy||disabled} onClick={()=>setConfirmRetire(true)} className="rounded-lg border border-rose-300 px-3 py-2">{cleanup[1]}</button>:<div className="flex flex-wrap gap-2"><button type="button" disabled={busy||disabled} onClick={()=>run(null,result.proof)} className="rounded-lg border border-rose-300 px-3 py-2">{cleanup[2]}</button><button type="button" onClick={()=>setConfirmRetire(false)} className="rounded-lg border px-3 py-2">{cleanup[3]}</button></div>)}</div>}
 </div>;
}
