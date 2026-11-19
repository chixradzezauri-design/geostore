import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');
const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('admin welcome bar uses the same dark navy surface and readable text palette', () => {
  const stage49 = css.slice(css.lastIndexOf('GEOSTORE ADMIN DESIGN — STAGE 49'));
  assert.match(stage49, /div:nth-child\(2\) > div:first-child\s*\{[^}]*background:\s*#0d192a\s*!important;/s);
  assert.match(stage49, /div:nth-child\(2\) > div:first-child\s*\{[^}]*border-color:\s*#34465e\s*!important;/s);
  assert.match(stage49, /div:nth-child\(2\) > div:first-child h2\s*\{[^}]*color:\s*#f8fbff\s*!important;/s);
  assert.match(stage49, /div:nth-child\(2\) > div:first-child p\s*\{[^}]*color:\s*#bdcadd\s*!important;/s);
});

test('welcome bar save and publish actions remain connected', () => {
  assert.match(admin, /onSaveStorefrontDraft\(\)/);
  assert.match(admin, /onPublishStorefront\(\)/);
  assert.match(admin, /storefrontDraftBusy\s*\|\|\s*storefrontPublishBusy/);
});
