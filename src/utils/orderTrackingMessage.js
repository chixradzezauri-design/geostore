// Parse order-tracking input without retaining the raw phone in chat history.
export const parseOrderTrackingMessage = (message, pendingOrderCode = '') => {
  const text = String(message ?? '').trim();
  const orderCodeMatch = text.match(/\bORD-[A-Z0-9_-]{6,60}\b/i);
  const phoneCandidate = (
    text.replace(orderCodeMatch?.[0] || '', ' ').match(/\+?\d[\d\s().-]{5,}\d/g) || []
  )[0] || '';
  const phone = phoneCandidate.replace(/\D/g, '');
  const orderCode = orderCodeMatch?.[0].replace(/\s+/g, '').toUpperCase() || '';
  const pendingCode = String(pendingOrderCode || '').trim().toUpperCase();
  const activeOrderCode = orderCode || pendingCode;
  const orderIntent = Boolean(orderCode || pendingCode) ||
    /შეკვეთ|სტატუს|order|tracking|заказ|статус/i.test(text);

  return {
    orderIntent,
    orderCode: activeOrderCode,
    phone,
    hasPhoneCandidate: Boolean(phoneCandidate),
    phoneIsValid: /^\d{9,15}$/.test(phone),
    safeUserText: orderIntent && phoneCandidate
      ? text.replace(phoneCandidate, '•••••••••')
      : text
  };
};
