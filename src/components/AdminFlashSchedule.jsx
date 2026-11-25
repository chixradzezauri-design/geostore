import React,{useEffect,useRef,useState} from 'react';
import {CalendarDays,RefreshCw} from 'lucide-react';
import {formatFlashSaleTime} from '../utils/adminFlashSalePlanning.js';
import {buildFlashScheduleRequest,validateFlashScheduleRows,flashScheduleStatus,summarizeFlashSchedule,filterFlashSchedule,makeFlashScheduleDraft,buildFlashScheduleDraftRequest} from '../utils/adminFlashSchedule.js';
import './adminFlashSchedule.css';

export default function AdminFlashSchedule({client,form,products,plannedStart,immediateBusy,sessionVersion,isCurrentSession,onScheduled}){
 const [rows,setRows]=useState([]);
 const [ready,setReady]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const [clock,setClock]=useState(Date.now);
 const [filter,setFilter]=useState('all');
 const [query,setQuery]=useState('');
 const [draft,setDraft]=useState(null);
 const generation=useRef(0),lock=useRef(false),refreshRef=useRef(null);
 const current=useRef(isCurrentSession);current.current=isCurrentSession;
 useEffect(()=>{
  const epoch=++generation.current;
  lock.current=false;setBusy(false);setReady(false);setRows([]);setError('');setMessage('');setFilter('all');setQuery('');setDraft(null);
  const valid=()=>generation.current===epoch&&current.current(sessionVersion);
  const refresh=async()=>{
   if(lock.current||!valid())return;
   lock.current=true;setBusy(true);setError('');
   try{
    const {data,error:rpcError}=await client.rpc('admin_list_flash_sale_schedule');
    if(rpcError)throw rpcError;
    const next=validateFlashScheduleRows(data);
    if(valid()){setRows(next);setReady(true);setClock(Date.now());}
   }catch(e){if(valid()){setReady(false);setRows([]);setError('დაგეგმვის სერვისი მიუწვდომელია. განაახლეთ სია.');}}
   finally{if(valid()){lock.current=false;setBusy(false);}}
  };
  refreshRef.current=refresh;void refresh();
  const timer=setInterval(()=>{setClock(Date.now());void refresh();},60000);
  return ()=>{generation.current++;clearInterval(timer);refreshRef.current=null;};
 },[client,sessionVersion]);
 const request=buildFlashScheduleRequest(form,plannedStart,clock,products);
 const draftRequest=buildFlashScheduleDraftRequest(draft,clock,products);
 const mutate=async(kind,row)=>{
  if(!ready||lock.current||immediateBusy||!current.current(sessionVersion))return;
  const payload=kind==='create'?buildFlashScheduleRequest(form,plannedStart,Date.now(),products):null;
  const operation=kind==='draft'?buildFlashScheduleDraftRequest(draft,Date.now(),products):null;
  if(kind==='draft'&&!operation)return;
  if(kind==='create'&&!payload)return;
  if(kind==='cancel'&&row?.status!=='pending')return;
  if(!window.confirm(kind==='draft'?(draft.mode==='edit'?'შეინახოთ განრიგის ცვლილება?':'შეიქმნას ახალი აქცია ამავე პროდუქტებით?'):kind==='create'?(payload.p_product_ids?'დაიგეგმოს მხოლოდ '+payload.p_product_ids.length+' მონიშნული პროდუქტი? ფასები ახლა არ შეიცვლება.':'შეინახოთ კატეგორიის აქციის განრიგი? ფასები ახლა არ შეიცვლება.'):'გაუქმდეს დაგეგმილი აქცია?'))return;
  const epoch=generation.current,valid=()=>generation.current===epoch&&current.current(sessionVersion);
  lock.current=true;setBusy(true);setError('');setMessage('');
  let acknowledged=false;
  try{
   const {data,error:rpcError}=await client.rpc(kind==='draft'?operation.rpc:kind==='create'?(payload.p_product_ids?'admin_schedule_selected_flash_sale':'admin_schedule_flash_sale'):'admin_cancel_flash_sale_schedule',kind==='draft'?operation.payload:kind==='create'?payload:{p_id:row.id});
   if(rpcError)throw rpcError;
   if(kind==='create'){validateFlashScheduleRows([data]);if(data.status!=='pending'||(payload.p_product_ids?(data.product_ids?.length!==payload.p_product_ids.length||!payload.p_product_ids.every(id=>data.product_ids.includes(id))):data.product_ids!=null))throw Error('unexpected scope or status');}
   else if(kind==='draft'){
    validateFlashScheduleRows([data]);
    const ids=draft.form.selectedIds;
    if(data.status!=='pending'||data.category!==draft.form.category||
       (ids?(data.product_ids?.length!==ids.length||!ids.every(id=>data.product_ids.includes(id))):data.product_ids!=null)||
       (draft.mode==='edit'?(data.id!==draft.id||data.revision!==draft.revision+1):data.id===draft.id))throw Error('draft scope not confirmed');
   }else if(data!==true)throw Error('cancel not confirmed');
   acknowledged=true;
   if(valid()){setMessage(kind==='draft'?'განრიგის ცვლილება სერვერზე დადასტურდა.':kind==='create'?'განრიგი სერვერზე შენახულია.':'დაგეგმილი აქცია გაუქმებულია.');if(kind==='create')onScheduled();if(kind==='draft')setDraft(null);}
  }catch(e){if(valid())setError('ცვლილება ვერ დადასტურდა. ხელახლა სცადეთ მხოლოდ სიის განახლების შემდეგ.');}
  finally{
   if(valid()){
    lock.current=false;setBusy(false);
    // Reload after every attempt, including ambiguous network errors.
    await refreshRef.current?.();
    if(!acknowledged&&valid())setError(previous=>previous||'ცვლილების შედეგი გადაამოწმეთ განახლებულ სიაში.');
   }
  }
 };
 const pending=rows.filter(row=>row.status==='pending');
 const totals=summarizeFlashSchedule(rows,clock);
 const filtered=filterFlashSchedule(rows,filter,query,clock);
 const statusOptions=[['all','ყველა'],['pending','დაგეგმილი'],['active','მიმდინარე პერიოდი'],['ended','ვადაგასული'],['cancelled','გაუქმებული'],['skipped','გამოტოვებული']];
 return <section className="gs-admin-flash-schedule" aria-label="აქციების განრიგი">
  <header><div><h4><CalendarDays size={17} aria-hidden="true"/> აქციების განრიგი</h4><p>თბილისის დრო · სერვერზე შენახული ჩანაწერები</p></div><button type="button" disabled={busy} onClick={()=>void refreshRef.current?.()} aria-label="განრიგის განახლება"><RefreshCw size={16} aria-hidden="true"/> განახლება</button></header>
  <div className="gs-admin-flash-schedule-summary"><span>დაგეგმილი <strong>{ready?pending.length:'—'}</strong></span><span>უახლოესი დაწყება <strong>{pending.length?formatFlashSaleTime(Date.parse(pending[0].starts_at)):'—'}</strong></span></div>
  <button type="button" className="gs-admin-flash-schedule-create" disabled={!ready||!request||busy||immediateBusy} onClick={()=>void mutate('create')}>არჩეული აქციის დაგეგმვა</button>
  {Array.isArray(form.selectedIds)&&<p role="status">განრიგი შეეხება მხოლოდ {form.selectedIds.length} მონიშნულ პროდუქტს. დაწყებისას შეუსაბამო პროდუქტები გამოტოვდება.</p>}
  <p className="gs-admin-flash-schedule-note">აირჩიეთ ზემოთ პროცენტი, კატეგორია, ხანგრძლივობა და დაწყების დრო (მინიმუმ 1 წუთით ადრე). ფასები იცვლება მხოლოდ გაშვების სერვერული პროცესის მოქმედებისას.</p>
  {draft&&<section className="gs-admin-flash-edit" aria-label="განრიგის რედაქტირება">
   <h5>{draft.mode==='edit'?'განრიგის რედაქტირება':'აქციის ასლის შექმნა'}</h5>
   <p>{draft.form.category} · {draft.form.selectedIds?draft.form.selectedIds.length+' მონიშნული პროდუქტი':'მთელი კატეგორია'}. პროდუქტების არჩევანი უცვლელია.</p>
   <div className="gs-admin-flash-history-filters">
    <label>ფასდაკლება (%)<input type="number" min="0.01" max="99.99" step="0.01" disabled={busy} value={draft.form.discountPercent} onChange={e=>setDraft(d=>({...d,form:{...d.form,discountPercent:e.target.value}}))}/></label>
    <label>ხანგრძლივობა<select disabled={busy} value={draft.form.durationHours} onChange={e=>setDraft(d=>({...d,form:{...d.form,durationHours:e.target.value}}))}>{[1,3,6,12,24,48].map(n=><option key={n} value={n}>{n} საათი</option>)}</select></label>
    <label>დაწყება (თბილისი)<input type="datetime-local" disabled={busy} value={draft.plannedStart} onChange={e=>setDraft(d=>({...d,plannedStart:e.target.value}))}/></label>
   </div>
   {!draftRequest&&<p>აირჩიეთ მომავალი დრო და სწორი პროცენტი. მონიშნული პროდუქტები უნდა შეესაბამებოდეს აქციის პირობებს.</p>}
   <div className="gs-admin-flash-edit-actions"><button type="button" disabled={!ready||!draftRequest||busy||immediateBusy} onClick={()=>void mutate('draft')}>შენახვა</button><button type="button" disabled={busy} onClick={()=>setDraft(null)}>დახურვა</button></div>
  </section>}
  {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
  {busy&&!ready&&<p role="status">განრიგი იტვირთება…</p>}
  {ready&&!rows.length&&<p>განრიგში ჩანაწერები ჯერ არ არის.</p>}
  {ready&&<div className="gs-admin-flash-history">
   <h5>განრიგის ისტორია და შედეგები</h5>
   <div className="gs-admin-flash-history-metrics">
    {statusOptions.slice(1).map(([key,label])=><button type="button" key={key} aria-pressed={filter===key} onClick={()=>setFilter(filter===key?'all':key)}><span>{label}</span><strong>{totals[key]}</strong></button>)}
    <div><span>პროდუქტის ფასის განახლებები</span><strong>{totals.productUpdates}</strong></div>
   </div>
   <p className="gs-admin-flash-schedule-note">სტატისტიკა მოიცავს სერვერიდან მიღებულ მაქსიმუმ 100 განრიგის ჩანაწერს. პროდუქტის განახლებები შეიძლება განმეორდეს სხვადასხვა აქციაში. დასრულების დრო არ ადასტურებს ფასის აღდგენას, გაყიდვებს ან შემოსავალს.</p>
   <div className="gs-admin-flash-history-filters"><label>სტატუსი<select value={filter} onChange={e=>setFilter(e.target.value)}>{statusOptions.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>კატეგორია<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="კატეგორიის ძიება" maxLength={200}/></label></div>
   <p role="status">ნაჩვენებია {filtered.length} / {rows.length} ჩანაწერი</p>
   {rows.length>0&&!filtered.length&&<p>ამ ფილტრით ჩანაწერი ვერ მოიძებნა.</p>}
  </div>}
  {filtered.length>0&&<ol className="gs-admin-flash-schedule-list">{filtered.map(row=><li key={row.id}>
   <div><strong>{row.category} · −{Number(row.discount_percent)}%{row.product_ids&&' · '+row.product_ids.length+' მონიშნული'}</strong><span className="gs-admin-flash-schedule-status" data-status={row.status}>{flashScheduleStatus(row,clock)}</span></div>
   <p>{formatFlashSaleTime(Date.parse(row.starts_at))} — {formatFlashSaleTime(Date.parse(row.ends_at))}</p>
   <div><small>{row.status==='started'?'განახლდა '+row.updated_count+' პროდუქტი':row.status==='skipped'?(row.outcome==='missed_window'?'დრო გამოტოვებულია':'შესაფერისი პროდუქტი ვერ მოიძებნა'):''}</small><span className="gs-admin-flash-edit-actions">{row.status==='pending'&&Date.parse(row.starts_at)>clock&&Number.isInteger(row.revision)&&<button type="button" disabled={busy||immediateBusy} onClick={()=>setDraft(makeFlashScheduleDraft(row,'edit',Date.now()))}>რედაქტირება</button>}<button type="button" disabled={busy||immediateBusy} onClick={()=>setDraft(makeFlashScheduleDraft(row,'copy',Date.now()))}>ასლის შექმნა</button>{row.status==='pending'&&<button type="button" disabled={busy||immediateBusy} onClick={()=>void mutate('cancel',row)}>გაუქმება</button>}</span></div>
  </li>)}</ol>}
 </section>;
}
