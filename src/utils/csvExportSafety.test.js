import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSemicolonCsv, escapeCsvCell } from './csvExportSafety.js';

test('CSV encoder emits UTF-8 BOM, CRLF rows, semicolon columns and escaped quotes', () => {
  const csv = buildSemicolonCsv(['სახელი', 'თანხა'], [['ქურთუკი; შავი', '125.50'], ['"GEOSTORE"', '0.00']]);
  assert.ok(csv.startsWith('\\uFEFF'));
  assert.ok(csv.includes('\\r\\n'));
  assert.ok(csv.includes('"ქურთუკი; შავი"'));
  assert.ok(csv.includes('"""GEOSTORE"""'));
  assert.equal(csv.split('\\r\\n').length, 3);
});

test('CSV encoder neutralizes formulas after whitespace and control prefixes', () => {
  for (const value of ['=1+1', '+SUM(A1:A2)', '-2+3', '@cmd', '  =1+1', '\\t=1+1', '\\r\\n=1+1']) {
    assert.ok(escapeCsvCell(value).startsWith('"\''));
  }
});

test('CSV encoder preserves safe numeric values and empty cells', () => {
  assert.equal(escapeCsvCell(123.45), '"123.45"');
  assert.equal(escapeCsvCell(null), '""');
});
