import React,{useEffect,useRef,useState} from 'react';
const COPY={
 ka:{title:'სწრაფი შესვლის გასაღებები',show:'გასაღებების მართვა',refresh:'განახლება',none:'რეგისტრირებული გასაღები არ არის.',unnamed:'მოწყობილობის გასაღები',created:'დამატებულია',last:'ბოლო გამოყენება',rename:'სახელის შეცვლა',remove:'გაუქმება',save:'შენახვა',cancel:'გაუქმების შეწყვეტა',name:'გასაღების სახელი',confirm:'გსურს ამ გასაღების წაშლა? დარწმუნდი, რომ პაროლით ან ელ-ფოსტით ანგარიშის აღდგენა შეგიძლია.',confirmDelete:'გასაღების წაშლა',error:'მოქმედების შედეგი ვერ დადასტურდა. განაახლე სია და გადაამოწმე.',loading:'იტვირთება…',note:'გასაღების წაშლა მომავალში ამ გასაღებით შესვლას აუქმებს, მაგრამ უკვე აქტიურ სესიებს არ ხურავს. მოწყობილობის PIN-ს მართავს მოწყობილობა.'},
 en:{title:'Quick sign-in keys',show:'Manage passkeys',refresh:'Refresh',none:'No registered passkeys.',unnamed:'Device passkey',created:'Added',last:'Last used',rename:'Rename',remove:'Revoke',save:'Save',cancel:'Cancel',name:'Passkey name',confirm:'Delete this passkey? Make sure you can recover your account using your password or email.',confirmDelete:'Delete passkey',error:'The action could not be confirmed. Refresh the list and check again.',loading:'Loading…',note:'Deleting a passkey prevents future sign-ins with that key, but does not end existing sessions. Device PIN is managed by your device.'},
 ru:{title:'Ключи быстрого входа',show:'Управление ключами',refresh:'Обновить',none:'Нет зарегистрированных ключей.',unnamed:'Ключ устройства',created:'Добавлен',last:'Последнее использование',rename:'Переименовать',remove:'Отозвать',save:'Сохранить',cancel:'Отмена',name:'Название ключа',confirm:'Удалить ключ? Убедитесь, что можете восстановить аккаунт по паролю или почте.',confirmDelete:'Удалить ключ',error:'Не удалось подтвердить результат. Обновите список и проверьте снова.',loading:'Загрузка…',note:'Удаление ключа запрещает будущие входы с ним, но не завершает активные сеансы. PIN управляется устройством.'}
};
export default function CustomerPasskeyManager({lang='ka',busy=false,onManage}){
 const words=COPY[lang]||COPY.ka;
 const [rows,setRows]=useState(null),[error,setError]=useState(false),[pending,setPending]=useState(false),[edit,setEdit]=useState(null),[name,setName]=useState(''),[confirmId,setConfirmId]=useState(null);
 const mounted=useRef(true),lock=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const run=async(action,options)=>{
  if(busy||lock.current)return;
  lock.current=true;setPending(true);setError(false);
  try{
   const data=await onManage(action,options);
   if(!mounted.current)return;
   setRows(data);setEdit(null);setConfirmId(null);
  }catch{if(mounted.current){setError(true);setRows(null);setEdit(null);setConfirmId(null);}}
  finally{lock.current=false;if(mounted.current)setPending(false);}
 };
 const blocked=busy||pending;
 const date=value=>{const parsed=value?new Date(value):null;return parsed&&Number.isFinite(parsed.getTime())?new Intl.DateTimeFormat(lang==='en'?'en-GB':lang==='ru'?'ru-RU':'ka-GE',{dateStyle:'medium',timeZone:'Asia/Tbilisi'}).format(parsed):'—';};
 return <section className="gs-passkey-manager" aria-label={words.title} aria-busy={pending}>
  <strong>{words.title}</strong>
  <button type="button" className="gs-passkey-action" disabled={blocked} onClick={()=>run('list')}>{rows===null?words.show:words.refresh}</button>
  {pending&&<p role="status">{words.loading}</p>}
  {error&&<p role="alert">{words.error}</p>}
  {rows?.length===0&&<p>{words.none}</p>}
  {rows?.map(row=><article key={row.id} className="gs-passkey-item">
   <strong>{row.friendlyName||words.unnamed}</strong>
   <small>{words.created}: {date(row.createdAt)} · {words.last}: {date(row.lastUsedAt)}</small>
   {edit===row.id?<div className="gs-passkey-edit"><label>{words.name}<input value={name} maxLength={120} onChange={e=>setName(e.target.value)} disabled={blocked}/></label><button type="button" disabled={blocked||!name.trim()} onClick={()=>run('rename',{id:row.id,name})}>{words.save}</button><button type="button" disabled={blocked} onClick={()=>setEdit(null)}>{words.cancel}</button></div>:confirmId===row.id?<div className="gs-passkey-edit"><p>{words.confirm}</p><button type="button" disabled={blocked} onClick={()=>run('delete',{id:row.id,confirmed:true})}>{words.confirmDelete}</button><button type="button" disabled={blocked} onClick={()=>setConfirmId(null)}>{words.cancel}</button></div>:<div className="gs-passkey-item-actions"><button type="button" disabled={blocked} onClick={()=>{setEdit(row.id);setName(row.friendlyName);setConfirmId(null);}}>{words.rename}</button><button type="button" disabled={blocked} onClick={()=>{setConfirmId(row.id);setEdit(null);}}>{words.remove}</button></div>}
  </article>)}
  <small>{words.note}</small>
 </section>;
}
