// A successful HTTP status alone does not establish that the intended
// expense was persisted. The REST insert must return exactly the row we wrote.
export function isConfirmedExpenseInsert(rows, expected) {
  if (!Array.isArray(rows) || rows.length !== 1 || !expected || typeof expected !== 'object') return false;
  const row = rows[0];
  const expectedId = String(expected.id ?? '').trim();
  if (!expectedId || !row || typeof row !== 'object' || Array.isArray(row)) return false;
  const amount = Number(row.amount);
  return (
    String(row.id ?? '') === expectedId &&
    String(row.category ?? '').trim() === String(expected.category ?? '').trim() &&
    String(row.description ?? '').trim() === String(expected.description ?? '').trim() &&
    String(row.date ?? '').slice(0, 10) === String(expected.date ?? '') &&
    Number.isFinite(amount) && amount > 0 &&
    amount === Number(expected.amount)
  );
}

// DELETE must confirm exactly one deleted row by the requested identifier.
export function isConfirmedExpenseDelete(rows, expectedId) {
  if (!Array.isArray(rows) || rows.length !== 1 || !rows[0] || typeof rows[0] !== 'object' || Array.isArray(rows[0])) return false;
  const id = String(expectedId ?? '').trim();
  return id.length > 0 && String(rows[0].id ?? '') === id;
}
