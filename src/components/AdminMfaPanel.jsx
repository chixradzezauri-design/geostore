import React,{useEffect,useRef,useState} from 'react';
import {initialMfaView,normalizeMfaCode,reduceMfaResult} from '../utils/adminMfaView.js';

const copy={
 ka:{heading:'ორფაქტორიანი ავტორიზაცია',intro:'დაადასტურეთ უსაფრთხოების დამატებითი საფეხური.',inspect:'შემოწმება',setup:'ავტორიზაციის აპლიკაციის დაყენება',secret:'დაამატეთ გასაღები Authenticator აპლიკაციაში (დროითი კოდი). არავის გაუზიაროთ.',device:'ავტორიზაციის მოწყობილობა',code:'ექვსნიშნა კოდი',verify:'კოდის შემოწმება',busy:'მიმდინარეობს შემოწმება…',recheck:'სესიის ხელახლა შემოწმება',recovery:'დაკარგეთ მოწყობილობა?',recoveryText:'გამოიყენეთ სხვა უკვე რეგისტრირებული მოწყობილობა. თუ არცერთი გაქვთ, მიმართეთ უფლებამოსილ მხარდაჭერას პირადობის უსაფრთხო გადამოწმებისთვის. კოდის გვერდის ავლა დაუშვებელია.',failed:'კოდი ვერ დადასტურდა. სცადეთ ახალი კოდი.',blocked:'შემოწმება ვერ დასრულდა. სცადეთ ხელახლა.',pending:'რეგისტრაცია უკვე დაწყებულია. მიმართეთ უსაფრთხოების მხარდაჭერას, თუ გასაღები აღარ გაქვთ.',verified:'დამატებითი შემოწმება დასრულდა. წვდომა ცალკე უნდა დადასტურდეს.',refresh:'სესიის განახლებაა საჭირო.',cancel:'გასვლა'},
 en:{heading:'Two-factor authentication',intro:'Complete the additional security check.',inspect:'Check status',setup:'Set up authenticator',secret:'Add this key in your authenticator app (time-based code). Never share it.',device:'Authenticator device',code:'Six-digit code',verify:'Verify code',busy:'Checking…',recheck:'Recheck session',recovery:'Lost your device?',recoveryText:'Use another previously enrolled device. If none is available, contact authorized support for secure identity verification. Do not bypass the code.',failed:'Code could not be verified. Try a new code.',blocked:'The check could not complete. Try again.',pending:'Enrollment already started. Contact authorized security support if the key is unavailable.',verified:'Additional check completed. Access must be confirmed separately.',refresh:'Session refresh is required.',cancel:'Sign out'},
 ru:{heading:'Двухфакторная аутентификация',intro:'Пройдите дополнительную проверку безопасности.',inspect:'Проверить статус',setup:'Настроить приложение',secret:'Добавьте ключ в приложение (код по времени). Никому его не передавайте.',device:'Устройство аутентификации',code:'Шестизначный код',verify:'Проверить код',busy:'Проверка…',recheck:'Проверить сессию',recovery:'Потеряли устройство?',recoveryText:'Используйте другое ранее зарегистрированное устройство. Если его нет, обратитесь в уполномоченную поддержку для безопасной проверки личности. Не обходите проверку.',failed:'Код не подтверждён. Попробуйте новый код.',blocked:'Не удалось завершить проверку. Повторите попытку.',pending:'Регистрация уже начата. Если ключ недоступен, обратитесь в уполномоченную поддержку.',verified:'Дополнительная проверка пройдена. Доступ подтверждается отдельно.',refresh:'Необходимо обновить сессию.',cancel:'Выйти'}
};
const button='rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 disabled:opacity-50';
function MfaPanel({transport,ownerId,epoch,lang,onRecheck,onSignOut}){
 const t=copy[lang]||copy.ka;
 const [view,setView]=useState(initialMfaView);
 const [code,setCode]=useState('');
 const [busy,setBusy]=useState(false);
 const lock=useRef(false),generation=useRef(0);
 useEffect(()=>()=>{generation.current++;},[]);
 async function perform(action){
  if(lock.current)return;
  lock.current=true;setBusy(true);
  const id=++generation.current;
  try{
   const result=await action();
   if(generation.current!==id)return;
   setView(prev=>reduceMfaResult(prev,result,{ownerId,epoch}));
  }catch{if(generation.current===id)setView(prev=>({...prev,notice:'blocked'}));}
  finally{if(generation.current===id){setCode('');setBusy(false);lock.current=false;}}
 }
 const challenge=view.stage==='challenge'||view.stage==='enroll';
 const notice=view.notice==='verification-failed'||view.notice==='invalid'?t.failed:view.notice==='enrollment-pending'?t.pending:view.notice==='verified'||view.notice==='recheck-required'?t.verified:view.notice==='refresh-required'?t.refresh:view.notice?t.blocked:'';
 return <section aria-label={t.heading} className="mx-auto w-full max-w-md space-y-4 rounded-2xl border border-slate-700 bg-slate-950 p-4 text-slate-100 sm:p-6">
  <h2 className="text-lg font-semibold">{t.heading}</h2>
  <p className="text-sm text-slate-300">{t.intro}</p>
  {view.stage==='idle'||view.stage==='blocked'?<button type="button" className={button} disabled={busy} onClick={()=>perform(()=>transport.inspect())}>{t.inspect}</button>:null}
  {view.stage==='setup'?<button type="button" className={button} disabled={busy} onClick={()=>perform(()=>transport.beginEnrollment())}>{t.setup}</button>:null}
  {challenge?<form className="space-y-3" onSubmit={e=>{e.preventDefault();if(code.length===6)void perform(()=>transport.verify(view.factorId,code));}}>
   {view.stage==='enroll'?<div className="space-y-2"><p className="text-sm">{t.secret}</p><code className="block break-all rounded-lg bg-slate-800 p-3 text-sm" translate="no">{view.secret}</code></div>:<label className="block text-sm">{t.device}<select className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 p-2" value={view.factorId} disabled={busy} onChange={e=>{setView(v=>({...v,factorId:e.target.value}));setCode('');}}>{view.factors.map((f,i)=><option key={f.id} value={f.id}>{f.label||String(i+1)}</option>)}</select></label>}
   <label className="block text-sm">{t.code}<input className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 p-3 text-lg tracking-widest" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" required disabled={busy} value={code} onChange={e=>setCode(normalizeMfaCode(e.target.value))}/></label>
   <button className={button+' w-full bg-emerald-700'} disabled={busy||code.length!==6} type="submit">{t.verify}</button>
  </form>:null}
  {view.stage==='recheck'&&typeof onRecheck==='function'?<button type="button" className={button} disabled={busy} onClick={()=>perform(async()=>{await onRecheck();return {status:'recheck-required'};})}>{t.recheck}</button>:null}
  <p role="status" aria-live="polite" className="text-sm text-slate-300">{busy?t.busy:notice}</p>
  <details className="text-sm text-slate-300"><summary className="cursor-pointer font-medium">{t.recovery}</summary><p className="mt-2">{t.recoveryText}</p></details>
  {typeof onSignOut==='function'?<button type="button" className={button} disabled={busy} onClick={()=>{setView(initialMfaView());setCode('');transport.forgetEnrollment();onSignOut();}}>{t.cancel}</button>:null}
 </section>;
}
// Intentionally not mounted. Parent must remount on owner or session epoch change.
export default function AdminMfaPanel({enabled=false,transport,ownerId,epoch,...props}){
 if(enabled!==true||!transport||!ownerId||!Number.isSafeInteger(epoch))return null;
 return <MfaPanel key={ownerId+':'+epoch} transport={transport} ownerId={ownerId} epoch={epoch} {...props}/>;
}
