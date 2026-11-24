import React,{useEffect,useRef,useState} from 'react';
import {createMarketingApi} from '../utils/marketingConsentApi.js';
const copy={
 ka:{title:'სარეკლამო ელფოსტა',description:'სურვილის შემთხვევაში მიიღეთ GEOSTORE-ის შეთავაზებები და ფასდაკლებები ელფოსტით. თანხმობა ნებაყოფლობითია და შეკვეთებსა და ანგარიშზე წვდომას არ ცვლის. ნებისმიერ დროს შეგიძლიათ უარის თქმა.',not_set:'თანხმობა არ არის გაცემული',withdrawn:'შეთავაზებებზე უარი დაფიქსირებულია',reconfirmation_required:'ელფოსტის თანხმობა ხელახლა დასადასტურებელია',opted_in:'შეთავაზებების მიღებაზე თანხმობა გაცემულია',enable:'ვეთანხმები სარეკლამო ელფოსტას',disable:'სარეკლამო ელფოსტაზე უარის თქმა',refresh:'განახლება',loading:'მოწმდება…',error:'თანხმობის სტატუსი ვერ დადასტურდა. გადაამოწმეთ ხელახლა.',verify:'თანხმობის გასაცემად დაადასტურეთ ელფოსტა.',confirm:'ვეთანხმები GEOSTORE-ის სარეკლამო შეთავაზებების მიღებას ელფოსტით.'},
 en:{title:'Marketing email',description:'Choose whether to receive GEOSTORE offers and discounts by email. Consent is optional and does not affect orders or account access. You can withdraw at any time.',not_set:'No consent given',withdrawn:'Marketing consent withdrawn',reconfirmation_required:'Email consent needs reconfirmation',opted_in:'Marketing email consent given',enable:'Agree to marketing email',disable:'Withdraw marketing consent',refresh:'Refresh',loading:'Checking…',error:'Consent status could not be confirmed. Please refresh.',verify:'Verify your email before opting in.',confirm:'I agree to receive GEOSTORE promotional offers by email.'},
 ru:{title:'Рекламные письма',description:'По желанию получайте предложения и скидки GEOSTORE по электронной почте. Согласие добровольное и не влияет на заказы или доступ к аккаунту. Его можно отозвать в любое время.',not_set:'Согласие не дано',withdrawn:'Согласие отозвано',reconfirmation_required:'Требуется повторное согласие',opted_in:'Согласие на рекламные письма дано',enable:'Согласен получать рекламные письма',disable:'Отозвать согласие',refresh:'Обновить',loading:'Проверка…',error:'Не удалось подтвердить статус согласия. Обновите данные.',verify:'Подтвердите адрес электронной почты перед подпиской.',confirm:'Я согласен получать рекламные предложения GEOSTORE по электронной почте.'}
};
const button='min-h-11 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50';
export default function CustomerMarketingConsent({userId,lang,loadSession,supabaseUrl,apiKey}){
 const t=copy[lang]||copy.ka;
 const [snapshot,setSnapshot]=useState(null),[phase,setPhase]=useState('loading'),[checked,setChecked]=useState(false);
 const active=useRef(false),generation=useRef(0),lock=useRef(null);
 async function run(optedIn=null){
  if(!active.current||lock.current)return;
  const token={},version=generation.current;lock.current=token;
  const current=()=>active.current&&generation.current===version&&lock.current===token;
  const api=createMarketingApi({expectedUserId:userId,loadSession,supabaseUrl,apiKey,isCurrent:current});
  setPhase('loading');setSnapshot(null);
  try{
   if(optedIn!==null){if(!globalThis.crypto?.randomUUID)throw Error('Secure ID unavailable');await api.setConsent(crypto.randomUUID(),optedIn);}
   const result=await api.readConsent();
   if(current()){setSnapshot(result);setPhase('ready');setChecked(false);}
  }catch{if(current()){setPhase('error');setChecked(false);}}
  finally{if(lock.current===token)lock.current=null;}
 }
 useEffect(()=>{active.current=true;generation.current++;void run();return()=>{active.current=false;generation.current++;lock.current=null;};},[userId,supabaseUrl,apiKey]);
 const busy=phase==='loading',canEnable=phase==='ready'&&snapshot?.can_opt_in&&snapshot.status!=='opted_in';
 return <section className="gs-profile-marketing min-w-0 border-t border-slate-800/80 pt-4 space-y-2" aria-label={t.title}>
  <h3 className="text-sm font-bold text-white">{t.title}</h3><p className="text-xs text-slate-400 leading-relaxed">{t.description}</p>
  <p role="status" className="text-xs text-slate-300">{busy?t.loading:phase==='error'?t.error:t[snapshot?.status]}</p>
  {canEnable&&<label className="flex items-start gap-2 text-xs text-slate-300"><input type="checkbox" className="mt-1 shrink-0" checked={checked} onChange={e=>setChecked(e.target.checked)}/>{t.confirm}</label>}
  {phase==='ready'&&!snapshot?.can_opt_in&&<p className="text-xs text-amber-200">{t.verify}</p>}
  <div className="flex flex-wrap gap-2">
   {canEnable&&<button type="button" className={button} disabled={!checked||busy} onClick={()=>{if(checked&&canEnable)void run(true);}}>{t.enable}</button>}
   <button type="button" className={button} disabled={busy||snapshot?.status==='withdrawn'} onClick={()=>void run(false)}>{t.disable}</button>
   <button type="button" className={button} disabled={busy} onClick={()=>void run()}>{t.refresh}</button>
  </div>
 </section>;
}
