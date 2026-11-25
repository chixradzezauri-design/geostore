import React,{useEffect,useRef,useState} from 'react';
import {CalendarDays,RefreshCw} from 'lucide-react';
import {formatFlashSaleTime} from '../utils/adminFlashSalePlanning.js';
import {buildFlashScheduleRequest,validateFlashScheduleRows,flashScheduleStatus} from '../utils/adminFlashSchedule.js';
import './adminFlashSchedule.css';

export default function AdminFlashSchedule({client,form,plannedStart,immediateBusy,sessionVersion,isCurrentSession,onScheduled}){
 const [rows,setRows]=useState([]);
 const [ready,setReady]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const [clock,setClock]=useState(Date.now);
 const generation=useRef(0),lock=useRef(false),refreshRef=useRef(null);
 const current=useRef(isCurrentSession);current.current=isCurrentSession;
 useEffect(()=>{
  const epoch=++generation.current;
  lock.current=false;setBusy(false);setReady(false);setRows([]);setError('');setMessage('');
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
 const request=buildFlashScheduleRequest(form,plannedStart,clock);
 const mutate=async(kind,row)=>{
  if(!ready||lock.current||immediateBusy||!current.current(sessionVersion))return;
  const payload=kind==='create'?buildFlashScheduleRequest(form,plannedStart,Date.now()):null;
  if(kind==='create'&&!payload)return;
  if(kind==='cancel'&&row?.status!=='pending')return;
  if(!window.confirm(kind==='create'?'შეინახოთ აქციის განრიგი? ფასები ახლა არ შეიცვლება.':'გაუქმდეს დაგეგმილი აქცია?'))return;
  const epoch=generation.current,valid=()=>generation.current===epoch&&current.current(sessionVersion);
  lock.current=true;setBusy(true);setError('');setMessage('');
  let acknowledged=false;
  try{
   const {data,error:rpcError}=await client.rpc(kind==='create'?'admin_schedule_flash_sale':'admin_cancel_flash_sale_schedule',kind==='create'?payload:{p_id:row.id});
   if(rpcError)throw rpcError;
   if(kind==='create'){validateFlashScheduleRows([data]);if(data.status!=='pending')throw Error('unexpected status');}
   else if(data!==true)throw Error('cancel not confirmed');
   acknowledged=true;
   if(valid()){setMessage(kind==='create'?'განრიგი სერვერზე შენახულია.':'დაგეგმილი აქცია გაუქმებულია.');if(kind==='create')onScheduled();}
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
 return <section className="gs-admin-flash-schedule" aria-label="აქციების განრიგი">
  <header><div><h4><CalendarDays size={17} aria-hidden="true"/> აქციების განრიგი</h4><p>თბილისის დრო · სერვერზე შენახული ჩანაწერები</p></div><button type="button" disabled={busy} onClick={()=>void refreshRef.current?.()} aria-label="განრიგის განახლება"><RefreshCw size={16} aria-hidden="true"/> განახლება</button></header>
  <div className="gs-admin-flash-schedule-summary"><span>დაგეგმილი <strong>{ready?pending.length:'—'}</strong></span><span>უახლოესი დაწყება <strong>{pending.length?formatFlashSaleTime(Date.parse(pending[0].starts_at)):'—'}</strong></span></div>
  <button type="button" className="gs-admin-flash-schedule-create" disabled={!ready||!request||busy||immediateBusy} onClick={()=>void mutate('create')}>არჩეული აქციის დაგეგმვა</button>
  <p className="gs-admin-flash-schedule-note">აირჩიეთ ზემოთ პროცენტი, კატეგორია, ხანგრძლივობა და დაწყების დრო (მინიმუმ 1 წუთით ადრე). ფასები იცვლება მხოლოდ გაშვების სერვერული პროცესის მოქმედებისას.</p>
  {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
  {busy&&!ready&&<p role="status">განრიგი იტვირთება…</p>}
  {ready&&!rows.length&&<p>განრიგში ჩანაწერები ჯერ არ არის.</p>}
  {rows.length>0&&<ol className="gs-admin-flash-schedule-list">{rows.map(row=><li key={row.id}>
   <div><strong>{row.category} · −{Number(row.discount_percent)}%</strong><span className="gs-admin-flash-schedule-status" data-status={row.status}>{flashScheduleStatus(row,clock)}</span></div>
   <p>{formatFlashSaleTime(Date.parse(row.starts_at))} — {formatFlashSaleTime(Date.parse(row.ends_at))}</p>
   <div><small>{row.status==='started'?'განახლდა '+row.updated_count+' პროდუქტი':row.status==='skipped'?(row.outcome==='missed_window'?'დრო გამოტოვებულია':'შესაფერისი პროდუქტი ვერ მოიძებნა'):''}</small>{row.status==='pending'&&<button type="button" disabled={busy||immediateBusy} onClick={()=>void mutate('cancel',row)}>გაუქმება</button>}</div>
  </li>)}</ol>}
 </section>;
}
