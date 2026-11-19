import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const translations = await readFile(new URL('../src/utils/translations.js', import.meta.url), 'utf8');
const page = await readFile(new URL('../src/components/PrivacyPolicyPage.jsx', import.meta.url), 'utf8');

test('privacy policy is reachable from the storefront footer as a dedicated page', () => {
  assert.match(app, /const PrivacyPolicyPage = lazy\(\(\) => import\('\.\/components\/PrivacyPolicyPage'\)\)/);
  assert.match(app, /activeTab === 'privacy'/);
  assert.match(app, /setActiveTab\('privacy'\)/);
  assert.match(app, /onClose=\{\(\) => setActiveTab\('store'\)\}/);
});

test('privacy policy is available in Georgian, English and Russian', () => {
  assert.match(translations, /privacy: "კონფიდენციალურობის პოლიტიკა"/);
  assert.match(translations, /privacy: "Privacy Policy"/);
  assert.match(translations, /privacy: "Политика конфиденциальности"/);
  for (const locale of ['ka', 'en', 'ru']) {
    assert.match(page, new RegExp('^\\s*' + locale + ': \\{', 'm'));
  }
});

test('privacy policy describes the actual GEOSTORE data flows and customer rights', () => {
  for (const phrase of ['Supabase Auth', 'Vercel', 'ბრაუზერის ლოკალურ საცავში', 'შეკვეთის მონაცემები', 'მონაცემთა საერთაშორისო გადაცემა']) {
    assert.ok(page.includes(phrase), `Missing policy coverage: ${phrase}`);
  }
  assert.match(page, /მონაცემთა უფლებები|თქვენი უფლებები/);
  assert.ok(page.includes('პირად მონაცემებს არ ვყიდით.'));
  assert.match(page, /onContact/);
});

test('privacy page keeps navigation and support actions accessible', () => {
  assert.match(page, /aria-labelledby="gs-privacy-title"/);
  assert.match(page, /type="button" onClick=\{onClose\}/);
  assert.match(page, /type="button" onClick=\{onContact\}/);
  assert.match(app, /t\.privacy/);
});
