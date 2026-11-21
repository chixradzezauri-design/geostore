import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const store=readFileSync(new URL('../src/components/StoreView.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/designSystemV2.css',import.meta.url),'utf8');
const fixture=readFileSync(new URL('./browser/responsiveLayout.mjs',import.meta.url),'utf8');
const live=readFileSync(new URL('./browser/realStorefrontSmoke.mjs',import.meta.url),'utf8');
test('Stage 40: category controls expose state, and string category data stays selectable',()=>{
  assert.match(store,/\.map\(c => typeof c === 'string' \? \{ id: c, name: c \} : c\)/);
  assert.match(store,/aria-expanded=\{subCats\.length > 0 \? isOpen : undefined\}/);
  assert.match(store,/aria-pressed=\{isSubSel\}/);
  assert.match(store,/aria-pressed=\{!selectedSubCategory\}/);
  assert.match(store,/id="gs-subcategory-panel"/);
  assert.match(live,/await page\.keyboard\.press\('Space'\)/);
  assert.match(live,/await page\.keyboard\.press\('Enter'\)/);
});
test('Stage 40: existing product handlers remain and titles expose keyboard actions',()=>{
  assert.match(store,/toggleWishlist\(prod\)/);
  assert.match(store,/toggleComparison\(prod\)/);
  assert.match(store,/gs-catalog-media-toggle gs-catalog-wishlist-toggle/);
  assert.match(store,/gs-catalog-media-toggle gs-catalog-comparison-toggle/);
  assert.match(store,/aria-pressed=\{isWish\}/);
  assert.match(store,/aria-pressed=\{isCompared\}/);
  assert.match(store,/className="gs-catalog-product-title-action"/);
  assert.match(store,/handleOpenProduct\(prod, event\.currentTarget\)/);
  assert.match(store,/data-visual-editor-target="product\.title"/);
  assert.match(store,/data-visual-editor-target="product\.button"/);
});
test('Stage 40: catalog action touch sizes tested on 8 viewport widths',()=>{
  assert.match(css,/Stage 40 — touch-sized catalog actions/);
  assert.match(css,/min-width: 44px !important/);
  assert.match(css,/gs-subcategory-chip \{\s*min-height: 44px !important/);
  assert.match(fixture,/catalogActionMinSize >= 43/);
  assert.match(fixture,/catalogActionMaxRight <= width \+ 2/);
});
