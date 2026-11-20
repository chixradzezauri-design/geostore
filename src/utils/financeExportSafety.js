// Spreadsheet tools may execute CSV values starting with formulas, even
// when a CSV field is quoted. Guard both formula prefixes and invisible
// leading characters often used to bypass simple prefix checks.
export function escapeSpreadsheetCsvCell(value) {
  const raw = value === null || value === undefined ? '' : String(value);
  const needsTextPrefix = /^[=+@\-\s\u0000-\u001f\u007f\u200b-\u200d\ufeff]/u.test(raw);
  const safe = needsTextPrefix ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
}

// RLS can produce a successfully fetched page with malformed historical
// expense amounts; duplicate IDs across offset pages can also inflate totals.
// Never publish such a ledger as complete/verified for financial reports.
export function hasVerifiedExpenseLedgerRows(rows) {
  if (!Array.isArray(rows)) return false;
  const ids = new Set();
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
    const id = String(row.id ?? '').trim();
    if (!id || ids.has(id)) return false;
    ids.add(id);
    const rawAmount = row.amount;
    if ((typeof rawAmount !== 'number' && typeof rawAmount !== 'string') ||
        (typeof rawAmount === 'string' && !rawAmount.trim())) return false;
    const amount = Number(rawAmount);
    if (!Number.isFinite(amount) || !Number.isSafeInteger(Math.round(amount * 100))) return false;
  }
  return true;
}
