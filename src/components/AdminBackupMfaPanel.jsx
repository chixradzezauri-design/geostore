import React,{useEffect,useRef,useState} from 'react';
import {normalizeMfaCode} from '../utils/adminMfaView.js';
const copy={
 ka:{title:'სარეზერვო ავტორიზაცია',check:'მოწყობილობების შემოწმება',add:'სარეზერვო მოწყობილობის დამატება',guide:'დაამატეთ გასაღები სხვა დამოუკიდებელ Authenticator მოწყობილობაში. გასაღები არავის გაუზიაროთ.',code:'ექვსნიშნა კოდი',verify:'დადასტურება',count:'დადასტურებული მოწყობილობები',ready:'სარეზერვო მოწყობილობის მდგომარეობა გადაამოწმეთ სხვა მოწყობილობიდან შესვლით.',risk:'თუ ყველა მოწყობილობა დაკარგეთ, პაროლის აღდგენა 2FA-ს არ აუქმებს. საჭიროა უფლებამოსილი აღდგენის პროცედურა.',blocked:'შემოწმება ვერ დასრულდა. ხელახლა შეამოწმეთ.',unfinished:'დაუმთავრებელი რეგისტრაცია არსებობს. ავტომატურად არ წაიშლება; მიმართეთ უფლებამოსილ მხარდაჭერას.',limit:'მოწყობილობების ლიმიტი მიღწეულია.',invalid:'კოდი ვერ დადასტურდა. სცადეთ ახალი კოდი.'},
 en:{title:'Backup authentication',check:'Check devices',add:'Add backup device',guide:'Add the key on a separate authenticator device. Never share the key.',code:'Six-digit code',verify:'Verify',count:'Verified devices',ready:'Test backup access by signing in from another device.',risk:'Password reset does not bypass MFA if every device is lost. Authorized recovery is required.',blocked:'Check could not complete. Check again.',unfinished:'An unfinished enrollment exists. It will not be deleted automatically; contact authorized support.',limit:'Device limit reached.',invalid:'Code not verified. Try a new code.'},
 ru:{title:'Резервная аутентификация',check:'Проверить устройства',add:'Добавить резервное устройство',guide:'Добавьте ключ на отдельном устройстве. Никому не передавайте ключ.',code:'Шестизначный код',verify:'Подтвердить',count:'Подтверждённые устройства',ready:'Проверьте резервный вход с другого устройства.',risk:'Сброс пароля не отменяет MFA при потере всех устройств. Требуется авторизованное восстановление.',blocked:'Проверка не завершена. Повторите.',unfinished:'Есть незавершённая регистрация. Она не удаляется автоматически; обратитесь в поддержку.',limit:'Достигнут лимит устройств.',invalid:'Код не подтверждён. Попробуйте новый.'}
};
export default function AdminBackupMfaPanel({transport,lang='ka'}){
 const t=copy[lang]||copy.ka;
 const [state,setState]=useState({status:'idle'}),[code,setCode]=useState(''),[busy,setBusy]=useState(false);
 const generation=useRef(0),lock=useRef(false);
 useEffect(()=>()=>{generation.current++;transport.forget();},[transport]);
 async function perform(fn){
  if(lock.current)return;lock.current=true;setBusy(true);
  const g=++generation.current;
  try{const result=await fn();if(generation.current!==g)return;setState(prev=>result.status==='invalid'&&prev.status==='setup'?{...prev,notice:'invalid'}:result);}
  catch{if(generation.current===g)setState({status:'blocked'});}
  finally{if(generation.current===g){setCode('');setBusy(false);lock.current=false;}}
 }
 const setup=state.status==='setup',ready=state.status==='ready';
 return <section className="rounded-xl border border-slate-700 bg-slate-950 text-slate-100 p-4 space-y-3">
  <h2 className="text-sm font-semibold">{t.title}</h2>
  {!setup&&<button type="button" disabled={busy} onClick={()=>perform(()=>transport.inspect())} className="rounded-lg border border-slate-600 px-3 py-2 text-xs">{t.check}</button>}
  {ready&&<div className="space-y-2 text-sm"><p>{t.count}: {state.verified.length}</p><ul className="space-y-1">{state.verified.map((f,i)=><li key={f.id}>{f.label||String(i+1)}</li>)}</ul>
  {state.verified.length>1&&<p>{t.ready}</p>}
  {state.unfinished?<p>{t.unfinished}</p>:<button type="button" disabled={busy||!state.verified.length||state.total>=10} onClick={()=>perform(()=>transport.begin())} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs">{t.add}</button>}</div>}
  {setup&&<form className="space-y-2" onSubmit={e=>{e.preventDefault();if(code.length===6)void perform(()=>transport.verify(code));}}><p className="text-sm">{t.guide}</p><code translate="no" className="block break-all rounded-lg bg-slate-800 p-2">{state.secret}</code><label className="block text-xs">{t.code}<input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required disabled={busy} value={code} onChange={e=>setCode(normalizeMfaCode(e.target.value))} className="block w-full rounded-lg bg-slate-900 border border-slate-600 p-2 mt-1"/></label><button type="submit" disabled={busy||code.length!==6} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs">{t.verify}</button></form>}
  <p role="status" className="text-xs">{state.notice==='invalid'?t.invalid:state.status==='unfinished'?t.unfinished:state.status==='limit'?t.limit:['blocked','inactive','recheck','invalid'].includes(state.status)?t.blocked:''}</p>
  <p className="text-xs text-slate-300">{t.risk}</p>
 </section>;
}
