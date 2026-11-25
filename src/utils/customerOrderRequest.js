import {customerOrderProgress} from './customerOrderProgress.js';

const labels = {
  ka: {return: 'დაბრუნების მოთხოვნა', exchange: 'გაცვლის მოთხოვნა', order: 'შეკვეთა'},
  en: {return: 'Return request', exchange: 'Exchange request', order: 'Order'},
  ru: {return: 'Запрос на возврат', exchange: 'Запрос на обмен', order: 'Заказ'}
};

// This is a support intake, not a return authorization or refund action.
export function buildCustomerOrderRequest(order, kind, lang = 'ka') {
  if (kind !== 'return' && kind !== 'exchange') return null;
  const progress = customerOrderProgress(order?.status);
  const id = typeof order?.id === 'string' ? order.id.trim() : '';
  if (progress.kind !== 'active' || progress.index !== 3 || !id || id.length > 100 || /[\r\n\x00-\x1f\x7f]/.test(id)) return null;
  const words = Object.hasOwn(labels, lang) ? labels[lang] : labels.ka;
  const subject = `${words[kind]} · ${words.order} #${id}`;
  return subject.length <= 150 ? {kind, subject} : null;
}
