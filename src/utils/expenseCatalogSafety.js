const isValidExpenseDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
};

export const isValidExpenseCatalogueResponse = (rows) => {
  if (!Array.isArray(rows)) return false;

  const ids = new Set();
  return rows.every((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
    const id = String(row.id ?? '').trim();
    const category = typeof row.category === 'string' ? row.category.trim() : '';
    const description = typeof row.description === 'string' ? row.description.trim() : '';
    const amountText = String(row.amount ?? '').trim();
    const amount = Number(amountText);
    const date = String(row.date ?? '').trim();

    if (!id || ids.has(id) || !category || category.length > 80) return false;
    if (!description || description.length > 300) return false;
    if (!/^\d+(?:\.\d{1,2})?$/.test(amountText) || !Number.isFinite(amount) || amount <= 0 || amount > 1000000000) return false;
    if (!isValidExpenseDate(date)) return false;

    ids.add(id);
    return true;
  });
};
