import React,{useEffect,useState} from 'react';
import {createAdminPurchaseApi} from '../utils/adminPurchaseApi.js';
import {normalizePayment,parsePaymentGEL,paymentMethods} from '../utils/adminPurchasePayments.js';
import {formatPurchaseTetri} from '../utils/adminPurchaseFinance.js';
const control='min-h-11 min-w-0 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white text-sm disabled:opacity-50';
const button='min-h-11 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50';
const money=v=>formatPurchaseTetri(BigInt(v));
export default function AdminPurchasePayments({order,adminUserId,loadSession,supabaseUrl,apiKey,ready,onRecord}){
 const [snapshot,setSnapshot]=useState(null),[phase,setPhase]=useState('loading'),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const [amount,setAmount]=useState(''),[method,setMethod]=useState('bank_transfer'),[reference,setReference]=useState('');
 useEffect(()=>{
  let current=true;setSnapshot(null);setPhase('loading');setError('');
  const api=createAdminPurchaseApi({loadSession,expectedUserId:adminUserId,supabaseUrl,apiKey,isCurrent:()=>current});
  api.payments(order).then(data=>{if(current){setSnapshot(data);setPhase('ready');}}).catch(err=>{if(current){setError(err?.message||'ქსელის შეცდომა');setPhase('error');}});
  return()=>{current=false;};
 },[order.id,order.revision,adminUserId,supabaseUrl,apiKey,retry]);
 const verified=phase==='ready'&&snapshot?.purchase_id===order.id&&snapshot.revision===String(order.revision);
 const payment=normalizePayment({amount_tetri:parsePaymentGEL(amount),method,reference:reference.trim()});
 const canRecord=ready&&verified&&['partial','received'].includes(order.status)&&BigInt(snapshot.balance_tetri)>0n;
 const valid=canRecord&&payment&&BigInt(payment.amount_tetri)<=BigInt(snapshot.balance_tetri);
 return <section className="min-w-0 rounded-xl border border-slate-700 p-3 space-y-3" aria-label="შესყიდვის გადახდები">
  <div className="flex flex-wrap justify-between gap-2"><h5 className="text-sm font-bold text-white">გადახდები და დავალიანება</h5><button type="button" className={button} disabled={!ready||phase==='loading'} onClick={()=>setRetry(n=>n+1)}>გადახდების განახლება</button></div>
  <p className="text-xs text-slate-400">მხოლოდ ამ შესყიდვის მიღებული საქონელი და სისტემაში დაფიქსირებული გადახდები. საბანკო ოპერაცია არ სრულდება.</p>
  {phase==='loading'&&<p role="status" className="text-xs text-slate-300">გადახდები იტვირთება…</p>}
  {phase==='error'&&<p role="alert" className="text-xs text-amber-200 break-words">{error}</p>}
  {verified&&<>
   <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">{[['მიღებული ღირებულება','received_tetri'],['დაფიქსირებული გადახდა','paid_tetri'],['დარჩენილი დავალიანება','balance_tetri']].map(([label,key])=><div key={key} className="min-w-0 rounded-lg bg-slate-950/60 border border-slate-700 p-2"><p className="text-xs text-slate-400">{label}</p><p className="text-sm font-bold text-white break-all tabular-nums">{money(snapshot[key])}</p></div>)}</div>
   {canRecord&&<div className="space-y-2">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2"><label className="text-xs text-slate-300">გადახდილი თანხა ₾<input className={control} inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} /></label><label className="text-xs text-slate-300">გადახდის მეთოდი<select className={control} value={method} onChange={e=>setMethod(e.target.value)}>{Object.entries(paymentMethods).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label className="text-xs text-slate-300">გადახდის უნიკალური მითითება<input className={control} maxLength={120} value={reference} onChange={e=>setReference(e.target.value)} placeholder="ქვითრის / ტრანზაქციის ნომერი"/></label></div>
    <button type="button" className={button} disabled={!valid} onClick={()=>{if(valid)onRecord(payment);}}>განხორციელებული გადახდის დაფიქსირება</button>
   </div>}
   <h6 className="text-xs font-bold text-white">გადახდის ისტორია ({snapshot.payment_count})</h6>
   {snapshot.has_more&&<p className="text-xs text-amber-200">ნაჩვენებია ბოლო 100 ჩანაწერი; ჯამები მოიცავს სრულ ისტორიას.</p>}
   {!snapshot.payments.length&&<p className="text-xs text-slate-400">გადახდა ჯერ არ დაფიქსირებულა.</p>}
   {snapshot.payments.map(p=><div key={p.id} className="rounded-lg border border-slate-700 p-2 text-xs text-slate-300 break-words"><strong className="text-white">{money(p.amount_tetri)}</strong> · {paymentMethods[p.method]} · {p.recorded_at.slice(0,10)}<p className="break-all">{p.reference}</p>{p.correction&&<p className="text-xs text-amber-200 break-words">კორექტირებულია · {p.correction.reason} · {p.correction.recorded_at.slice(0,10)}</p>}</div>)}
   <p className="text-xs text-slate-400">წინასწარი გადახდა და ჩანაწერის პირდაპირი წაშლა დაუშვებელია. კორექტირებული გადახდა ჯამში აღარ შედის. ახალი კორექტირების ფორმა ჯერ არ არის ჩართული.</p>
  </>}
 </section>;
}
