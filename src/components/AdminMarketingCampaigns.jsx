import React,{useEffect,useRef,useState} from 'react';
import {createMarketingApi} from '../utils/marketingConsentApi.js';
import {campaignSegments,campaignTemplates,tbilisiPlanToIso,isoToTbilisiPlan,normalizeCampaignFields,campaignConfirmed} from '../utils/marketingCampaigns.js';
import AdminMarketingTemplates from './AdminMarketingTemplates.jsx';
import AdminMarketingPreflight from './AdminMarketingPreflight.jsx';
const blank=()=>({name:'',segment:'all',subject:'',body:'',plan:''});
const input='min-h-11 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-50';
const button='min-h-11 rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50';
const fromRow=row=>({name:row.name,segment:row.segment,subject:row.subject,body:row.body,plan:isoToTbilisiPlan(row.planned_at)});
export default function AdminMarketingCampaigns({adminUserId,loadSession,supabaseUrl,apiKey,segmentSnapshot}){
 const [rows,setRows]=useState([]),[total,setTotal]=useState('0'),[phase,setPhase]=useState('loading'),[notice,setNotice]=useState('');
 const [form,setForm]=useState(blank),[editing,setEditing]=useState(null),[pending,setPending]=useState(null),[filter,setFilter]=useState('active'),[search,setSearch]=useState('');
 const [auditId,setAuditId]=useState('');
 const live=useRef(false),generation=useRef(0),lock=useRef(null),pendingRef=useRef(null);
 const busy=phase==='loading'||phase==='saving',ready=phase==='ready'&&!pending;
 const fields=normalizeCampaignFields({...form,planned_at:tbilisiPlanToIso(form.plan)});
 const dateValid=!!fields&&(fields.planned_at===null||(Date.parse(fields.planned_at)>Date.now()&&Date.parse(fields.planned_at)<=Date.now()+365*86400000));
 const valid=ready&&dateValid;
 const update=(k,v)=>setForm(old=>({...old,[k]:v}));
 const clear=()=>{setEditing(null);setForm(blank());};
 const markPending=op=>{pendingRef.current=op;setPending(op);};
 async function run(op=null,checkOnly=false){
  if(!live.current||lock.current||(pendingRef.current&&op!==pendingRef.current))return;
  const token={},version=generation.current;lock.current=token;
  const current=()=>live.current&&generation.current===version&&lock.current===token;
  const api=createMarketingApi({expectedUserId:adminUserId,loadSession,supabaseUrl,apiKey,isCurrent:current});
  setPhase(op&&!checkOnly?'saving':'loading');setNotice('');
  if(op)markPending(op);
  try{
   if(op&&!checkOnly)await api.saveCampaign(op);
   const listing=await api.campaigns();
   const exact=op?(await api.campaigns(op.id)).campaigns[0]:null;
   if(!current())return;
   setRows(listing.campaigns);setTotal(listing.total);
   if(op){
    if(!campaignConfirmed(exact,op))throw Error('Current revision mismatch');
    markPending(null);clear();setNotice('კამპანია და მიმდინარე ვერსია სერვერზე დადასტურებულია.');
   }
   setPhase('ready');
  }catch(err){
   if(current()){setPhase('error');setRows([]);setNotice(err?.code==='PT409'?'კამპანიის ვერსია შეიცვალა. გადაამოწმეთ შედეგი და განახლებული ვერსია; ძველი მოთხოვნა ავტომატურად არ განმეორდება.':'მოთხოვნა ან მისი მიმდინარე ვერსია ვერ დადასტურდა. განაახლეთ მონაცემები.');}
  }finally{if(lock.current===token)lock.current=null;}
 }
 useEffect(()=>{live.current=true;generation.current++;void run();return()=>{live.current=false;generation.current++;lock.current=null;};},[adminUserId,supabaseUrl,apiKey]);
 function submit(e){
  e.preventDefault();if(!valid||lock.current||!globalThis.crypto?.randomUUID)return;
  void run({id:editing?.id||crypto.randomUUID(),requestId:crypto.randomUUID(),revision:editing?.revision||'0',operation:editing?'edit':'create',fields});
 }
 function archive(row){
  if(!ready||lock.current||!globalThis.crypto?.randomUUID||!window.confirm('კამპანია გადავიდეს არქივში? დაგეგმილი თარიღი მოიხსნება.'))return;
  void run({id:row.id,requestId:crypto.randomUUID(),revision:row.revision,operation:'archive'});
 }
 async function abandon(){
  if(busy||!pending||!window.confirm('დაუკმაყოფილებელი მოთხოვნის გამეორება შეწყდეს? სერვერზე უკვე შენახული ცვლილება არ გაუქმდება. განახლების შემდეგ გადაამოწმეთ კამპანია.'))return;
  markPending(null);clear();await run();
 }
 const visible=rows.filter(row=>(filter==='all'||(filter==='archived'?row.archived:!row.archived))&&[row.name,row.subject].some(v=>v.toLowerCase().includes(search.trim().toLowerCase())));
 const audited=rows.find(row=>row.id===auditId);
 const candidate=segmentSnapshot?.segments?.[form.segment]?.consent_candidates;
 return <section className="admin-marketing-campaigns min-w-0 rounded-xl border border-slate-700 p-3 space-y-3" aria-label="სარეკლამო კამპანიები">
  <div className="flex flex-wrap justify-between gap-2"><h4 className="text-sm font-bold text-white">სარეკლამო კამპანიები</h4><button type="button" className={button} disabled={busy} onClick={()=>void run(pendingRef.current,true)}>კამპანიების განახლება</button></div>
  <p className="text-xs text-amber-200">მხოლოდ მონახაზი და დაგეგმვა. შეტყობინებების გაგზავნა გამორთულია; თარიღი არ არის გაგზავნის ბრძანება.</p>
  {busy&&<p role="status" className="text-xs text-slate-300">მონაცემები მოწმდება…</p>}
  {notice&&<p role={phase==='error'?'alert':'status'} className="text-xs text-slate-300 break-words">{notice}</p>}
  {pending&&<div className="rounded-lg border border-amber-500/30 p-2 space-y-2"><p className="text-xs text-amber-200 break-all">მოსამოწმებელი კამპანია: {pending.id}. არ შექმნათ ახალი ასლი შედეგის შემოწმებამდე.</p><div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={busy} onClick={()=>void run(pending,true)}>შედეგის გადამოწმება</button><button type="button" className={button} disabled={busy} onClick={()=>void run(pending)}>იგივე მოთხოვნის გამეორება</button><button type="button" className={button} disabled={busy} onClick={()=>void abandon()}>გამეორების შეწყვეტა</button></div></div>}
  <AdminMarketingTemplates key={adminUserId} adminUserId={adminUserId} loadSession={loadSession} supabaseUrl={supabaseUrl} apiKey={apiKey} campaignForm={form} canApply={ready} onApply={row=>{if(!ready)return;if((form.subject||form.body)&&!window.confirm('ჩანაცვლდეს კამპანიის ტექსტი შაბლონით?'))return;setForm(old=>({...old,segment:row.segment,subject:row.subject,body:row.body}));}}/>
  <form onSubmit={submit} className="space-y-2">
   <h5 className="text-xs font-bold text-white">{editing?'კამპანიის რედაქტირება':'ახალი კამპანიის მონახაზი'}</h5>
   <div className="flex flex-wrap gap-2">{campaignTemplates.map(t=><button type="button" key={t.id} className={button} disabled={!ready} onClick={()=>{if((form.subject||form.body)&&!window.confirm('შეიცვალოს მონახაზის სათაური და ტექსტი შაბლონით?'))return;setForm(old=>({...old,segment:t.segment,subject:t.subject,body:t.body}));}}>{t.label}</button>)}</div>
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><label className="text-xs text-slate-300">კამპანიის სახელი<input className={input} maxLength={120} disabled={!ready} value={form.name} onChange={e=>update('name',e.target.value)} required/></label><label className="text-xs text-slate-300">სამიზნე სეგმენტი<select className={input} disabled={!ready} value={form.segment} onChange={e=>update('segment',e.target.value)}>{Object.entries(campaignSegments).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label></div>
   <p className="text-xs text-slate-400">თანხმობის კანდიდატები: {candidate??'დაუდასტურებელია'} · შეფასება, არა გასაგზავნი სია.</p>
   <label className="block text-xs text-slate-300">ელფოსტის სათაური<input className={input} maxLength={160} disabled={!ready} value={form.subject} onChange={e=>update('subject',e.target.value)} required/></label>
   <label className="block text-xs text-slate-300">შეტყობინების ტექსტი<textarea className={input} rows={4} maxLength={10000} disabled={!ready} value={form.body} onChange={e=>update('body',e.target.value)} required/></label>
   <label className="block text-xs text-slate-300">დაგეგმილი თარიღი · თბილისის დრო<input type="datetime-local" className={input} disabled={!ready} value={form.plan} onChange={e=>update('plan',e.target.value)}/></label>
   {fields&&!dateValid&&<p className="text-xs text-amber-200">აირჩიეთ მომავალი დრო მომდევნო 365 დღის ფარგლებში.</p>}
   <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-3 space-y-2"><h5 className="text-xs text-slate-400">ტექსტის წინასწარი ხედი · არ იგზავნება</h5><p className="text-sm text-white font-bold break-words">{form.subject||'სათაური'}</p><p className="text-xs text-slate-200 whitespace-pre-wrap break-words">{form.body||'შეტყობინების ტექსტი'}</p></div>
   <div className="flex flex-wrap gap-2"><button type="submit" className={button+' bg-emerald-900'} disabled={!valid}>მონახაზის შენახვა</button><button type="button" className={button} disabled={!ready} onClick={clear}>გასუფთავება</button></div>
  </form>
  {phase==='ready'&&<div className="space-y-2"><h5 className="text-xs font-bold text-white">შენახული კამპანიები · {rows.length} / {total}</h5>{BigInt(total)>BigInt(rows.length)&&<p className="text-xs text-slate-400">ნაჩვენებია ბოლო 100 ჩანაწერი.</p>}
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><input type="search" className={input} aria-label="კამპანიის ძებნა" value={search} onChange={e=>setSearch(e.target.value)} placeholder="სახელი ან სათაური"/><select aria-label="კამპანიის სტატუსი" className={input} value={filter} onChange={e=>setFilter(e.target.value)}><option value="active">მონახაზები</option><option value="archived">არქივი</option><option value="all">ყველა</option></select></div>
   {!visible.length&&<p className="text-xs text-slate-400">ჩანაწერი არ მოიძებნა.</p>}
   {visible.map(row=><div key={row.id} className="min-w-0 rounded-lg border border-slate-700 p-2 space-y-2"><p className="text-sm font-bold text-white break-words">{row.name}</p><p className="text-xs text-slate-400 break-words">{campaignSegments[row.segment]} · {row.archived?'არქივი':'მონახაზი'} · {row.planned_at?new Date(row.planned_at).toLocaleString('ka-GE',{timeZone:'Asia/Tbilisi'}):'თარიღის გარეშე'}</p><div className="flex flex-wrap gap-2">{!row.archived&&<><button type="button" className={button} disabled={!ready} onClick={()=>{setEditing(row);setForm(fromRow(row));}}>რედაქტირება</button><button type="button" className={button} disabled={!ready} onClick={()=>archive(row)}>არქივირება</button></>}<button type="button" className={button} disabled={!ready} onClick={()=>{setEditing(null);setForm({...fromRow(row),name:('ასლი · '+row.name).slice(0,120),plan:''});}}>ასლის შექმნა</button><button type="button" className={button} disabled={!ready} onClick={()=>setAuditId(old=>old===row.id?'':row.id)}>{auditId===row.id?'აუდიტის დახურვა':'უსაფრთხოების აუდიტი'}</button></div></div>)}
   {audited&&<AdminMarketingPreflight key={audited.id+':'+audited.revision} campaign={audited} adminUserId={adminUserId} loadSession={loadSession} supabaseUrl={supabaseUrl} apiKey={apiKey} canCheck={ready}/>} 
  </div>}
 </section>;
}
