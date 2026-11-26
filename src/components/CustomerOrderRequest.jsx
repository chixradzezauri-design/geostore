import React from 'react';
import {buildCustomerOrderRequest} from '../utils/customerOrderRequest.js';
import './customerOrderRequest.css';

const copy = {
  ka: {title:'დაბრუნება და გაცვლა',return:'დაბრუნების მოთხოვნა',exchange:'გაცვლის მოთხოვნა',note:'მიმართვა გადაეცემა მხარდაჭერას. ეს არ ნიშნავს დაბრუნების ან გაცვლის ავტომატურ დამტკიცებას.'},
  en: {title:'Returns & exchanges',return:'Request return',exchange:'Request exchange',note:'Send a request to support. This does not automatically approve a return or exchange.'},
  ru: {title:'Возврат и обмен',return:'Запросить возврат',exchange:'Запросить обмен',note:'Обращение будет направлено в поддержку. Это не означает автоматического одобрения возврата или обмена.'}
};

export default function CustomerOrderRequest({order,lang='ka',disabled=false,onRequest}) {
  if (!buildCustomerOrderRequest(order,'return',lang)) return null;
  const words=Object.hasOwn(copy,lang)?copy[lang]:copy.ka;
  return <section className="gs-customer-order-request" aria-label={words.title}>
    <strong>{words.title}</strong>
    <div className="gs-customer-order-request-actions">
      <button type="button" disabled={disabled} onClick={()=>onRequest('return')}>{words.return}</button>
      <button type="button" disabled={disabled} onClick={()=>onRequest('exchange')}>{words.exchange}</button>
    </div>
    <small>{words.note}</small>
  </section>;
}
