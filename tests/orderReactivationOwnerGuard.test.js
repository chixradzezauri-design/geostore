import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('completed and cancelled order reactivation are owner-only in the UI', () => {
  assert.match(source, /if \(!isOwner\)[\s\S]{0,180}დასრულებული შეკვეთის ხელახლა გააქტიურება მხოლოდ მთავარ ადმინისტრატორს შეუძლია/);
  assert.match(source, /if \(!isOwner\)[\s\S]{0,180}გაუქმებული შეკვეთის ხელახლა გააქტიურება მხოლოდ მთავარ ადმინისტრატორს შეუძლია/);
  assert.match(source, /handleConfirmOrderReactivation = async \(event\) => \{[\s\S]{0,150}if \(!isOwner\)/);
  assert.match(source, /isOwner && reactivationOrder && \(/);
});
