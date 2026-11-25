import React,{useMemo,useState} from 'react';
import {previewFlashPrices,selectedFlashRows,MAX_FLASH_SELECTION} from '../utils/adminFlashPricePreview.js';
const money=n=>(n/100).toFixed(2)+' ₾';
export default function AdminFlashPricePreview({products,form,scheduled,disabled,onSelectionChange}){
 const [query,setQuery]=useState('');
 const [onlyRisk,setOnlyRisk]=useState(false);
 const [limit,setLimit]=useState(12);
 const result=useMemo(()=>previewFlashPrices(products,form,scheduled),[products,form,scheduled]);
 const selected=Array.isArray(form.selectedIds);
 const ids=selected?form.selectedIds:[];
 const chosen=selectedFlashRows(result,ids);
 const toggle=id=>onSelectionChange(ids.includes(id)?ids.filter(x=>x!==id):ids.length<MAX_FLASH_SELECTION?[...ids,id]:ids);
 const filtered=useMemo(()=>result?.rows.filter(r=>(!onlyRisk||r.raisesPrice)&&[r.name,r.category,r.id].some(v=>v.toLocaleLowerCase('ka-GE').includes(query.trim().toLocaleLowerCase('ka-GE'))))??[],[result,query,onlyRisk]);
 return <section className="min-w-0 rounded-xl border border-slate-700 bg-slate-950/60 p-3 space-y-3" aria-label="ფასების წინასწარი გამოთვლა">
  <h4 className="font-bold text-white">ფასების წინასწარი გამოთვლა</h4>
  <p className="text-slate-300 leading-relaxed">{scheduled?'დაგეგმილი აქცია: ამჟამად ფასდაკლებული ან აქციის ვადიანი პროდუქტები გამოტოვებულია. გაშვებისას პირობები თავიდან მოწმდება.':'დაუყოვნებელი აქცია: პროცენტი ითვლება თავდაპირველი ფასიდან; არსებული ფასდაკლება შეიძლება ჩანაცვლდეს.'} მონაცემები მხოლოდ ჩატვირთულ პროდუქტებს ასახავს. საბოლოო შედეგს სერვერი განსაზღვრავს.</p>
  <fieldset disabled={disabled} className="min-w-0 rounded-lg border border-slate-700 p-2 space-y-2">
   <legend className="px-1 font-bold">აქციის პროდუქტები</legend>
   <label className="flex items-center gap-2 min-h-11"><input type="radio" name="flash-product-scope" checked={!selected} onChange={()=>onSelectionChange(null)}/> მთელი არჩეული კატეგორია</label>
   <label className="flex items-center gap-2 min-h-11"><input type="radio" name="flash-product-scope" checked={selected} onChange={()=>onSelectionChange([])}/> მხოლოდ მონიშნული პროდუქტები</label>
   {selected&&<><p className="text-slate-300">მონიშნულია {ids.length} / {MAX_FLASH_SELECTION}. მონიშვნები შენარჩუნდება ძიებისას. კონკრეტული პროდუქტების განრიგი ჯერ მიუწვდომელია.</p><button type="button" className="min-h-11 rounded-lg border border-slate-600 px-3" onClick={()=>onSelectionChange([])}>მონიშვნების გასუფთავება</button>{ids.length>0&&!chosen&&<p role="alert" className="text-amber-200">ზოგი მონიშნული პროდუქტი აღარ შეესაბამება პირობებს. გაასუფთავეთ არჩევანი და მონიშნეთ თავიდან.</p>}</>}
  </fieldset>
  {!result?<p className="text-slate-400">შეიყვანეთ სწორი ფასდაკლების პროცენტი.</p>:<>
   <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
    {[[result.count,'სავარაუდოდ შერჩეული'],[result.raisesPrice,'მიმდინარე ფასის ზრდა'],[Object.values(result.excluded).reduce((a,b)=>a+b,0),'გამოტოვებული']].map(([value,label])=><div key={label} className="min-w-0 rounded-lg border border-slate-700 p-2"><strong className="block text-lg tabular-nums text-white">{value}</strong><span className="break-words text-slate-300">{label}</span></div>)}
   </div>
   {result.raisesPrice>0&&<p role="alert" className="rounded-lg border border-amber-400/40 p-2 text-amber-200">ყურადღება: {result.raisesPrice} პროდუქტზე ახალი აქციის ფასი მიმდინარე ფასზე მაღალია.</p>}
   <p className="text-slate-400">გამოტოვებული: ვარიანტები {result.excluded.variants} · არსებული ფასდაკლება {result.excluded.existing} · ფასი უცვლელია {result.excluded.rounding} · არასრული მონაცემი {result.excluded.invalid}.</p>
   <div className="flex flex-wrap items-center gap-2"><label className="min-w-0 flex-1">პროდუქტის ძიება<input type="search" value={query} onChange={e=>{setQuery(e.target.value);setLimit(12);}} className="mt-1 block w-full min-w-0 min-h-11 rounded-lg bg-slate-950 border border-slate-600 p-2 text-white" placeholder="სახელი, კატეგორია ან ID"/></label><label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={onlyRisk} onChange={e=>{setOnlyRisk(e.target.checked);setLimit(12);}}/> მხოლოდ ფასის ზრდა</label></div>
   <p className="text-slate-400">{selected?'ძიება მხოლოდ სიას ფილტრავს; აქცია შეეხება მხოლოდ მონიშნულ პროდუქტებს.':'ძიება მხოლოდ წინასწარ სანახავ სიას ფილტრავს. აქცია კვლავ არჩეულ კატეგორიაზე მოქმედებს.'} ნაჩვენებია {Math.min(limit,filtered.length)} / {filtered.length}.</p>
   <div className="grid gap-2 max-h-96 overflow-y-auto">{filtered.slice(0,limit).map(row=><div key={row.id} className="min-w-0 rounded-lg border border-slate-700 p-2 grid gap-1 sm:grid-cols-2"><label className="min-w-0 break-words font-bold text-white flex items-center gap-2 min-h-11">{selected&&<input type="checkbox" className="shrink-0" checked={ids.includes(row.id)} disabled={disabled||(!ids.includes(row.id)&&ids.length>=MAX_FLASH_SELECTION)} onChange={()=>toggle(row.id)} aria-label={row.name+' მონიშვნა'}/>}<span className="min-w-0 break-words">{row.name}</span></label><span className={row.raisesPrice?'text-amber-200 tabular-nums':'text-emerald-300 tabular-nums'}>{money(row.current)} → {money(row.sale)}{row.reference!==row.current&&<small className="block text-slate-400">საწყისი: {money(row.reference)}</small>}</span></div>)}</div>
   {!filtered.length&&<p>შესაბამისი პროდუქტი არ მოიძებნა.</p>}
   {selected&&<p className="text-slate-300">მონიშნულიდან ფასის ზრდა: {chosen?.filter(row=>row.raisesPrice).length??0}.</p>}
   {limit<filtered.length&&<button type="button" onClick={()=>setLimit(n=>n+24)} className="min-h-11 rounded-lg border border-slate-600 px-3">მეტის ნახვა</button>}
  </>}
 </section>;
}
