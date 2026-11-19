import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');
const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

function luminance(hex) {
  const channels = hex.match(/[a-f0-9]{2}/gi).map(value => parseInt(value, 16) / 255);
  const linear = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

test('active admin navigation uses the same emerald accent as the admin actions', () => {
  const stage48 = css.slice(css.lastIndexOf('GEOSTORE ADMIN DESIGN — STAGE 48'));
  assert.match(stage48, /button\[class\*="bg-emerald-500"\]\s*\{[^}]*background:\s*#10b981\s*!important;/s);
  assert.match(stage48, /button\[class\*="bg-emerald-500"\]\s*\{[^}]*color:\s*#06251b\s*!important;/s);
  const ratio = (Math.max(luminance('#10b981'), luminance('#06251b')) + 0.05) /
    (Math.min(luminance('#10b981'), luminance('#06251b')) + 0.05);
  assert.ok(ratio >= 4.5, `Expected WCAG AA contrast, received ${ratio.toFixed(2)}:1`);
});

test('active and inactive navigation retain the existing tab-selection behavior', () => {
  assert.match(admin, /onClick=\{\(\) => setAdminTab\(tab\.id\)\}/);
  assert.match(css, /button:not\(\[class\*="bg-emerald-500"\]\)\s*\{[^}]*background:\s*#17263b\s*!important;/s);
});
