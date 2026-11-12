export const parseOptionalMoney = (value) => {
  const text = String(value ?? '').trim();
  if (text === '') return { valid: true, value: null, reason: null };
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
    return { valid: false, value: null, reason: 'format' };
  }

  const amount = Number(text);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1000000000) {
    return { valid: false, value: null, reason: 'range' };
  }

  return { valid: true, value: amount, reason: null };
};

export const parseStockQuantity = (value) => {
  const text = String(value ?? '').trim();
  if (text === '') return { valid: true, value: 0, reason: null };
  if (!/^\d+$/.test(text)) {
    return { valid: false, value: 0, reason: 'format' };
  }

  const amount = Number(text);
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > 1000000) {
    return { valid: false, value: 0, reason: 'range' };
  }

  return { valid: true, value: amount, reason: null };
};
