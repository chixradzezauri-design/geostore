import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const admin = readFileSync(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('expense read and mutations discard cached ledger on explicit 401/403', () => {
  assert.match(admin, /const discardUnauthorizedExpenseData = \(\) => \{[\s\S]*?setExpenses\(\[\]\);[\s\S]*?setExpensesReady\(false\);[\s\S]*?setExpensesLastVerifiedAt\(null\);/);
  assert.equal((admin.match(/if \(isExpenseAccessDeniedStatus\(res\.status\)\)/g) || []).length, 3);
  assert.match(admin, /error\?\.expenseAccessDenied\s*\? 'ხარჯის შენახვა სერვერმა უარყო\./);
  assert.match(admin, /error\?\.expenseAccessDenied\s*\? 'ხარჯის წაშლა სერვერმა უარყო\./);
});

test('finance form, search and private AI responses reset when admin signs out', () => {
  const layout = admin.slice(admin.indexOf('  useLayoutEffect(() => {\n    adminSessionActiveRef.current'));
  assert.match(layout, /setExpenseForm\(\{ category: .*amount: '', date: getLocalDateInputValue\(\), description: '' \}\);/);
  assert.match(layout, /aiResponseVersionRef\.current \+= 1;/);
  assert.match(layout, /setAiChatLogs\(\[\{ role: 'assistant'/);
  assert.match(layout, /setAiQuery\(''\);/);
});

test('scheduled AI finance answer cannot outlive its original admin session', () => {
  const ai = admin.slice(admin.indexOf('  const handleAiAsk = async (e) => {'), admin.indexOf('  const handleAddExpense = async (e) => {'));
  assert.match(ai, /!isOwner \|\| !isCurrentAdminSession\(requestSessionVersion\)/);
  assert.match(ai, /aiResponseInFlightRef\.current = true;/);
  assert.match(ai, /if \(!isCurrentAdminSession\(requestSessionVersion\) \|\| responseVersion !== aiResponseVersionRef\.current\) return;/);
  assert.match(ai, /aiResponseInFlightRef\.current = false;/);
});
