import React,{useState} from 'react';
import {customerPurchaseStatistics} from '../utils/customerPurchaseStatistics.js';
import './customerPurchaseStatistics.css';

const copy={
 ka:{title:'ჩემი შენაძენები',all:'სრული ისტორია',month:'ეს თვე',six:'ბოლო 6 თვე',period:'პერიოდი',total:'შეკვეთები',completed:'დასრულებული',pending:'მიმდინარე',cancelled:'გაუქმებული',unknown:'უცნობი სტატუსი',value:'დასრულებული შეკვეთების ჯამი',average:'საშუალო შეკვეთის თანხა',chart:'ბოლო 6 თვე — დასრულებული შეკვეთები',empty:'ამ პერიოდში შეკვეთა არ არის.',loading:'შეკვეთების სტატისტიკა იტვირთება…',unavailable:'სტატისტიკა დროებით მიუწვდომელია.',partial:'ნაჩვენებია ბოლო ჩატვირთული მონაცემები.',note:'ჯამი ეფუძნება ჩატვირთულ შეკვეთებს და მათი შექმნის თარიღს; არ ასახავს გადახდის დადასტურებას ან დაბრუნებულ თანხას.'},
 en:{title:'My purchases',all:'Full history',month:'This month',six:'Last 6 months',period:'Period',total:'Orders',completed:'Completed',pending:'In progress',cancelled:'Cancelled',unknown:'Unknown status',value:'Completed order total',average:'Average order value',chart:'Last 6 months — completed orders',empty:'No orders in this period.',loading:'Loading order statistics…',unavailable:'Statistics temporarily unavailable.',partial:'Showing the last loaded data.',note:'Totals reflect loaded orders and their creation date, not confirmed payments or refunds.'},
 ru:{title:'Мои покупки',all:'Вся история',month:'Этот месяц',six:'Последние 6 месяцев',period:'Период',total:'Заказы',completed:'Завершены',pending:'В процессе',cancelled:'Отменены',unknown:'Неизвестный статус',value:'Сумма завершённых заказов',average:'Средняя сумма заказа',chart:'Последние 6 месяцев — завершённые заказы',empty:'В этом периоде нет заказов.',loading:'Загрузка статистики заказов…',unavailable:'Статистика временно недоступна.',partial:'Показаны последние загруженные данные.',note:'Суммы основаны на загруженных заказах и дате их создания, не учитывают подтверждение оплаты или возврат денег.'}
};
export default function CustomerPurchaseStatistics({orders,loading,error,lang='ka',formatPrice}){
 const [period,setPeriod]=useState('all');
 const words=Object.hasOwn(copy,lang)?copy[lang]:copy.ka;
 const result=customerPurchaseStatistics(orders,{period});
 const hasRows=Array.isArray(orders)&&orders.length>0;
 const max=Math.max(1,...result.months.map(m=>m.totalGEL));
 const monthLabel=key=>new Intl.DateTimeFormat(lang==='en'?'en-GB':lang==='ru'?'ru-RU':'ka-GE',{month:'short',year:'2-digit',timeZone:'UTC'}).format(new Date(key+'-15T12:00:00Z'));
 return <section className="gs-purchase-statistics" aria-label={words.title} aria-busy={loading}>
  <h3>{words.title}</h3>
  {(loading||error)&&!hasRows?<p role="status">{error?words.unavailable:words.loading}</p>:<>
   {error&&<p role="status">{words.partial}</p>}
   <label>{words.period}<select value={period} onChange={e=>setPeriod(e.target.value)}><option value="all">{words.all}</option><option value="month">{words.month}</option><option value="six">{words.six}</option></select></label>
   <div className="gs-purchase-statistics-totals">{['total','completed','pending','cancelled','unknown'].filter(k=>k!=='unknown'||result.unknown>0).map(k=><div key={k}><small>{words[k]}</small><strong>{result[k]}</strong></div>)}</div>
   <div className="gs-purchase-statistics-values"><div><small>{words.value}</small><strong>{formatPrice(result.totalGEL)}</strong></div><div><small>{words.average}</small><strong>{result.averageGEL===null?'—':formatPrice(result.averageGEL)}</strong></div></div>
   {!result.total&&<p>{words.empty}</p>}
   <h4>{words.chart}</h4>
   <ul className="gs-purchase-statistics-chart">{result.months.map(m=><li key={m.key}><span>{monthLabel(m.key)}</span><div aria-hidden="true"><i style={{width:(m.totalGEL/max*100)+'%'}}/></div><strong>{formatPrice(m.totalGEL)}</strong></li>)}</ul>
   <small>{words.note}</small>
  </>}
 </section>;
}
