import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createAdminSupplierApi, normalizeSupplierDraft, planLegacySupplierImport } from '../utils/adminSupplierApi.js';
const blank={name:'',commission:''};
const control='min-h-11 min-w-0 max-w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white text-sm';
const action='min-h-11 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50';
export default function AdminSupplierWorkspace({adminUserId,loadSession,supabaseUrl,apiKey,localRows}){
  const [rows,setRows]=useState([]);
  const [phase,setPhase]=useState('loading');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [draft,setDraft]=useState(blank);
  const [editing,setEditing]=useState(null);
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState('all');
  const generation=useRef(0),active=useRef(false),operation=useRef(null);
  const ready=phase==='ready';
  const busy=phase==='loading'||phase==='saving';
  const plan=useMemo(()=>ready?planLegacySupplierImport(localRows,rows):null,[localRows,rows,ready]);
  const matching=rows.filter(row=>(filter==='all'||(filter==='active'&&row.is_active)||(filter==='archived'&&!row.is_active))&&row.name.toLowerCase().includes(search.trim().toLowerCase()));
  const editCurrent=editing===null||rows.some(row=>row.id===editing.id&&row.revision===editing.revision);
  const validated=normalizeSupplierDraft(draft);
  const duplicate=validated&&rows.some(row=>row.id!==editing?.id&&row.name.toLowerCase()===validated.name.toLowerCase());
  async function run(kind,write){
    if(!active.current||operation.current||kind==='saving'&&!ready)return;
    const token={},version=generation.current;
    operation.current=token;
    const current=()=>active.current&&generation.current===version&&operation.current===token;
    const api=createAdminSupplierApi({loadSession,expectedUserId:adminUserId,supabaseUrl,apiKey,isCurrent:current});
    setPhase(kind);setError('');setNotice('');
    let acknowledged=false;
    try{
      if(write){
        await write(api);
        if(!current())return;
        acknowledged=true;
      }
      const latest=await api.list();
      if(!current())return;
      setRows(latest);setPhase('ready');
      if(acknowledged){setNotice('ცვლილება სერვერზე დადასტურებულია.');setDraft(blank);setEditing(null);}
    }catch(err){
      if(!current())return;
      setRows([]);setPhase('error');
      setError((acknowledged?'ცვლილება დადასტურებულია, მაგრამ სია ხელახლა ვერ ჩაიტვირთა. ':'მოთხოვნის შედეგი ვერ დადასტურდა. ')+(err?.message||'ქსელის შეცდომა'));
      if(acknowledged){setDraft(blank);setEditing(null);}
    }finally{
      if(operation.current===token)operation.current=null;
    }
  }
  useEffect(()=>{
    active.current=true;generation.current++;
    void run('loading');
    return()=>{active.current=false;generation.current++;operation.current=null;};
  },[adminUserId]);
  const cancel=()=>{setEditing(null);setDraft(blank);};
  const submit=e=>{
    e.preventDefault();
    if(!ready||!validated||duplicate||!editCurrent)return;
    if(editing){if(validated.name!==editing.name)return;void run('saving',api=>api.update(editing,{commission:validated.commission,is_active:editing.is_active}));}
    else void run('saving',api=>api.create(validated));
  };
  const toggle=row=>{
    if(!ready||!rows.some(item=>item.id===row.id&&item.revision===row.revision))return;
    if(!window.confirm(row.is_active?'მომწოდებელი გადავიდეს არქივში? ძველი შეკვეთები და პროდუქტები არ შეიცვლება.':'მომწოდებელი ხელახლა გააქტიურდეს?'))return;
    void run('saving',api=>api.update(row,{commission:row.commission,is_active:!row.is_active}));
  };
  const importOne=candidate=>{
    if(!ready||!plan?.candidates.some(item=>item.name===candidate.name&&item.commission===candidate.commission))return;
    if(!window.confirm('სერვერზე დაემატოს „'+candidate.name+'“? ადგილობრივი ჩანაწერი უცვლელი დარჩება.'))return;
    void run('saving',api=>api.create(candidate));
  };
  return <section className="admin-supplier-workspace min-w-0 rounded-2xl border border-emerald-500/25 bg-slate-900/80 p-3 sm:p-4 space-y-4" aria-labelledby="admin-supplier-workspace-title" aria-busy={busy}>
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0"><h3 id="admin-supplier-workspace-title" className="text-sm font-black text-white">სერვერული მომწოდებლები</h3><p className="text-xs text-slate-400">სხვა მოწყობილობიდან ცვლილებების სანახავად განაახლეთ სია. ადგილობრივი დაგეგმვა ცალკეა.</p></div>
      <button type="button" className={action} disabled={busy} onClick={()=>void run('loading')}>სერვერული სიის განახლება</button>
    </div>
    <p data-supplier-state={phase} role="status" className="text-xs text-slate-300">{phase==='ready'?'სერვერული სია დადასტურებულია · '+rows.length+' ჩანაწერი':phase==='loading'?'სერვერული სია იტვირთება…':phase==='saving'?'ცვლილება და სია მოწმდება…':'სერვერული სია ვერ დადასტურდა. ცვლილებები დაბლოკილია.'}</p>
    {error&&<p role="alert" className="text-xs text-amber-200 break-words">{error} განაახლეთ სია ხელახალ შენახვამდე.</p>}
    {notice&&<p role="status" className="text-xs text-emerald-300">{notice}</p>}
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <label className="min-w-0 text-xs text-slate-300">სერვერული მომწოდებლის სახელი<input aria-label="სერვერული მომწოდებლის სახელი" className={control+' block w-full mt-1'} required maxLength={100} readOnly={editing!==null} disabled={!ready} value={draft.name} onChange={e=>setDraft(old=>({...old,name:e.target.value}))}/></label>
      <label className="min-w-0 text-xs text-slate-300">საკომისიო (%)<input aria-label="სერვერული საკომისიო" type="number" inputMode="decimal" min="0" max="100" step="0.01" required className={control+' block w-full mt-1'} disabled={!ready} value={draft.commission} onChange={e=>setDraft(old=>({...old,commission:e.target.value}))}/></label>
      {duplicate&&<p role="status" className="text-xs text-amber-200 sm:col-span-2">ამ სახელით სერვერზე ჩანაწერი უკვე არსებობს.</p>}
      {ready&&!editCurrent&&<p role="alert" className="text-xs text-amber-200 sm:col-span-2">ჩანაწერი სხვა მოწყობილობაზე შეიცვალა. გააუქმეთ მონახაზი და თავიდან გახსენით.</p>}
      <div className="flex flex-wrap gap-2 sm:col-span-2"><button type="submit" disabled={!ready||!validated||Boolean(duplicate)||!editCurrent} className="min-h-11 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-slate-950 disabled:opacity-50">{editing?'სერვერული საკომისიოს შენახვა':'სერვერული მომწოდებლის დამატება'}</button>{editing&&<button type="button" disabled={busy} className={action} onClick={cancel}>სერვერული რედაქტირების გაუქმება</button>}</div>
    </form>
    {ready&&<>
      <div className="flex flex-wrap gap-2"><input type="search" aria-label="სერვერული მომწოდებლის ძიება" className={control+' flex-1'} value={search} onChange={e=>setSearch(e.target.value)} placeholder="სახელის ძიება"/><select aria-label="სერვერული მომწოდებლის სტატუსი" className={control} value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">ყველა</option><option value="active">აქტიური</option><option value="archived">არქივი</option></select></div>
      <p className="text-xs text-slate-400">ნაჩვენებია {matching.length} / {rows.length}</p>
      {matching.length===0&&<p className="text-xs text-slate-400">შესაბამისი სერვერული მომწოდებელი არ არის.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{matching.map(row=><article key={row.id} className="admin-supplier-card min-w-0 rounded-xl border border-slate-700 p-3 space-y-2"><h4 className="text-sm font-bold text-white break-words">{row.name}</h4><p className="text-xs text-slate-300">საკომისიო: {row.commission}% · {row.is_active?'აქტიური':'არქივი'}</p><div className="flex flex-wrap gap-2"><button type="button" aria-label={'სერვერული საკომისიოს შეცვლა: '+row.name} className={action} onClick={()=>{setEditing(row);setDraft({name:row.name,commission:String(row.commission)});}}>რედაქტირება</button><button type="button" aria-label={(row.is_active?'არქივში გადატანა: ':'გააქტიურება: ')+row.name} className={action} onClick={()=>toggle(row)}>{row.is_active?'არქივი':'გააქტიურება'}</button></div></article>)}</div>
      <div className="rounded-xl border border-slate-700 p-3 space-y-2">
        <h4 className="text-sm font-black text-white">ადგილობრივი ჩანაწერების უსაფრთხო იმპორტი</h4>
        <p className="text-xs text-slate-300">გადასატანი: {plan.candidates.length} · უკვე იდენტური: {plan.already.length} · კონფლიქტი: {plan.conflicts.length} · არასწორი: {plan.invalid.length}</p>
        <p className="text-xs text-slate-400">არცერთი ჩანაწერი ავტომატურად არ გადაიტანება. კონფლიქტები არ გადაიწერება, საწყისი ჩანაწერები არ წაიშლება.</p>
        {plan.candidates.map(item=><div key={item.name} className="flex flex-wrap items-center justify-between gap-2 text-xs text-white"><span className="min-w-0 break-words">{item.name} · {item.commission}%</span><button type="button" aria-label={'სერვერზე იმპორტი: '+item.name} className={action} onClick={()=>importOne(item)}>იმპორტი</button></div>)}
        {plan.conflicts.map((item,i)=><div key={i} className="text-xs text-amber-200 break-words">კონფლიქტი: {item.local.map(value=>value.name+' ('+value.commission+'%)').join(', ')}{item.server?' · სერვერზე: '+item.server.name+' ('+item.server.commission+'%)':''}</div>)}
      </div>
    </>}
    <p className="text-xs text-slate-400">სერვერული საკომისიო ამ ეტაპზე არ ცვლის პროდუქტების ფასს, შეკვეთას, მარაგს ან ფინანსურ ანგარიშს.</p>
  </section>;
}
