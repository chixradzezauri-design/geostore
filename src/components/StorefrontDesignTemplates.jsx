import React,{useState} from 'react';
import {STOREFRONT_DESIGN_TEMPLATE_LIMIT,saveStorefrontDesignTemplate,applyStorefrontDesignTemplate,renameStorefrontDesignTemplate,deleteStorefrontDesignTemplate} from '../utils/storefrontVisualDesign.js';
import {applySignature2026Design} from '../utils/signature2026Design.js';
const button='min-h-11 rounded-lg border border-slate-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50';
const input='min-h-11 w-full min-w-0 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white disabled:opacity-50';
export default function StorefrontDesignTemplates({design,disabled,onChange}){
 const [name,setName]=useState(''),[scope,setScope]=useState('all'),[notice,setNotice]=useState('');
 const rows=design.designTemplates||[];
 function commit(next,message){if(disabled)return;if(!next){setNotice('მოქმედება ვერ შესრულდა. გადაამოწმეთ სახელი და დუბლირება.');return;}onChange(next);setNotice(message+' საერთო საცავში დასაფიქსირებლად შეინახეთ მონახაზი.');}
 function save(){if(disabled||!globalThis.crypto?.randomUUID)return;const next=saveStorefrontDesignTemplate(design,{id:crypto.randomUUID(),name:name.trim()});commit(next,'შაბლონი დამატებულია.');if(next)setName('');}
 return <details className="gs-storefront-design-templates min-w-0 rounded-xl border border-slate-700 bg-slate-950/60 p-3 space-y-3">
  <summary className="cursor-pointer text-sm font-bold text-white">მთავარი საიტის დიზაინის შაბლონები · {rows.length}/{STOREFRONT_DESIGN_TEMPLATE_LIMIT}</summary>
  <p className="text-xs leading-relaxed text-slate-300">შეინახეთ ფერები, შრიფტები და განლაგება კომპიუტერის, ტაბლეტისა და მობილურისთვის. ტექსტები, ფოტოები, პროდუქტები, სექციების რიგი და ინდივიდუალური სტილები უცვლელი დარჩება.</p>
  <p className="text-xs text-slate-400">შაბლონის გამოყენება ცვლის მხოლოდ მონახაზს. შეინახეთ მონახაზი სხვა მოწყობილობაზე გამოსაჩენად. საიტზე ცვლილების ასახვას ცალკე გამოქვეყნება სჭირდება. შაბლონის სახელი და ვიზუალური პარამეტრები გამოქვეყნებულ კონფიგურაციაშიც შეიძლება მოხვდეს — არ გამოიყენოთ პირადი ან საიდუმლო ინფორმაცია.</p>
  <div className="rounded-lg border border-amber-500/40 p-3 space-y-2">
    <p className="text-sm font-bold text-white">GEOSTORE Signature 2026</p>
    <p className="text-xs leading-relaxed text-slate-300">პრემიუმ კრემისფერი პალიტრა, კომპაქტური განლაგება და ახალი სექციების მიმდევრობა. გამოიყენება მხოლოდ მონახაზზე; პროდუქტები, ფოტოები, ტექსტები და სექციების ხილვადობა შენარჩუნდება.</p>
    <div className="flex gap-1" aria-label="Signature 2026 ფერები">{['#f6f3ef','#ebe5dd','#a38450','#201c19'].map(color=><span key={color} className="h-6 w-6 rounded border border-slate-500" style={{backgroundColor:color}}/>)}</div>
    <button type="button" className={button} disabled={disabled} onClick={()=>{if(window.confirm('Signature 2026-ის ფერები, ზომები და სექციების რიგი სამივე მოწყობილობის მონახაზში გამოვიყენოთ?'))commit(applySignature2026Design(design),'Signature 2026 გამოყენებულია.');}}>Signature 2026-ის გამოყენება</button>
  </div>
  <label className="block text-xs text-slate-300">შაბლონის სახელი<input className={input} value={name} maxLength={40} disabled={disabled} onChange={e=>setName(e.target.value)}/></label>
  <button type="button" className={button} disabled={disabled||!name.trim()||rows.length>=STOREFRONT_DESIGN_TEMPLATE_LIMIT} onClick={save}>მიმდინარე საიტის დიზაინის შენახვა</button>
  <label className="block text-xs text-slate-300">გამოსაყენებელი პარამეტრები<select className={input} value={scope} onChange={e=>setScope(e.target.value)}><option value="all">ყველა საერთო პარამეტრი</option><option value="theme">მხოლოდ ფერები</option><option value="typography">მხოლოდ შრიფტები</option><option value="layout">მხოლოდ ზომები და განლაგება</option></select></label>
  {notice&&<p role="status" className="text-xs text-slate-300 break-words">{notice}</p>}
  {!rows.length&&<p className="text-xs text-slate-400">შენახული შაბლონი ჯერ არ არის.</p>}
  {rows.map(row=><div key={row.id} className="min-w-0 rounded-lg border border-slate-700 p-2 space-y-2"><p className="text-sm font-bold text-white break-words">{row.name}</p><div className="flex flex-wrap gap-1" aria-label="შაბლონის ფერები">{['canvas','surface','accent','ink'].map(k=><span key={k} className="h-6 w-6 rounded border border-slate-500" title={row.snapshot.theme[k]} style={{backgroundColor:row.snapshot.theme[k]}}/>)}</div><p className="text-xs text-slate-400">{row.snapshot.typography.fontFamily} · {row.snapshot.typography.baseFontSize}px</p><div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={disabled} onClick={()=>{if(window.confirm('გამოვიყენოთ არჩეული პარამეტრები სამივე მოწყობილობის მონახაზში?'))commit(applyStorefrontDesignTemplate(design,row.id,scope),'შაბლონი გამოყენებულია.');}}>გამოყენება</button><button type="button" className={button} disabled={disabled} onClick={()=>{const next=window.prompt('შაბლონის ახალი სახელი:',row.name);if(next!==null)commit(renameStorefrontDesignTemplate(design,row.id,next.trim()),'სახელი განახლებულია.');}}>სახელის შეცვლა</button><button type="button" className={button} disabled={disabled} onClick={()=>{if(window.confirm('წაიშალოს მხოლოდ შაბლონი? მიმდინარე დიზაინი არ შეიცვლება.'))commit(deleteStorefrontDesignTemplate(design,row.id),'შაბლონი წაშლილია.');}}>წაშლა</button></div></div>)}
 </details>;
}
