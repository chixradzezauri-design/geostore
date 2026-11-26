import React,{useEffect,useState} from 'react';
import {createAdminPurchaseApi} from '../utils/adminPurchaseApi.js';
import {formatPurchaseTetri} from '../utils/adminPurchaseFinance.js';
const control='min-h-11 min-w-0 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white text-sm';
export default function AdminSupplierBalance({suppliers,adminUserId,loadSession,supabaseUrl,apiKey}){
 const [supplier,setSupplier]=useState(''),[snapshot,setSnapshot]=useState(null),[phase,setPhase]=useState('loading'),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let current=true;setSnapshot(null);setPhase('loading');setError('');
  const api=createAdminPurchaseApi({loadSession,expectedUserId:adminUserId,supabaseUrl,apiKey,isCurrent:()=>current});
  api.supplierBalance(supplier||null).then(data=>{if(current){setSnapshot(data);setPhase('ready');}}).catch(err=>{if(current){setError(err?.message||'ქსელის შეცდომა');setPhase('error');}});
  return()=>{current=false;};
 },[supplier,adminUserId,supabaseUrl,apiKey,retry]);
 const verified=phase==='ready'&&snapshot?.supplier_id===(supplier||null);
 return <section aria-label="მომწოდებლების საერთო დავალიანება" className="min-w-0 rounded-xl border border-emerald-500/25 p-3 space-y-2">
  <div className="flex flex-wrap justify-between gap-2"><h4 className="text-sm font-bold text-white">მომწოდებლების საერთო დავალიანება</h4><button type="button" disabled={phase==='loading'} className="min-h-11 rounded-lg border border-slate-700 px-3 py-2 text-xs text-white disabled:opacity-50" onClick={()=>setRetry(n=>n+1)}>ბალანსის განახლება</button></div>
  <p className="text-xs text-slate-400">სრული სერვერული ისტორია, მათ შორის არქივირებული მომწოდებლები. მხოლოდ აქ აღრიცხული შესყიდვები და გადახდები; არ მოიცავს ძველ გარე ვალდებულებებს.</p>
  <label className="block text-xs text-slate-300">მომწოდებელი<select className={control} aria-label="დავალიანების მომწოდებელი" value={supplier} onChange={e=>{setSnapshot(null);setPhase('loading');setSupplier(e.target.value);}}><option value="">ყველა მომწოდებელი</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}{s.is_active?'':' · არქივი'}</option>)}</select></label>
  {phase==='loading'&&<p role="status" className="text-xs text-slate-300">ბალანსი იტვირთება…</p>}
  {phase==='error'&&<p role="alert" className="text-xs text-amber-200 break-words">{error}</p>}
  {verified&&<><p className="text-xs text-slate-400">შესყიდვები: {snapshot.purchase_count}</p><div className="grid grid-cols-1 sm:grid-cols-3 gap-2">{[['მიღებული ღირებულება','received_tetri'],['გადახდილი (კორექტირებით)','paid_tetri'],['დარჩენილი დავალიანება','balance_tetri']].map(([label,key])=><div key={key} data-admin-pro-supply-metric={key} className="min-w-0 rounded-lg border border-slate-700 bg-slate-950/50 p-2"><p className="text-xs text-slate-400">{label}</p><p className="text-sm font-bold text-white break-all tabular-nums">{formatPurchaseTetri(BigInt(snapshot[key]))}</p></div>)}</div></>}
 </section>;
}
