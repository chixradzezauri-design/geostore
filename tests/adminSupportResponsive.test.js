import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../src/adminDashboardSections.css', import.meta.url), 'utf8');
const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('support ticket actions and reply controls remain usable on narrow screens', () => {
  assert.match(admin, /admin-support-ticket-controls/);
  assert.match(admin, /admin-support-status-actions/);
  assert.match(admin, /admin-support-reply-form/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.admin-support-ticket-controls \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /\.admin-support-reply-form > button \{[\s\S]*?min-height: 44px/);
});

test('support status actions can scroll horizontally without shrinking labels', () => {
  assert.match(css, /\.admin-support-status-actions \{[\s\S]*?overflow-x: auto/);
  assert.match(css, /\.admin-support-status-actions > button \{[\s\S]*?white-space: nowrap/);
});

test('long support messages and conversation entries wrap safely', () => {
  assert.match(admin, /whitespace-pre-wrap break-words/);
  assert.match(css, /\.admin-support-ticket-message,[\s\S]*?overflow-wrap: anywhere/);
  assert.match(css, /word-break: break-word/);
});
