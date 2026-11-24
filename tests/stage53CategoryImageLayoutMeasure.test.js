import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const browser = readFileSync(new URL('./browser/responsiveLayout.mjs', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const artwork = readFileSync(new URL('../src/designSystemV2.css', import.meta.url), 'utf8');

test('Stage53: visual hover zoom cannot invalidate category image layout measurement', () => {
  assert.match(css, /gs-category-card:hover \.gs-category-photo/);
  assert.match(css, /transform:scale\(1\.035\)/);
  assert.match(artwork, /\.gs-category-card > img\.gs-category-photo\s*\{[\s\S]*?width: 100% !important/);
  assert.match(browser, /categoryImageWidth: categoryImg\.offsetWidth/);
  assert.match(browser, /categoryCardWidth: categoryImg\.parentElement\.offsetWidth/);
  assert.match(browser, /Math\.abs\(layout\.categoryImageWidth - layout\.categoryCardWidth\) <= 2/);
});
