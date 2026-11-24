import React,{useState} from 'react';
import {ADMIN_DESIGN_TEMPLATE_LIMIT,saveAdminDesignTemplate,applyAdminDesignTemplate,renameAdminDesignTemplate,deleteAdminDesignTemplate} from '../utils/adminPanelVisualDesign.js';
const button='min-h-11 rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50';
const input='min-h-11 min-w-0 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-50';
export default function AdminDesignTemplates({design,onChange,syncStatus}){
 const [name,setName]=useState(''),[scope,setScope]=useState('all'),[notice,setNotice]=useState('');
 const rows=design.designTemplates||[],ready=syncStatus==='saved';
 function commit(next,message){
  if(!ready)return;
  if(!next){setNotice('მოქმედება ვერ შესრულდა. გადაამოწმეთ სახელი, დუბლირება და დიზაინის ზომა.');return;}
  onChange(next);setNotice(message+' საერთო შენახვის სტატუსი იხილეთ რედაქტორის ზედა ნაწილში.');
 }
 function save(){
  if(!ready||!globalThis.crypto?.randomUUID)return;
  const next=saveAdminDesignTemplate(design,{id:crypto.randomUUID(),name:name.trim(),savedAt:new Date().toISOString()});
  commit(next,'შაბლონი დამატებულია.');if(next)setName('');
 }
 return <details className="admin-design-template-library min-w-0 rounded-xl border border-slate-700 bg-slate-950/60 p-3 space-y-3">
  <summary className="cursor-pointer text-sm font-bold text-white">საერთო დიზაინის შაბლონები · {rows.length}/{ADMIN_DESIGN_TEMPLATE_LIMIT}</summary>
  <p className="text-xs text-slate-300 leading-relaxed">შეინახეთ ფერების, შრიფტებისა და განლაგების საერთო პარამეტრები სამივე მოწყობილობისთვის. ტექსტები, ელემენტების ინდივიდუალური სტილები, მოდულის პარამეტრები და ფუნქციები უცვლელი რჩება.</p>
  <p className="text-xs text-slate-400">შაბლონები იყენებს არსებულ საერთო საცავსა და ვერსიის კონფლიქტის დაცვას. მაქსიმუმ 5, საერთო მონაცემების ზომის ლიმიტით. გამოყენება ცვლის ადმინპანელის დიზაინს და ავტომატურად ინახება; Undo ხელმისაწვდომია.</p>
  {!ready&&<p role="status" className="text-xs text-amber-200">დაელოდეთ საერთო დიზაინის შენახვის დადასტურებას ან მოაგვარეთ კონფლიქტი.</p>}
  <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] items-end gap-2"><label className="text-xs text-slate-300">შაბლონის სახელი<input className={input} maxLength={40} value={name} disabled={!ready} onChange={e=>setName(e.target.value)}/></label><button type="button" className={button} disabled={!ready||!name.trim()||rows.length>=ADMIN_DESIGN_TEMPLATE_LIMIT} onClick={save}>მიმდინარე დიზაინის შენახვა</button></div>
  <label className="block text-xs text-slate-300">გამოსაყენებელი პარამეტრები<select className={input} value={scope} onChange={e=>setScope(e.target.value)}><option value="all">ფერები, შრიფტები და განლაგება</option><option value="theme">მხოლოდ ფერები</option><option value="layout">მხოლოდ შრიფტები და განლაგება</option></select></label>
  {notice&&<p role="status" className="text-xs text-slate-300 break-words">{notice}</p>}
  {!rows.length&&<p className="text-xs text-slate-400">შენახული შაბლონი ჯერ არ არის.</p>}
  {rows.map(row=><div key={row.id} className="min-w-0 rounded-lg border border-slate-700 p-2 space-y-2">
   <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-white break-all">{row.name}</p><div className="flex gap-1" aria-label="შაბლონის ძირითადი ფერები">{['canvas','panel','accent','text'].map(k=><span key={k} className="h-5 w-5 rounded border border-slate-500" style={{backgroundColor:row.snapshot.theme[k]}} title={row.snapshot.theme[k]}/>)}</div></div>
   <p className="text-xs text-slate-400 break-words">{row.snapshot.layout.fontFamily} · {row.snapshot.layout.fontSize}px · {new Date(row.savedAt).toLocaleDateString('ka-GE',{timeZone:'Asia/Tbilisi'})}</p>
   <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={!ready} onClick={()=>{if(window.confirm('გამოვიყენოთ შაბლონის არჩეული პარამეტრები სამივე ხედზე? მიმდინარე საერთო დიზაინი შეიცვლება და შეინახება.'))commit(applyAdminDesignTemplate(design,row.id,scope),'შაბლონი გამოყენებულია.');}}>გამოყენება</button><button type="button" className={button} disabled={!ready} onClick={()=>{const value=window.prompt('შაბლონის ახალი სახელი:',row.name);if(value!==null)commit(renameAdminDesignTemplate(design,row.id,value.trim()),'სახელი განახლებულია.');}}>სახელის შეცვლა</button><button type="button" className={button} disabled={!ready} onClick={()=>{if(window.confirm('წაიშალოს მხოლოდ შენახული შაბლონი? მიმდინარე დიზაინი არ შეიცვლება.'))commit(deleteAdminDesignTemplate(design,row.id),'შაბლონი წაშლილია.');}}>წაშლა</button></div>
  </div>)}
 </details>;
}
