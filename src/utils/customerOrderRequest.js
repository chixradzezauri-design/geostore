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

// Subjects are user-provided labels, never proof of order ownership or return eligibility.
export function classifyCustomerOrderRequest(subject) {
  if (typeof subject !== 'string' || subject.length > 150) return null;
  for (const words of Object.values(labels)) {
    for (const kind of ['return','exchange']) {
      const prefix = `${words[kind]} · ${words.order} #`;
      if (!subject.startsWith(prefix)) continue;
      const id = subject.slice(prefix.length);
      if (!id || id !== id.trim() || id.length > 100 || /[\x00-\x1f\x7f]/.test(id)) return null;
      return {kind, orderId:id};
    }
  }
  return null;
}

export function matchesCustomerOrderRequestFilter(subject, filter) {
  if (filter === 'all') return true;
  const request = classifyCustomerOrderRequest(subject);
  return !!request && (filter === 'requests' || request.kind === filter);
}
