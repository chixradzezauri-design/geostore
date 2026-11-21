import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const jsx = readFileSync(new URL('../src/components/StoreView.jsx', import.meta.url),'utf8');
const css = readFileSync(new URL('../src/designSystemV2.css', import.meta.url),'utf8');
const browser = readFileSync(new URL('./browser/responsiveLayout.mjs', import.meta.url),'utf8');
test('Stage 41: product modal traps Tab only when nested guides are closed and returns focus on close', () => {
  assert.match(jsx,/const productDialogRef = useRef\(null\)/);
  assert.match(jsx,/ref=\{productDialogRef\} role="dialog"/);
  assert.match(jsx,/event\.key === 'Tab' && !isSmartSizeModalOpen && !isSizeGuideOpen/);
  assert.match(jsx,/dialog\.querySelectorAll\('button:not\(\[disabled\]\)/);
  assert.match(jsx,/\(event\.shiftKey \? last : first\)\.focus\(\)/);
  assert.match(jsx,/returnTarget\.focus\(\)/);
});
test('Stage 41: multiple product photos can navigate both directions and preserve thumbnails', () => {
  assert.match(jsx,/gs-product-gallery-toolbar/);
  assert.match(jsx,/gs-product-gallery-counter/);
  assert.match(jsx,/gs-product-gallery-step/);
  assert.match(jsx,/Math\.max\(0, activeGalleryIndex\) - 1 \+ selectedProduct\.gallery\.length/);
  assert.match(jsx,/Math\.max\(0, activeGalleryIndex\) \+ 1\) % selectedProduct\.gallery\.length/);
  assert.match(jsx,/onClick=\{\(\) => setActiveImage\(img\)\}/);
  assert.match(css,/Stage 41 — keyboard-contained product dialog/);
  assert.match(browser,/galleryStepMinHeight >= 43/);
});
test('Stage 41: purchase disabled status explains existing inventory guards', () => {
  assert.match(jsx,/const purchaseUnavailableReason = !selectedProduct/);
  assert.match(jsx,/hasCustomProductVariants\(selectedProduct\) && !selectedCustomVariant/);
  assert.match(jsx,/hasSizeColorInventory\(selectedProduct\) && !selectedSizeColorVariant/);
  assert.match(jsx,/currentAvailableStock <= 0/);
  assert.match(jsx,/id="gs-product-purchase-hint" role="status"/);
  assert.match(jsx,/aria-describedby=\{purchaseUnavailableReason \? 'gs-product-purchase-hint' : undefined\}/);
  assert.match(jsx,/disabled=\{currentAvailableStock <= 0 \|\|/);
  assert.match(browser,/purchaseHintVisible && layout\.purchaseGuardDescribed/);
});
