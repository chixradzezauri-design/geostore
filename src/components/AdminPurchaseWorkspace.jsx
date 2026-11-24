import React,{useState,useEffect,useRef} from 'react';
import {createAdminPurchaseApi,normalizePurchaseLines,purchaseOperationConfirmed,purchaseCatalogOptions,purchaseLineKey} from '../utils/adminPurchaseApi.js';
import {formatPurchaseTetri,purchaseDraftTetri,summarizePurchaseFinance} from '../utils/adminPurchaseFinance.js';
const initial=()=>[{product_id:'',variant_id:null,quantity:'',unit_cost:''}];
const control='min-h-11 min-w-0 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white text-sm disabled:opacity-50';
const button='min-h-11 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50';
const labels={draft:'მონახაზი',approved:'დამტკიცებული',partial:'ნაწილობრივ მიღებული',received:'მიღებული',cancelled:'გაუქმებული'};
const lineLabel=l=>l?l.product_name+(l.variant_name?' · '+l.variant_name:''):'';
const money=v=>Number(v).toFixed(2)+' ₾';
export default function AdminPurchaseWorkspace({adminUserId,loadSession,supabaseUrl,apiKey,products=[],refreshProducts}){
 const [phase,setPhase]=useState('loading'),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [suppliers,setSuppliers]=useState([]),[orders,setOrders]=useState([]),[hasMore,setHasMore]=useState(false);
 const [supplierId,setSupplierId]=useState(''),[lines,setLines]=useState(initial),[selected,setSelected]=useState(''),[receiveQty,setReceiveQty]=useState({});
 const [status,setStatus]=useState('all'),[pending,setPending]=useState(null);
 const [financeSupplier,setFinanceSupplier]=useState('all');
 const active=useRef(false),generation=useRef(0),lock=useRef(null),pendingRef=useRef(null);
 const ready=phase==='ready'&&!pending,busy=phase==='loading'||phase==='saving';
 const supplier=suppliers.find(s=>s.id===supplierId&&s.is_active);
 const eligible=purchaseCatalogOptions(products,supplier?.name);
 const clean=normalizePurchaseLines(lines);
 const valid=Boolean(supplier&&clean&&clean.every(l=>eligible.some(p=>purchaseLineKey(p.product_id,p.variant_id)===purchaseLineKey(l.product_id,l.variant_id))));
 const currentOrder=orders.find(o=>o.id===selected);
 const draftTetri=purchaseDraftTetri(lines);
 let finance=null;
 if(phase==='ready'){try{finance=summarizePurchaseFinance(orders);}catch{finance=null;}}
 const financeRow=financeSupplier==='all'?finance?.total:finance?.suppliers.find(s=>s.id===financeSupplier);
 const selectedFinance=finance?.byOrder.get(selected);
 const setOperation=op=>{pendingRef.current=op;setPending(op);};
 async function run(op=null,checkOnly=false){
  if(!active.current||lock.current||op&&!checkOnly&&pendingRef.current&&pendingRef.current!==op)return;
  const token={},version=generation.current;lock.current=token;
  const current=()=>active.current&&generation.current===version&&lock.current===token;
  const api=createAdminPurchaseApi({loadSession,expectedUserId:adminUserId,supabaseUrl,apiKey,isCurrent:current});
  setPhase(op&&!checkOnly?'saving':'loading');setError('');setNotice('');
  if(op)setOperation(op);
  let ack=false;
  try{
   if(op&&!checkOnly){
    if(op.type==='create')await api.create(op.orderId,op.supplierId,op.lines);
    else if(op.type==='transition')await api.transition(op.order,op.action);
    else await api.receive(op.order,op.line,op.receiptId,op.quantity);
    ack=true;
   }
   const nextSuppliers=await api.suppliers();
   const listing=await api.list();
   let exact=null;
   if(op)exact=await api.get(op.orderId);
   if(!current())return;
   setSuppliers(nextSuppliers);setOrders(listing.orders);setHasMore(listing.hasMore);
   if(op){
    if(!purchaseOperationConfirmed(op,exact))throw Error('მოქმედება ისტორიაში ჯერ ვერ დადასტურდა. გადაამოწმეთ ან გაიმეორეთ იგივე მოთხოვნა.');
    setOperation(null);setSelected(exact.id);
    if(op.type==='create'){setLines(initial());setSupplierId('');}
    if(op.type==='receive'){setReceiveQty({});if(refreshProducts)void Promise.resolve().then(refreshProducts).catch(()=>{});}
    setNotice('მოქმედება და ისტორია სერვერზე დადასტურებულია.');
    if(!listing.orders.some(o=>o.id===exact.id))setOrders([exact,...listing.orders].slice(0,101));
   }
   setPhase('ready');
  }catch(err){
   if(!current())return;
   setPhase('error');setOrders([]);setSuppliers([]);
   setError((ack?'სერვერის პასუხი მიღებულია, მაგრამ ისტორია ვერ დადასტურდა. ':'მოთხოვნა ვერ დადასტურდა. ')+(err?.message||'ქსელის შეცდომა'));
  }finally{if(lock.current===token)lock.current=null;}
 }
 useEffect(()=>{active.current=true;generation.current++;void run();return()=>{active.current=false;generation.current++;lock.current=null;};},[adminUserId]);
 const start=op=>{if(ready&&!lock.current)void run(op);};
 function create(e){
  e.preventDefault();if(!ready||!valid)return;
  if(!window.confirm('შეიქმნას შესყიდვის მონახაზი? მარაგი ჯერ არ შეიცვლება.'))return;
  if(!globalThis.crypto?.randomUUID){setError('უსაფრთხო ID ვერ შეიქმნა.');return;}
  start({type:'create',orderId:crypto.randomUUID(),supplierId,lines:clean});
 }
 function transition(order,action){
  if(!ready||!window.confirm(action==='approve'?'დამტკიცდეს შესყიდვა? მარაგი ჯერ არ შეიცვლება.':'გაუქმდეს შესყიდვა?'))return;
  start({type:'transition',orderId:order.id,order,action});
 }
 function receive(order,line){
  const qty=Number(receiveQty[line.id]);
  if(!ready||!Number.isSafeInteger(qty)||qty<1||qty>line.quantity-line.received_quantity)return;
  if(!window.confirm('მიღებულია '+qty+' ერთეული? დადასტურების შემდეგ მარაგი გაიზრდება.'))return;
  if(!globalThis.crypto?.randomUUID){setError('უსაფრთხო ID ვერ შეიქმნა.');return;}
  start({type:'receive',orderId:order.id,order,line,quantity:qty,receiptId:crypto.randomUUID()});
 }
 return <section className="admin-purchase-workspace min-w-0 rounded-2xl border border-emerald-500/25 bg-slate-900/80 p-3 sm:p-4 space-y-4" aria-labelledby="admin-purchase-title" aria-busy={busy}>
  <div className="flex flex-wrap justify-between gap-2"><div className="min-w-0"><h3 id="admin-purchase-title" className="text-sm font-black text-white">მომწოდებლების შესყიდვები</h3><p className="text-xs text-slate-400">მონახაზი, დამტკიცება და ნაწილობრივი მიღება · საბაზისო და ვარიანტების მარაგი</p></div><button type="button" className={button} disabled={busy} onClick={()=>void run(pendingRef.current,true)}>შესყიდვების განახლება</button></div>
  <p role="status" data-purchase-state={phase} className="text-xs text-slate-300">{phase==='ready'?'სერვერული ისტორია დადასტურებულია':phase==='loading'?'იტვირთება…':phase==='saving'?'მოქმედება მოწმდება…':'ისტორია ვერ დადასტურდა'}</p>
  {error&&<p role="alert" className="text-xs text-amber-200 break-words">{error}</p>}{notice&&<p role="status" className="text-xs text-emerald-300">{notice}</p>}
  {pending&&<div className="rounded-xl border border-amber-500/30 p-3 space-y-2"><p className="text-xs text-amber-200 break-all">მოსამოწმებელი მოთხოვნა: {pending.receiptId||pending.orderId}. სხვა მოქმედებები დაბლოკილია. ისტორია გადაამოწმეთ ხელახლა მიღებამდე.</p><button type="button" className={button} disabled={busy} onClick={()=>void run(pending,true)}>შედეგის გადამოწმება</button> <button type="button" className={button} disabled={busy} onClick={()=>void run(pending)}>იგივე მოთხოვნის გამეორება</button></div>}
  <form onSubmit={create} className="space-y-2">
   <label className="block text-xs text-slate-300">მომწოდებელი<select aria-label="შესყიდვის მომწოდებელი" className={control} disabled={!ready} value={supplierId} onChange={e=>{setSupplierId(e.target.value);setLines(initial());}}><option value="">აირჩიეთ</option>{suppliers.filter(s=>s.is_active).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
   {lines.map((line,i)=><div key={i} className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-xl border border-slate-700 p-2"><label className="text-xs text-slate-300">პროდუქტი<select aria-label={'შესყიდვის პროდუქტი '+(i+1)} className={control} disabled={!ready} value={line.product_id?purchaseLineKey(line.product_id,line.variant_id):''} onChange={e=>{const choice=eligible.find(p=>purchaseLineKey(p.product_id,p.variant_id)===e.target.value);setLines(old=>old.map((r,j)=>j===i?{...r,product_id:choice?.product_id||'',variant_id:choice?.variant_id??null}:r));}}><option value="">აირჩიეთ პროდუქტი / ვარიანტი</option>{eligible.map(p=><option key={purchaseLineKey(p.product_id,p.variant_id)} value={purchaseLineKey(p.product_id,p.variant_id)}>{p.label} · {p.stock}</option>)}</select></label>
    {[['quantity','რაოდენობა',1,1000000,'1'],['unit_cost','ერთეულის ფასი ₾',0,1000000000,'0.01']].map(([field,label,min,max,step])=><label key={field} className="text-xs text-slate-300">{label}<input aria-label={label+' '+(i+1)} type="number" inputMode={field==='quantity'?'numeric':'decimal'} min={min} max={max} step={step} required className={control} disabled={!ready} value={line[field]} onChange={e=>setLines(old=>old.map((r,j)=>j===i?{...r,[field]:e.target.value}:r))}/></label>)}
    {lines.length>1&&<button type="button" disabled={!ready} className={button} onClick={()=>setLines(old=>old.filter((_,j)=>i!==j))}>ხაზის ამოღება</button>}</div>)}
   {supplier&&!eligible.length&&<p className="text-xs text-amber-200">ამ მომწოდებელზე შესაბამისი პროდუქტი ან გამართული ვარიანტი არ არის. სახელები ზუსტად უნდა ემთხვეოდეს.</p>}
   <p className="text-xs text-slate-300">მონახაზის ჯამი: <strong className="text-white break-all">{formatPurchaseTetri(draftTetri)}</strong></p>
   <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={!ready||lines.length>=50} onClick={()=>setLines(old=>[...old,...initial()])}>პროდუქტის დამატება</button><button type="button" className={button} disabled={!ready} onClick={()=>{setLines(initial());setSupplierId('');}}>მონახაზის გასუფთავება</button><button type="submit" className={button+' bg-emerald-800'} disabled={!ready||!valid}>შესყიდვის მონახაზის შექმნა</button></div>
  </form>
  {phase==='ready'&&<>
   <section className="rounded-xl border border-slate-700 p-3 space-y-2" aria-label="შესყიდვების ფინანსური მიმოხილვა">
    <h4 className="text-sm font-bold text-white">შესყიდვების ფინანსური მიმოხილვა</h4>
    <p className="text-xs text-slate-400">მხოლოდ ჩატვირთული, დადასტურებული შესყიდვები ({orders.length}{hasMore?' · არასრული ისტორია':''}). თანხები არ ნიშნავს გადახდილ ფულს ან დავალიანებას.</p>
    {finance?<><label className="block text-xs text-slate-300">მომწოდებლის მიხედვით<select aria-label="ფინანსური მიმოხილვის მომწოდებელი" className={control} value={financeSupplier} onChange={e=>setFinanceSupplier(e.target.value)}><option value="all">ყველა</option>{finance.suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    {financeRow?<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">{[['დამტკიცებული შესყიდვები','committed'],['მიღებული საქონლის ღირებულება','received'],['მიუღებელი საქონლის ღირებულება','outstanding'],['მონახაზების ღირებულება','draft'],['გაუქმებული შესყიდვები','cancelled']].map(([label,key])=><div key={key} className="min-w-0 rounded-lg border border-slate-700 bg-slate-950/50 p-2"><p className="text-xs text-slate-400">{label}</p><p className="text-sm font-bold text-white break-all tabular-nums">{formatPurchaseTetri(financeRow[key])}</p></div>)}</div>:<p className="text-xs text-amber-200">არჩეული მომწოდებელი ამ ისტორიაში აღარ ჩანს.</p>}</>:<p role="alert" className="text-xs text-amber-200">ფინანსური მონაცემები ვერ დადასტურდა.</p>}
   </section>
   <label className="block text-xs text-slate-300">ისტორიის სტატუსი<select aria-label="შესყიდვის სტატუსი" className={control} value={status} onChange={e=>setStatus(e.target.value)}><option value="all">ყველა</option>{Object.entries(labels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
   <p className="text-xs text-slate-400">ბოლო {orders.length} ჩანაწერი{hasMore?' · ისტორია შეზღუდულია ბოლო 100 შესყიდვით':''}. ეს არ არის სრული ფინანსური რეესტრი.</p>
   {orders.filter(o=>status==='all'||o.status===status).map(o=><button type="button" key={o.id} className={button+' block w-full text-left break-words'} onClick={()=>{setSelected(o.id);setReceiveQty({});}}>{o.supplier_name} · {labels[o.status]} · {o.created_at.slice(0,10)} · {o.id.slice(0,8)}</button>)}
   {currentOrder&&<div className="rounded-xl border border-slate-700 p-3 space-y-3"><h4 className="text-white text-sm font-black break-words">{currentOrder.supplier_name} · {labels[currentOrder.status]}</h4><p className="text-xs text-slate-400 break-all">{currentOrder.id}</p>
    {selectedFinance&&<p className="text-xs text-slate-300 break-words">ღირებულება: {formatPurchaseTetri(selectedFinance.committed+selectedFinance.draft+selectedFinance.cancelled)} · მიღებული: {formatPurchaseTetri(selectedFinance.received)} · მიუღებელი (დამტკიცებული): {formatPurchaseTetri(selectedFinance.outstanding)}</p>}
    {currentOrder.admin_purchase_lines.map(l=><div key={l.id} className="rounded-lg border border-slate-700 p-2 space-y-2"><p className="text-xs text-white break-words">{lineLabel(l)} · {money(l.unit_cost)} / ერთეული</p><p className="text-xs text-slate-300">შეკვეთილი {l.quantity} · მიღებული {l.received_quantity} · დარჩენილი {l.quantity-l.received_quantity}</p>{['approved','partial'].includes(currentOrder.status)&&l.received_quantity<l.quantity&&<div className="flex flex-wrap gap-2"><input type="number" min="1" max={l.quantity-l.received_quantity} step="1" aria-label={'მისაღები რაოდენობა: '+lineLabel(l)} className={control+' flex-1'} value={receiveQty[l.id]||''} onChange={e=>setReceiveQty(old=>({...old,[l.id]:e.target.value}))}/><button type="button" className={button} disabled={!ready||!Number.isSafeInteger(Number(receiveQty[l.id]))||Number(receiveQty[l.id])<1||Number(receiveQty[l.id])>l.quantity-l.received_quantity} onClick={()=>receive(currentOrder,l)}>მიღების დადასტურება</button></div>}</div>)}
    <div className="flex flex-wrap gap-2">{currentOrder.status==='draft'&&<button type="button" className={button} disabled={!ready} onClick={()=>transition(currentOrder,'approve')}>დამტკიცება</button>}{['draft','approved'].includes(currentOrder.status)&&<button type="button" className={button} disabled={!ready} onClick={()=>transition(currentOrder,'cancel')}>გაუქმება</button>}</div>
    <h5 className="text-xs font-bold text-white">მიღების ისტორია</h5>{currentOrder.admin_purchase_receipts.map(r=><p key={r.id} className="text-xs text-slate-300 break-words">{lineLabel(currentOrder.admin_purchase_lines.find(l=>l.id===r.line_id))} · {r.quantity} ერთეული · მარაგი {r.stock_before} → {r.stock_after} · {r.received_at.slice(0,10)}</p>)}
   </div>}
  </>}
  <p className="text-xs text-slate-400">მონახაზი მარაგს არ ცვლის. მხოლოდ მიღების სერვერული დადასტურება ზრდის მარაგს. არსებული პროდუქტის ფასი და თვითღირებულება უცვლელია. ვარიანტის მიღებისას იცვლება მხოლოდ არჩეული ვარიანტის მარაგი.</p>
 </section>;
}
