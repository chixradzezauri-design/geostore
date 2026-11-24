import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const admin = readFileSync(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/videoAuditMobileAdmin.css', import.meta.url), 'utf8');
const chromium = readFileSync(new URL('./browser/responsiveLayout.mjs', import.meta.url), 'utf8');

test('stage 36 compact order actions preserve transitions and permissions', () => {
  assert.match(css, /Stage 36: video-audited order, inventory and finance controls/);
  assert.match(css, /\.admin-order-status-actions \{\s*display: grid !important/);
  assert.match(admin, /admin-order-status-actions[^\n]*role="group"/);
  for (const status of ['ახალი', 'მუშავდება', 'გაგზავნილი', 'დასრულებული', 'გაუქმებული'])
    assert.ok(admin.includes("handleUpdateOrderStatus(o.id, '" + status + "')"), status);
  assert.match(admin, /disabled=\{isShippedOrderStatus\(o\.status\) \|\| isDeliveredOrderStatus\(o\.status\)\}/);
});
test('stage 36 audit table keyboard support and cloud-safe replenishment fields', () => {
  assert.match(admin, /admin-inventory-history-toolbar/);
  assert.match(admin, /admin-inventory-table-scroll[^\n]*role="region"[^\n]*tabIndex=\{0\}/);
  assert.match(admin, /<span className="block text-\[10px\] text-slate-400">არსებული მარაგი<\/span>/);
  assert.match(admin, /<span className="block text-\[10px\] text-slate-400">შესავსები რაოდენობა<\/span>/);
  assert.match(admin, /disabled=\{!replenishmentSettingsReady \|\| Boolean\(replenishmentSavingKey\) \|\| replenishmentLoading \|\| !hasProductsPermission \|\| hasConflict\}/);
  assert.match(css, /font-size: max\(16px, var\(--admin-vd-inputFontSize-active, 16px\)\) !important/);
  assert.match(chromium, /inventoryToolbarColumns/);
  assert.match(chromium, /replenishmentInputMinFont >= 16/);
  assert.match(chromium, /financePeriodFont >= 16/);
});
