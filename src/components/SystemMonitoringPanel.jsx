import React,{useRef,useState,useEffect} from 'react';
import {summarizeSystemHistory,pageSystemHistory} from '../utils/systemHistoryStats.js';
import {startSystemHistoryRefresh} from '../utils/systemHistoryRefresh.js';
const labels={ka:['ტექნიკური მონიტორინგი','24 საათი','7 დღე','განახლება','მონაცემები ვერ ჩაიტვირთა','შეცდომები არ დაფიქსირებულა','საათი (UTC)','ტექნიკური კოდი','რაოდენობა'],en:['System monitoring','24 hours','7 days','Refresh','History unavailable','No recorded observations','Hour (UTC)','Technical code','Count'],ru:['Мониторинг системы','24 часа','7 дней','Обновить','История недоступна','Нет записей','Час (UTC)','Технический код','Количество']};
function MonitoringContent({read,lang='ka'}){
 const t=labels[lang]||labels.ka;
 const warningText={ka:'ამ საათში განმეორებითი სერვერული შეცდომებია — გადაამოწმეთ.',en:'Repeated server errors this hour — review required.',ru:'Повторные ошибки сервера за этот час — требуется проверка.'}[lang]||'ამ საათში განმეორებითი სერვერული შეცდომებია — გადაამოწმეთ.';
 const more={
 ka:['აღრიცხული შემთხვევები','შეცდომის ტიპები','ამ საათის გაფრთხილებები','წინა','შემდეგი','მონაცემები შერჩევით აღირიცხება; ნულოვანი შედეგი არ ნიშნავს, რომ სისტემა გამართულად მუშაობს.','ტიპების შეჯამება'],
 en:['Recorded observations','Error types','Warnings this hour','Previous','Next','Counts are sampled; zero observations do not establish system health.','Summary by type'],
 ru:['Зарегистрированные наблюдения','Типы ошибок','Предупреждения за час','Назад','Далее','Данные выборочные; нулевой результат не подтверждает исправность системы.','Сводка по типам']
 }[lang]||['აღრიცხული შემთხვევები','შეცდომის ტიპები','ამ საათის გაფრთხილებები','წინა','შემდეგი','მონაცემები შერჩევით აღირიცხება; ნულოვანი შედეგი არ ნიშნავს, რომ სისტემა გამართულად მუშაობს.','ტიპების შეჯამება'];
 const [hours,setHours]=useState(24),[state,setState]=useState({status:'idle'}),[page,setPage]=useState(1);
 const [autoRefresh,setAutoRefresh]=useState(false);
 const [lastRefresh,setLastRefresh]=useState(null);
 const gen=useRef(0),inFlight=useRef(false);
 useEffect(()=>()=>{gen.current++;},[]);
 async function refresh(h){
  if(inFlight.current)return;
  inFlight.current=true;
  const id=++gen.current;setPage(1);setState({status:'loading'});setLastRefresh(null);
  try{const r=await read(h);if(gen.current===id){setState(r);if(r.status==='ready')setLastRefresh(Date.now());}}
  catch{if(gen.current===id)setState({status:'blocked'});}
  finally{inFlight.current=false;}
 }
 useEffect(()=>{
  if(!autoRefresh)return undefined;
  return startSystemHistoryRefresh({refresh:()=>refresh(hours),visible:()=>document.visibilityState==='visible'});
 },[autoRefresh,hours,read]);
 const refreshLabels={ka:['ავტომატური განახლება (2 წუთი)','ბოლო განახლება'],en:['Auto-refresh (2 minutes)','Last refreshed'],ru:['Автообновление (2 минуты)','Последнее обновление']}[lang]||['ავტომატური განახლება (2 წუთი)','ბოლო განახლება'];
 const summary=state.status==='ready'?summarizeSystemHistory(state.rows):null;
 const paged=pageSystemHistory(state.status==='ready'?state.rows:[],page);
 return <section className="min-w-0 space-y-3 rounded-xl border border-slate-700 bg-slate-950 p-4 text-slate-100">
 <h2 className="text-sm font-semibold">{t[0]}</h2>
 <div className="flex flex-wrap gap-2"><select aria-label={t[0]} disabled={state.status==='loading'} value={hours} onChange={e=>{const h=Number(e.target.value);setHours(h);void refresh(h);}} className="rounded-lg bg-slate-800 p-2 text-sm"><option value={24}>{t[1]}</option><option value={168}>{t[2]}</option></select><button type="button" disabled={state.status==='loading'} onClick={()=>refresh(hours)} className="rounded-lg border border-slate-600 px-3 py-2 text-sm">{t[3]}</button></div>
 <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={autoRefresh} onChange={e=>setAutoRefresh(e.target.checked)}/>{refreshLabels[0]}</label>
 {lastRefresh!==null&&state.status==='ready'&&<p className="text-xs text-slate-400">{refreshLabels[1]}: {new Date(lastRefresh).toLocaleTimeString(lang==='ru'?'ru-RU':lang==='en'?'en-US':'ka-GE')}</p>}
 <div role="status" aria-live="polite">{state.status==='loading'?'…':state.status==='ready'&&!state.rows.length?t[5]:['blocked','inactive','disabled'].includes(state.status)?t[4]:''}</div>
 {summary&&<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">{[summary.total,summary.types,summary.warningTypes].map((n,i)=><div key={i} className="rounded-lg border border-slate-700 p-3 min-w-0"><p className="text-xs text-slate-300">{more[i]}</p><p className="text-lg font-semibold tabular-nums">{n.toLocaleString(lang==='ru'?'ru-RU':lang==='en'?'en-US':'ka-GE')}</p></div>)}</div>}
 <p className="text-xs text-slate-400">{more[5]}</p>
 {summary&&summary.byCode.length>0&&<details className="text-xs"><summary className="cursor-pointer">{more[6]}</summary><ul className="space-y-1 pt-2">{summary.byCode.map(r=><li key={r.code} className="flex flex-wrap justify-between gap-2"><span className="break-all">{r.code}</span><span className="tabular-nums">{r.count}</span></li>)}</ul></details>}
 {summary&&summary.warningTypes>0&&<p role="status" className="rounded-lg border border-amber-500/40 p-2 text-xs text-amber-300">{warningText}</p>}
 {state.status==='ready'&&state.rows.length>0&&<div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{t.slice(6).map(x=><th key={x} className="p-2">{x}</th>)}</tr></thead><tbody>{paged.rows.map(r=><tr key={r.hourAt+':'+r.code} className="border-t border-slate-800"><td className="p-2 whitespace-nowrap">{new Date(r.hourAt).toISOString().slice(0,16).replace('T',' ')}</td><td className="p-2 break-all">{r.code}</td><td className="p-2 tabular-nums">{r.count}</td></tr>)}</tbody></table></div>}
 {paged.pages>1&&<nav aria-label={t[0]} className="flex flex-wrap items-center justify-end gap-2 text-xs"><button type="button" disabled={paged.page===1} onClick={()=>setPage(paged.page-1)} className="rounded-lg border border-slate-600 p-2 disabled:opacity-40">{more[3]}</button><span>{paged.page} / {paged.pages}</span><button type="button" disabled={paged.page===paged.pages} onClick={()=>setPage(paged.page+1)} className="rounded-lg border border-slate-600 p-2 disabled:opacity-40">{more[4]}</button></nav>}
 </section>;
}

// Unmount on revocation, not just hide: cached history and refresh preference
// must not reappear if access is later granted again.
export default function SystemMonitoringPanel({enabled=false,...props}){
 return enabled===true?<MonitoringContent {...props}/>:null;
}
