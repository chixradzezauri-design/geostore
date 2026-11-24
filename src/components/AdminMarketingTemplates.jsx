import React,{useEffect,useRef,useState} from 'react';
import {createMarketingApi} from '../utils/marketingConsentApi.js';
import {campaignSegments} from '../utils/marketingCampaigns.js';
import {templateCategories,normalizeTemplate,templateConfirmed} from '../utils/marketingTemplates.js';
const blank=()=>({name:'',category:'other',segment:'all',subject:'',body:''});
const input='min-h-11 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-50';
const button='min-h-11 rounded-lg border border-slate-700 px-3 py-2 text-xs text-white disabled:opacity-50';
export default function AdminMarketingTemplates({adminUserId,loadSession,supabaseUrl,apiKey,campaignForm,canApply,onApply}){
 const [rows,setRows]=useState([]),[total,setTotal]=useState('0'),[phase,setPhase]=useState('loading'),[notice,setNotice]=useState('');
 const [form,setForm]=useState(blank),[edit,setEdit]=useState(null),[category,setCategory]=useState('all'),[archived,setArchived]=useState(false),[pending,setPending]=useState(null);
 const live=useRef(false),lock=useRef(null),generation=useRef(0),pendingRef=useRef(null);
 const busy=phase==='loading'||phase==='saving',ready=phase==='ready'&&!pending,fields=normalizeTemplate(form);
 const clear=()=>{setForm(blank());setEdit(null);};
 const mark=op=>{pendingRef.current=op;setPending(op);};
 async function run(op=null,check=false){
  if(!live.current||lock.current||(pendingRef.current&&op!==pendingRef.current))return;
  const token={},g=generation.current;lock.current=token;const current=()=>live.current&&lock.current===token&&generation.current===g;
  const api=createMarketingApi({expectedUserId:adminUserId,loadSession,supabaseUrl,apiKey,isCurrent:current});
  setPhase(op&&!check?'saving':'loading');setNotice('');if(op)mark(op);
  try{
   if(op&&!check)await api.saveTemplate(op);
   const listing=await api.templates();
   const exact=op?(await api.templates(op.id)).templates[0]:null;
   if(!current())return;
   if(op&&!templateConfirmed(exact,op))throw Error('Template revision mismatch');
   setRows(listing.templates);setTotal(listing.total);if(op){mark(null);clear();setNotice('შაბლონი სერვერზე დადასტურებულია.');}setPhase('ready');
  }catch{if(current()){setRows([]);setPhase('error');setNotice('შაბლონები ან მოთხოვნა ვერ დადასტურდა.');}}
  finally{if(lock.current===token)lock.current=null;}
 }
 useEffect(()=>{live.current=true;generation.current++;void run();return()=>{live.current=false;generation.current++;lock.current=null;};},[adminUserId,supabaseUrl,apiKey]);
 function submit(){
  if(!ready||!fields||lock.current||!globalThis.crypto?.randomUUID)return;
  void run({id:edit?.id||crypto.randomUUID(),requestId:crypto.randomUUID(),revision:edit?.revision||'0',operation:edit?'edit':'create',fields});
 }
 const update=(k,v)=>setForm(old=>({...old,[k]:v}));
 const visible=rows.filter(r=>r.archived===archived&&(category==='all'||r.category===category));
 return <details className="admin-marketing-templates min-w-0 rounded-xl border border-slate-700 p-3 space-y-2">
  <summary className="text-sm font-bold text-white cursor-pointer">პერსონალური შაბლონების ბიბლიოთეკა</summary>
  <p className="text-xs text-slate-400">შაბლონი ინახება სერვერზე. კამპანიაში იტვირთება ტექსტის დამოუკიდებელი ასლი; არსებული კამპანიები არ იცვლება.</p>
  <button type="button" className={button} disabled={busy} onClick={()=>void run(pendingRef.current,true)}>შაბლონების განახლება</button>
  {notice&&<p role={phase==='error'?'alert':'status'} className="text-xs text-slate-300">{notice}</p>}
  {busy&&<p role="status" className="text-xs text-slate-400">მოწმდება…</p>}
  {pending&&<div className="space-y-2"><p className="text-xs break-all text-amber-200">მოსამოწმებელი შაბლონი: {pending.id}</p><div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={busy} onClick={()=>void run(pending,true)}>შედეგის გადამოწმება</button><button type="button" className={button} disabled={busy} onClick={()=>void run(pending)}>იგივე მოთხოვნის გამეორება</button><button type="button" className={button} disabled={busy} onClick={()=>{if(window.confirm('შეწყდეს გამეორება? შენახული ცვლილება არ გაუქმდება.')){mark(null);clear();void run();}}}>გამეორების შეწყვეტა</button></div></div>}
  <div className="space-y-2">
   <p className="text-xs font-bold text-white">{edit?'შაბლონის რედაქტირება':'ახალი შაბლონი'}</p>
   <button type="button" className={button} disabled={!ready||!canApply} onClick={()=>{if((form.subject||form.body)&&!window.confirm('ჩანაცვლდეს შაბლონის ტექსტი მიმდინარე კამპანიიდან?'))return;setEdit(null);setForm({...blank(),name:campaignForm.name,segment:campaignForm.segment,subject:campaignForm.subject,body:campaignForm.body});}}>მიმდინარე კამპანიიდან შევსება</button>
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><label className="text-xs text-slate-300">შაბლონის სახელი<input className={input} maxLength={120} disabled={!ready} value={form.name} onChange={e=>update('name',e.target.value)}/></label><label className="text-xs text-slate-300">კატეგორია<select className={input} disabled={!ready} value={form.category} onChange={e=>update('category',e.target.value)}>{Object.entries(templateCategories).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label></div>
   <label className="block text-xs text-slate-300">სეგმენტი<select className={input} disabled={!ready} value={form.segment} onChange={e=>update('segment',e.target.value)}>{Object.entries(campaignSegments).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
   <label className="block text-xs text-slate-300">შაბლონის სათაური<input className={input} maxLength={160} disabled={!ready} value={form.subject} onChange={e=>update('subject',e.target.value)}/></label><label className="block text-xs text-slate-300">შაბლონის ტექსტი<textarea className={input} rows={3} maxLength={10000} disabled={!ready} value={form.body} onChange={e=>update('body',e.target.value)}/></label>
   <div className="flex flex-wrap gap-2"><button type="button" className={button+' bg-emerald-900'} disabled={!ready||!fields} onClick={submit}>შაბლონის შენახვა</button><button type="button" className={button} disabled={!ready} onClick={clear}>ფორმის გასუფთავება</button></div>
  </div>
  {phase==='ready'&&<div className="space-y-2"><p className="text-xs text-slate-400">ბიბლიოთეკა: {rows.length} / {total} {BigInt(total)>100n?' · ბოლო 100 ჩანაწერი':''}</p><div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><select className={input} aria-label="შაბლონის კატეგორიის ფილტრი" value={category} onChange={e=>setCategory(e.target.value)}><option value="all">ყველა კატეგორია</option>{Object.entries(templateCategories).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select><select className={input} aria-label="შაბლონის სტატუსი" value={archived?'archived':'active'} onChange={e=>setArchived(e.target.value==='archived')}><option value="active">აქტიური</option><option value="archived">არქივი</option></select></div>
   {!visible.length&&<p className="text-xs text-slate-400">შაბლონი არ მოიძებნა.</p>}
   {visible.map(row=><div key={row.id} className="rounded-lg border border-slate-700 p-2 space-y-2"><p className="text-sm text-white font-bold break-words">{row.name}</p><p className="text-xs text-slate-400 break-words">{templateCategories[row.category]} · {row.subject}</p>{!row.archived&&<div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={!ready||!canApply} onClick={()=>onApply(row)}>კამპანიაში გამოყენება</button><button type="button" className={button} disabled={!ready} onClick={()=>{setEdit(row);setForm(normalizeTemplate(row));}}>შაბლონის რედაქტირება</button><button type="button" className={button} disabled={!ready} onClick={()=>{if(!lock.current&&globalThis.crypto?.randomUUID&&window.confirm('შაბლონი გადავიდეს არქივში?'))void run({id:row.id,requestId:crypto.randomUUID(),revision:row.revision,operation:'archive'});}}>შაბლონის არქივირება</button></div>}</div>)}
  </div>}
 </details>;
}
