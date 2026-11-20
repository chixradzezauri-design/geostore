import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeSpreadsheetCsvCell, hasVerifiedExpenseLedgerRows } from '../src/utils/financeExportSafety.js';

test('finance CSV quoting preserves valid Georgian text, separators and double quotes', () => {
  assert.equal(escapeSpreadsheetCsvCell('კატეგორია'), '"კატეგორია"');
  assert.equal(escapeSpreadsheetCsvCell('A;B'), '"A;B"');
  assert.equal(escapeSpreadsheetCsvCell('მან თქვა "კი"'), '"მან თქვა ""კი"""');
  assert.equal(escapeSpreadsheetCsvCell(null), '""');
  assert.equal(escapeSpreadsheetCsvCell(123.45), '"123.45"');
});

test('formula-like spreadsheet values are always prefixed as text', () => {
  for (const raw of ['=1+1', '+SUM(1;2)', '-2+4', '@SUM(A1:A3)', '\t=1+1', '\r\n=1+1', ' =1+1', '\u00a0=1', '\ufeff=1+1', '\u200b=1+1', '\0=1']) {
    const escaped = escapeSpreadsheetCsvCell(raw);
    assert.ok(escaped.startsWith('"\''), JSON.stringify(raw));
    assert.ok(escaped.endsWith('"'));
  }
  assert.equal(escapeSpreadsheetCsvCell('safe=1+1'), '"safe=1+1"');
});

test('verified expense data accepts empty ledger and legitimate signed historic values', () => {
  assert.equal(hasVerifiedExpenseLedgerRows([]), true);
  assert.equal(hasVerifiedExpenseLedgerRows([
    { id: 'a', amount: '125.75' }, { id: 'b', amount: 0 }, { id: 'c', amount: -10.5 }
  ]), true);
});

test('verified expense data rejects duplicate rows and non-numeric amounts instead of treating as zero', () => {
  const valid = { id: 'expense-1', amount: '2.50' };
  for (const invalid of [
    null, {}, [null], [{ ...valid }, { ...valid }], [{ ...valid, id: ' ' }],
    [{ ...valid, amount: null }], [{ ...valid, amount: '' }],
    [{ ...valid, amount: 'NaN' }], [{ ...valid, amount: 'Infinity' }],
    [{ ...valid, amount: Infinity }], [{ ...valid, amount: [] }],
    [{ ...valid, amount: 1e18 }]
  ]) {
    assert.equal(hasVerifiedExpenseLedgerRows(invalid), false, JSON.stringify(invalid));
  }
});
