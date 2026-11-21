import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const admin = readFileSync(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');

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

test('expense history is not verified without server permission before and after pagination', () => {
  const read = admin.slice(admin.indexOf("  const fetchExpenses = async (requestMode = 'manual') => {"), admin.indexOf('  useEffect(() => {\n    // Do not poll private finance data'));
  const verifier = "await requireExpensePermission({ supabaseUrl: SUPABASE_URL, headers:";
  assert.equal(read.split(verifier).length - 1, 2);
  assert.ok(read.indexOf('initialExpenseSession') < read.indexOf('for (let offset = 0; offset < 100000;'));
  assert.ok(read.indexOf('finalExpenseSession') > read.indexOf('if (!completed)'));
  assert.ok(read.indexOf('finalExpenseSession') < read.indexOf('setExpenses(allExpenses)'));
  assert.match(read, /getExpenseSessionHeaders\(initialExpenseSession\.userId\)/);
});

test('expense writes recheck server permission before any POST/DELETE', () => {
  const add = admin.slice(admin.indexOf('  const handleAddExpense = async (e) => {'), admin.indexOf('  const handleDeleteExpense = async (id) => {'));
  const del = admin.slice(admin.indexOf('  const handleDeleteExpense = async (id) => {'), admin.indexOf('  if (!adminLoggedIn || !hasAnyAdminAccess(adminAccess))'));
  for (const operation of [add, del]) {
    assert.ok(operation.indexOf('await requireExpensePermission(') < operation.indexOf('const res = await fetch('));
    assert.match(operation, /if \(error\?\.expenseAccessDenied\) discardUnauthorizedExpenseData\(\);/);
  }
});

test('expense reads and writes pin Supabase session to current App admin user', () => {
  const mountStart = app.indexOf('<AdminDashboardPro');
  assert.ok(mountStart > 0);
  const dashboardMount = app.slice(mountStart, mountStart + 500);
  assert.match(dashboardMount, /adminUserId=\{currentUser\?\.id \|\| null\}/);
  assert.match(admin, /adminUserId = null,/);
  assert.match(admin, /expectedUserId: requireExpensePrincipal\(expectedUserId\)/);
  const read = admin.slice(admin.indexOf("  const fetchExpenses = async (requestMode = 'manual') => {"), admin.indexOf('  useEffect(() => {\n    // Do not poll private finance data'));
  assert.match(read, /const initialExpenseSession = await getExpenseSessionHeaders\(adminUserId\)/);
  assert.match(read, /getExpenseSessionHeaders\(initialExpenseSession\.userId\)/);
  const writes = admin.slice(admin.indexOf('  const handleAddExpense = async (e) => {'), admin.indexOf('  if (!adminLoggedIn || !hasAnyAdminAccess(adminAccess))'));
  assert.equal((writes.match(/getExpenseSessionHeaders\(adminUserId\)/g) || []).length, 2);
});

test('financial CSV export checks live server permission and rejects stale requests', () => {
  const exportCode = admin.slice(admin.indexOf('  const handleExportAnalytics = async () => {'), admin.indexOf('  const handleAiAsk = async (e) => {'));
  assert.match(exportCode, /if \(!expensesVerifiedForReports \|\| expenseMutationInFlightRef\.current \|\| expenseFetchInFlightRef\.current\)/);
  assert.match(exportCode, /expenseExportInFlightRef\.current = true/);
  assert.match(exportCode, /await getExpenseSessionHeaders\(adminUserId\)/);
  assert.match(exportCode, /await requireExpensePermission\(/);
  assert.match(exportCode, /exportRequestId === expenseFetchRequestRef\.current/);
  assert.match(exportCode, /expenseExportMountedRef\.current/);
  assert.ok(exportCode.indexOf('await requireExpensePermission(') < exportCode.indexOf('exportCsv('));
  assert.match(exportCode, /if \(error\?\.expenseAccessDenied\) discardUnauthorizedExpenseData\(\)/);
});

test('expense ledger validation must complete before publishing verified reports', () => {
  const read = admin.slice(admin.indexOf("  const fetchExpenses = async (requestMode = 'manual') => {"), admin.indexOf('  useEffect(() => {\n    // Do not poll private finance data'));
  assert.match(read, /if \(!hasVerifiedExpenseLedgerRows\(allExpenses\)\)/);
  assert.ok(read.indexOf('hasVerifiedExpenseLedgerRows(allExpenses)') < read.indexOf('setExpensesReady(true)'));
  assert.match(admin, /row\.map\(escapeSpreadsheetCsvCell\)/);
});

test('both expense mutations re-read user identity and re-authorize rotated tokens immediately before REST write', () => {
  const add = admin.slice(admin.indexOf('  const handleAddExpense = async (e) => {'), admin.indexOf('  const handleDeleteExpense = async (id) => {'));
  const del = admin.slice(admin.indexOf('  const handleDeleteExpense = async (id) => {'), admin.indexOf('  if (!adminLoggedIn || !hasAnyAdminAccess(adminAccess))'));
  for (const operation of [add, del]) {
    const priorCheck = operation.indexOf('await requireExpensePermission(');
    const finalCheck = operation.indexOf('await getRevalidatedExpenseWriteHeaders(');
    const write = operation.indexOf('const res = await fetch(');
    assert.ok(priorCheck >= 0 && priorCheck < finalCheck && finalCheck < write);
    assert.match(operation, /expectedUserId: adminUserId,/);
    assert.match(operation, /previousHeaders: verifiedHeaders,/);
    assert.match(operation, /if \(!isCurrentMutation\(\)\) return;\s*const headers = new Headers\(currentHeaders\)/);
  }
});

test('principal-keyed admin panel always invalidates old private work on component unmount', () => {
  const mountStart = app.indexOf('<AdminDashboardPro');
  const dashboardMount = app.slice(mountStart, mountStart + 650);
  assert.match(dashboardMount, /key=\{\x60\$\{currentUser\?\.id \|\| 'anonymous'\}/);

  const lifecycle = admin.slice(
    admin.indexOf('  useLayoutEffect(() => {\n    adminSessionActiveRef.current'),
    admin.indexOf('  const fetchActivityLogs = async () => {')
  );
  assert.match(lifecycle, /const invalidatePendingAdminWork = \(\) => invalidateAdminSessionOperations\(/);
  assert.match(lifecycle, /if \(adminLoggedIn\) return invalidatePendingAdminWork/);
  assert.match(lifecycle, /return invalidatePendingAdminWork;\s*\}, \[adminLoggedIn\]\);/);

  const read = admin.slice(admin.indexOf("  const fetchExpenses = async (requestMode = 'manual') => {"), admin.indexOf('  useEffect(() => {\n    // Do not poll private finance data'));
  assert.match(read, /isCurrentAdminSession\(requestSessionVersion\)/);
  const writes = admin.slice(admin.indexOf('  const handleAddExpense = async (e) => {'), admin.indexOf('  if (!adminLoggedIn || !hasAnyAdminAccess(adminAccess))'));
  assert.match(writes, /const isCurrentMutation = \(\) =>[\s\S]*?isCurrentAdminSession\(mutationSession\)/);
  assert.match(admin, /const isCurrentExport = \(\) =>[\s\S]*?isCurrentAdminSession\(exportSessionVersion\)/);
});

test('CSV export reauthorizes a refreshed token for the bound principal before download', () => {
  const exportCode = admin.slice(
    admin.indexOf('  const handleExportAnalytics = async () => {'),
    admin.indexOf('  const handleAiAsk = async (e) => {')
  );
  const originalAuth = exportCode.indexOf('await requireExpensePermission(');
  const newTokenCheck = exportCode.indexOf('await getRevalidatedExpenseAccessHeaders(');
  const download = exportCode.indexOf('exportCsv(');
  assert.ok(originalAuth >= 0 && originalAuth < newTokenCheck && newTokenCheck < download);
  assert.match(exportCode, /expectedUserId: adminUserId,/);
  assert.match(exportCode, /previousHeaders: headers,/);
  assert.match(exportCode, /fetchImpl: fetch/);
  assert.match(exportCode, /if \(!isCurrentExport\(\)\) return;/);
  assert.match(exportCode, /if \(error\?\.expenseAccessDenied\) discardUnauthorizedExpenseData\(\)/);
});
