import React,{useEffect,useState} from 'react';
import {createMarketingApi,segmentKeys} from '../utils/marketingConsentApi.js';
import AdminMarketingCampaigns from './AdminMarketingCampaigns.jsx';
const labels={all:'ყველა მომხმარებელი',vip:'VIP',new:'ახალი · 30 დღე',no_purchase:'დასრულებული შესყიდვის გარეშე',one_purchase:'ერთჯერადი მყიდველი',repeat:'განმეორებითი მყიდველი',inactive:'არააქტიური · 90 დღე'};
export default function AdminMarketingSegments({adminUserId,loadSession,supabaseUrl,apiKey}){
 const [snapshot,setSnapshot]=useState(null),[phase,setPhase]=useState('loading'),[filter,setFilter]=useState('all'),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;setSnapshot(null);setPhase('loading');
  createMarketingApi({expectedUserId:adminUserId,loadSession,supabaseUrl,apiKey,isCurrent:()=>active}).segments()
   .then(data=>{if(active){setSnapshot(data);setPhase('ready');}}).catch(()=>{if(active)setPhase('error');});
  return()=>{active=false;};
 },[adminUserId,supabaseUrl,apiKey,retry]);
 const keys=filter==='all'?segmentKeys:segmentKeys.filter(k=>k===filter);
 return <section className="admin-marketing-segments min-w-0 rounded-xl border border-emerald-500/25 p-3 space-y-3" aria-label="მარკეტინგული სეგმენტები">
  <div className="flex flex-wrap justify-between gap-2"><h4 className="text-sm font-bold text-white">მარკეტინგული სეგმენტები</h4><button type="button" disabled={phase==='loading'} className="min-h-11 rounded-xl border border-slate-700 px-3 text-xs text-white disabled:opacity-50" onClick={()=>setRetry(n=>n+1)}>სეგმენტების განახლება</button></div>
  <p className="text-xs text-slate-400">სრული სერვერული ანგარიში. ჯგუფები შეიძლება გადაიკვეთოს; არააქტიურობა ითვლება ბოლო დასრულებული შეკვეთის შექმნის თარიღიდან. თანხმობის შეგროვება და გაგზავნა დროებით გამორთულია. სტატისტიკა მხოლოდ მონახაზების დაგეგმვისთვისაა.</p>
  {phase==='loading'&&<p role="status" className="text-xs text-slate-300">სეგმენტები იტვირთება…</p>}
  {phase==='error'&&<p role="alert" className="text-xs text-amber-200">სეგმენტების მონაცემები ვერ დადასტურდა.</p>}
  {phase==='ready'&&snapshot&&<>
   <label className="block text-xs text-slate-300">სეგმენტის ფილტრი<select className="min-h-11 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">ყველა ჯგუფი</option>{segmentKeys.filter(k=>k!=='all').map(k=><option key={k} value={k}>{labels[k]}</option>)}</select></label>
   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">{keys.map(k=><div key={k} data-admin-segment-card className="min-w-0 rounded-lg bg-slate-950/50 border border-slate-700 p-3"><p className="text-xs text-slate-400 break-words">{labels[k]}</p><p className="text-base font-bold text-white tabular-nums break-all">{snapshot.segments[k].accounts}</p><p className="text-xs text-emerald-300 break-all">თანხმობის კანდიდატები: {snapshot.segments[k].consent_candidates}</p></div>)}</div>
   <p className="text-xs text-slate-400">განახლდა: {new Date(snapshot.as_of).toLocaleString('ka-GE',{timeZone:'Asia/Tbilisi'})} · გაგზავნა გამორთულია.</p>
  </>}
  <AdminMarketingCampaigns key={adminUserId} adminUserId={adminUserId} loadSession={loadSession} supabaseUrl={supabaseUrl} apiKey={apiKey} segmentSnapshot={phase==='ready'?snapshot:null}/>
 </section>;
}
