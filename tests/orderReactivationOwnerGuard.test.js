import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

function readReactivationHandler() {
  const start = source.indexOf('const handleConfirmOrderReactivation = async');
  const end = source.indexOf('const handleSaveOrderAdminNote = async', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  return source.slice(start, end);
}

test('completed and cancelled order reactivation are owner-only in the UI', () => {
  assert.match(source, /if \\(!isOwner\\)[\\s\\S]{0,180}დასრულებული შეკვეთის ხელახლა გააქტიურება მხოლოდ მთავარ ადმინისტრატორს შეუძლია/);
  assert.match(source, /if \\(!isOwner\\)[\\s\\S]{0,180}გაუქმებული შეკვეთის ხელახლა გააქტიურება მხოლოდ მთავარ ადმინისტრატორს შეუძლია/);
  const handler = readReactivationHandler();
  assert.match(handler, /if \\(!isOwner\\)/);
  assert.match(handler, /adminSessionVersion\\.current/);
  assert.match(source, /isOwner && reactivationOrder && \\(/);
});
