import React,{useRef,useState} from 'react';
import {createWardrobeAccountWriter} from '../utils/wardrobeAccountWriter.js';
const words={
 ka:['ანგარიშზე ნივთის დამატება','სახელი','კატეგორია','ქვეკატეგორია','ფერი','სეზონი','ფოტო (JPG, სურვილისამებრ)','ვეთანხმები ამ ნივთისა და არჩეული ფოტოს ჩემს ანგარიშზე შენახვას.','შენახვა','ფოტო ვერ დამუშავდა. სცადეთ თავსებადი JPG.','მეხსიერების ან ნივთების ლიმიტი ამოიწურა.','ცვლილება დაუდასტურებელია. გადაამოწმეთ ანგარიში; განმეორებითი ატვირთვა შეზღუდულია.'],
 en:['Add account item','Name','Category','Subcategory','Color','Season','Photo (optional JPG)','I agree to save this item and selected photo to my account.','Save','Photo preparation failed. Try a compatible JPG.','Photo or item limit reached.','Change unconfirmed. Review the account; repeat uploads are restricted.'],
 ru:['Добавить вещь в аккаунт','Название','Категория','Подкатегория','Цвет','Сезон','Фото (JPG, необязательно)','Я согласен сохранить вещь и выбранное фото в аккаунте.','Сохранить','Не удалось обработать фото. Выберите совместимый JPG.','Достигнут лимит фото или вещей.','Изменение не подтверждено. Проверьте аккаунт; повторная загрузка ограничена.']};
const empty=()=>({name:'',category:'',subCategory:'',color:'',season:''});
export default function WardrobeAccountAdd({client,getScope,base,lang,onSaved,onBusy}){
 const t=words[lang]||words.ka;
 const [fields,setFields]=useState(empty),[consent,setConsent]=useState(false),[file,setFile]=useState(null),[busy,setBusy]=useState(false),[status,setStatus]=useState(null);
 const lock=useRef(false),input=useRef(null);
 async function submit(e){
  e.preventDefault();if(lock.current||!consent)return;lock.current=true;setBusy(true);onBusy(true);setStatus(null);
  const start=getScope();const active=()=>{const s=getScope();return !s.authLoading&&s.ownerId===start.ownerId&&s.epoch===start.epoch;};
  try{
   const w=createWardrobeAccountWriter({enabled:true,client,getScope,storage:window.localStorage,locks:navigator.locks});
   const r=await w.add({base,fields,file,confirmed:consent});
   if(!active())return;
   setStatus(r.status);
   if(r.status==='accepted'){setFields(empty());setFile(null);setConsent(false);if(input.current)input.current.value='';onSaved(r.snapshot);}
  }catch{if(active())setStatus('blocked');}
  finally{lock.current=false;setBusy(false);onBusy(false);}
 }
 return <form onSubmit={submit} className="space-y-3 rounded-lg border p-3 text-xs">
 <h4 className="font-semibold">{t[0]}</h4><div className="grid gap-2 sm:grid-cols-2">{Object.keys(fields).map((k,i)=><label key={k} className="space-y-1"><span>{t[i+1]}</span><input className="w-full rounded-lg border px-3 py-2" required={k==='name'} maxLength={160} disabled={busy} value={fields[k]} onChange={e=>{setFields(prev=>({...prev,[k]:e.target.value}));setConsent(false);}}/></label>)}</div>
 <label className="block space-y-1"><span>{t[6]}</span><input ref={input} type="file" accept="image/jpeg" disabled={busy} onChange={e=>{setFile(e.target.files?.[0]||null);setConsent(false);}} className="block w-full"/></label>
 <label className="flex items-start gap-2"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/>{t[7]}</label>
 <button type="submit" disabled={busy||!consent||!fields.name.trim()} className="rounded-lg border px-3 py-2 disabled:opacity-50">{t[8]}</button>
 {status&&<p role="status">{status==='accepted'?'✓':status==='invalid-photo'?t[9]:status==='limit'?t[10]:t[11]}</p>}
 </form>;
}
