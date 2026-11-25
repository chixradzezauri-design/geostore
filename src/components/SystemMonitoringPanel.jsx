import React,{useRef,useState,useEffect} from 'react';
import {recentSystemWarnings} from '../utils/systemMonitoringWarnings.js';
const labels={ka:['ტექნიკური მონიტორინგი','24 საათი','7 დღე','განახლება','მონაცემები ვერ ჩაიტვირთა','შეცდომები არ დაფიქსირებულა','საათი (UTC)','ტექნიკური კოდი','რაოდენობა'],en:['System monitoring','24 hours','7 days','Refresh','History unavailable','No recorded observations','Hour (UTC)','Technical code','Count'],ru:['Мониторинг системы','24 часа','7 дней','Обновить','История недоступна','Нет записей','Час (UTC)','Технический код','Количество']};
export default function SystemMonitoringPanel({enabled=false,read,lang='ka'}){
 const t=labels[lang]||labels.ka;
 const warningText={ka:'ამ საათში განმეორებითი სერვერული შეცდომებია — გადაამოწმეთ.',en:'Repeated server errors this hour — review required.',ru:'Повторные ошибки сервера за этот час — требуется проверка.'}[lang]||'ამ საათში განმეორებითი სერვერული შეცდომებია — გადაამოწმეთ.';
 const [hours,setHours]=useState(24),[state,setState]=useState({status:'idle'});
 const gen=useRef(0);
 useEffect(()=>()=>{gen.current++;},[]);
 async function refresh(h){
  const id=++gen.current;setState({status:'loading'});
  try{const r=await read(h);if(gen.current===id)setState(r);}catch{if(gen.current===id)setState({status:'blocked'});}
 }
 if(!enabled)return null;
 return <section className="min-w-0 space-y-3 rounded-xl border border-slate-700 bg-slate-950 p-4 text-slate-100">
 <h2 className="text-sm font-semibold">{t[0]}</h2>
 <div className="flex flex-wrap gap-2"><select aria-label={t[0]} value={hours} onChange={e=>{const h=Number(e.target.value);setHours(h);void refresh(h);}} className="rounded-lg bg-slate-800 p-2 text-sm"><option value={24}>{t[1]}</option><option value={168}>{t[2]}</option></select><button type="button" disabled={state.status==='loading'} onClick={()=>refresh(hours)} className="rounded-lg border border-slate-600 px-3 py-2 text-sm">{t[3]}</button></div>
 <div role="status" aria-live="polite">{state.status==='loading'?'…':state.status==='ready'&&!state.rows.length?t[5]:['blocked','inactive','disabled'].includes(state.status)?t[4]:''}</div>
 {state.status==='ready'&&recentSystemWarnings(state.rows).length>0&&<p role="status" className="rounded-lg border border-amber-500/40 p-2 text-xs text-amber-300">{warningText}</p>}
 {state.status==='ready'&&state.rows.length>0&&<div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{t.slice(6).map(x=><th key={x} className="p-2">{x}</th>)}</tr></thead><tbody>{state.rows.map(r=><tr key={r.hourAt+':'+r.code} className="border-t border-slate-800"><td className="p-2 whitespace-nowrap">{new Date(r.hourAt).toISOString().slice(0,16).replace('T',' ')}</td><td className="p-2 break-all">{r.code}</td><td className="p-2 tabular-nums">{r.count}</td></tr>)}</tbody></table></div>}
 </section>;
}
