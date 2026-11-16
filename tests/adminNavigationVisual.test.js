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

test('admin inactive sidebar buttons use a readable dark surface and light text', () => {
  const stage44 = css.slice(css.lastIndexOf('GEOSTORE ADMIN VISUAL AUDIT — STAGE 44'));
  assert.match(stage44, /button:not\(\[class\*="bg-emerald-500"\]\)\s*\{[^}]*background:\s*#17263b\s*!important;[^}]*color:\s*#dbe6f2\s*!important;/s);
  assert.match(stage44, /button:not\(\[class\*="bg-emerald-500"\]\):hover/);
  const ratio = (Math.max(luminance('#dbe6f2'), luminance('#17263b')) + 0.05) /
    (Math.min(luminance('#dbe6f2'), luminance('#17263b')) + 0.05);
  assert.ok(ratio >= 4.5, `Expected WCAG AA contrast, received ${ratio.toFixed(2)}:1`);
});

test('admin navigation preserves existing tab selection and active styling', () => {
  assert.match(admin, /onClick=\{\(\) => setAdminTab\(tab\.id\)\}/);
  assert.match(admin, /isActive\s*\?\s*'bg-emerald-500 text-slate-950/);
  assert.match(css, /@media \(max-width: 1023px\)[\s\S]*?overflow-x:\s*auto\s*!important;[\s\S]*?scroll-snap-type:\s*x proximity\s*!important;/);
});
