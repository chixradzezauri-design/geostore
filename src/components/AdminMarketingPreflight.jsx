import React,{useEffect,useRef,useState} from 'react';
import {createMarketingApi} from '../utils/marketingConsentApi.js';
import {campaignSegments} from '../utils/marketingCampaigns.js';
import {preflightBlockers,preflightConfirmed} from '../utils/marketingPreflight.js';
const button='min-h-11 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50';
const date=v=>new Date(v).toLocaleString('ka-GE',{timeZone:'Asia/Tbilisi'});
export default function AdminMarketingPreflight({campaign,adminUserId,loadSession,supabaseUrl,apiKey,canCheck}){
 const [history,setHistory]=useState(null),[phase,setPhase]=useState('loading'),[notice,setNotice]=useState(''),[pending,setPending]=useState(null),[filter,setFilter]=useState('all');
 const live=useRef(false),generation=useRef(0),lock=useRef(null),pendingRef=useRef(null);
 const busy=phase==='loading'||phase==='checking',verified=phase==='ready'&&history?.campaign_id===campaign.id,stale=verified&&history.current_revision!==campaign.revision;
 const mark=op=>{pendingRef.current=op;setPending(op);};
 async function run(op=null,checkOnly=false){
  if(!live.current||lock.current||(pendingRef.current&&op!==pendingRef.current))return;
  const token={},g=generation.current;lock.current=token;
  const current=()=>live.current&&generation.current===g&&lock.current===token;
  const api=createMarketingApi({expectedUserId:adminUserId,loadSession,supabaseUrl,apiKey,isCurrent:current});
  setPhase(op&&!checkOnly?'checking':'loading');setNotice('');if(op)mark(op);
  try{
   if(op&&!checkOnly)await api.checkCampaign(op);
   const exact=op?await api.preflights(campaign.id,op.requestId):null;
   const list=await api.preflights(campaign.id);
   if(!current())return;
   if(op&&(!preflightConfirmed(exact.checks[0],op)||BigInt(list.current_revision)<BigInt(exact.current_revision)))throw Error('Preflight history not confirmed');
   setHistory(list);
   if(op){mark(null);setNotice('შემოწმება ისტორიაში დადასტურებულია. გაგზავნა კვლავ გამორთულია.');}
   setPhase('ready');
  }catch{if(current()){setHistory(null);setPhase('error');setNotice('შემოწმების შედეგი ან ისტორია ვერ დადასტურდა.');}}
  finally{if(lock.current===token)lock.current=null;}
 }
 useEffect(()=>{live.current=true;generation.current++;void run();return()=>{live.current=false;generation.current++;lock.current=null;};},[campaign.id,campaign.revision,adminUserId,supabaseUrl,apiKey]);
 function check(){
  if(!canCheck||!verified||stale||busy||pending||lock.current||!globalThis.crypto?.randomUUID)return;
  void run({id:campaign.id,revision:campaign.revision,requestId:crypto.randomUUID()});
 }
 const checks=verified?history.checks.filter(r=>filter==='all'||(filter==='current'?r.campaign_revision===history.current_revision:r.campaign_revision!==history.current_revision)):[];
 return <section aria-label="კამპანიის უსაფრთხოების აუდიტი" className="admin-marketing-preflight min-w-0 rounded-xl border border-amber-500/30 p-3 space-y-3">
  <h5 className="text-sm font-bold text-white break-words">უსაფრთხოების აუდიტი · {campaign.name}</h5>
  <p className="text-xs text-amber-200">გაგზავნა დაბლოკილია. შემოწმება მხოლოდ მოცემული მომენტის სტატისტიკაა და გაგზავნის ნებართვას არ იძლევა.</p>
  <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={!canCheck||!verified||stale||busy||!!pending} onClick={check}>აუდიტორიისა და უსაფრთხოების შემოწმება</button><button type="button" className={button} disabled={busy} onClick={()=>void run(pendingRef.current,true)}>აუდიტის ისტორიის განახლება</button></div>
  {busy&&<p role="status" className="text-xs text-slate-300">შემოწმება მიმდინარეობს…</p>}
  {notice&&<p role={phase==='error'?'alert':'status'} className="text-xs text-slate-300 break-words">{notice}</p>}
  {pending&&<div className="space-y-2"><p className="text-xs text-amber-200 break-all">მოსამოწმებელი მოთხოვნა: {pending.requestId}</p><div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={busy} onClick={()=>void run(pending,true)}>შედეგის გადამოწმება</button><button type="button" className={button} disabled={busy||!canCheck} onClick={()=>void run(pending)}>იგივე შემოწმების გამეორება</button><button type="button" className={button} disabled={busy} onClick={()=>{mark(null);void run();}}>გამეორების შეწყვეტა</button></div></div>}
  {verified&&<>
   {stale&&<p role="alert" className="text-xs text-amber-200">კამპანიის ვერსია შეიცვალა. განაახლეთ კამპანიების სია ახალი შემოწმებისთვის.</p>}
   <p className="text-xs text-slate-400">სერვერის მიმდინარე ვერსია: {history.current_revision} · შემოწმებები: {history.total}{BigInt(history.total)>100n?' · ნაჩვენებია ბოლო 100':''}</p>
   <label className="block text-xs text-slate-300">ისტორიის ფილტრი<select className="min-h-11 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 text-xs text-white" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">ყველა ვერსია</option><option value="current">მიმდინარე ვერსია</option><option value="previous">წინა ვერსიები</option></select></label>
   {!checks.length&&<p className="text-xs text-slate-400">შემოწმება არ მოიძებნა.</p>}
   {checks.map((row,i)=><details key={row.request_id} className="min-w-0 rounded-lg border border-slate-700 p-2" open={i===0||undefined}><summary className="text-xs font-bold text-white cursor-pointer break-words">ვერსია {row.campaign_revision} · {row.campaign_revision===history.current_revision?'მიმდინარე ვერსია':'წინა ვერსია'} · {date(row.checked_at)}</summary>
    <div className="space-y-2 mt-2"><p className="text-xs text-slate-400 break-words">{campaignSegments[row.segment]} · მონაცემები: {date(row.audience_as_of)}</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{[['სეგმენტის ანგარიშები',row.accounts],['თანხმობის კანდიდატები',row.consent_candidates]].map(([label,value])=><div key={label} className="rounded-lg bg-slate-950/50 p-2 min-w-0"><p className="text-xs text-slate-400">{label}</p><p className="text-sm font-bold text-white break-all">{value}</p></div>)}</div><ul className="space-y-1 list-disc pl-4 text-xs text-amber-200">{row.blockers.map(k=><li key={k}>{preflightBlockers[k]}</li>)}</ul><p className="text-xs text-slate-400 break-all">შემოწმების ID: {row.request_id}</p></div>
   </details>)}
  </>}
 </section>;
}
