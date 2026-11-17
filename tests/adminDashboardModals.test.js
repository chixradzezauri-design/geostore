import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../src/adminDashboardModals.css', import.meta.url), 'utf8');
const entry = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('modal refinement loads after the previous isolated admin style layers', () => {
  assert.ok(entry.indexOf("import './adminDashboardSections.css'") >= 0);
  assert.ok(entry.indexOf("import './adminDashboardModals.css'") > entry.indexOf("import './adminDashboardSections.css'"));
});

test('the non-order reactivation dialog has bounded, scrollable responsive behavior', () => {
  assert.match(admin, /role="dialog"[^>]*aria-labelledby="reactivation-title"/);
  assert.match(admin, /className="admin-order-detail-overlay[^"]*"[^>]*role="dialog"/);
  assert.match(css, /\[role="dialog"\]:not\(\.admin-order-detail-overlay\)/);
  assert.match(css, /max-height:\s*calc\(100dvh - 2rem\)/);
  assert.match(css, /overflow-y:\s*auto/);
  assert.match(css, /overscroll-behavior:\s*contain/);
});

test('mobile modal respects safe areas and touch target sizing without selecting the order detail modal', () => {
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /@media \(max-width: 380px\)/);
  assert.match(css, /min-height:\s*44px/);
  assert.doesNotMatch(css, /\.admin-order-detail-overlay\s*\{/);
});


test('order detail dialog manages initial focus, keyboard containment, Escape and trigger restoration', () => {
  assert.match(admin, /orderDetailDialogRef = useRef/);
  assert.match(admin, /orderDetailCloseButtonRef = useRef/);
  assert.match(admin, /orderDetailTriggerRef\.current = event\.currentTarget/);
  assert.match(admin, /orderDetailCloseButtonRef\.current\?\.focus\(\)/);
  assert.match(admin, /event\.key === 'Escape'/);
  assert.match(admin, /event\.key !== 'Tab'/);
  assert.match(admin, /event\.shiftKey && \(current === first \|\| current === activeDialog\)/);
  assert.match(admin, /trigger\?\.isConnected\) trigger\.focus\(\)/);
  assert.match(admin, /document\.removeEventListener\('keydown', handleOrderDialogKeyDown\)/);
});

test('nested reactivation dialog takes keyboard priority and cannot dismiss during submission', () => {
  assert.match(admin, /document\.querySelector\('\[aria-labelledby="reactivation-title"\]'\)/);
  assert.match(admin, /if \(reactivationOrder\) \{/);
  assert.match(admin, /if \(!isReactivatingOrder\) \{/);
  assert.match(admin, /setReactivationPassword\(''\)/);
  assert.match(admin, /setReactivationError\(''\)/);
});
