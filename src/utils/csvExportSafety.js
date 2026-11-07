export const escapeCsvCell = value => {
  const raw = value === null || value === undefined ? '' : String(value);
  // Excel and other spreadsheet apps may evaluate formulas after leading whitespace/control characters.
  const safe = /^[\\s\\u0000-\\u001F]*[=+@-]/.test(raw) ? "'" + raw : raw;
  return '"' + safe.replace(/"/g, '""') + '"';
};

export const buildSemicolonCsv = (headers, rows) => {
  const csvRows = [headers, ...rows];
  return '\\uFEFF' + csvRows
    .map(row => row.map(escapeCsvCell).join(';'))
    .join('\\r\\n');
};
