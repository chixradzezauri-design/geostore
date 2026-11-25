import test from 'node:test';
import assert from 'node:assert/strict';
import { applySignature2026Design, SIGNATURE_SECTION_ORDER } from './signature2026Design.js';
import { getStorefrontSectionOrder, normalizeStorefrontVisualDesign } from './storefrontVisualDesign.js';

test('Signature preset uses the supported compact layout and editorial section sequence on all viewports', () => {
  const result = applySignature2026Design({});
  assert.equal(result.theme.canvas, '#f6f3ef');
  assert.equal(result.layout.productColumns, 5);
  assert.equal(result.responsive.mobile.layout.productColumns, 2);
  assert.equal(result.responsive.tablet.layout.productColumns, 3);
  for (const viewport of ['desktop', 'tablet', 'mobile']) {
    assert.deepEqual(getStorefrontSectionOrder(result, viewport), SIGNATURE_SECTION_ORDER);
  }
  assert.equal(new Set(result.sectionOrder).size, 6);
});

test('Signature preset preserves content, visibility, product order and granular editor settings', () => {
  const before = normalizeStorefrontVisualDesign({
    hero: { imageUrl: 'https://example.com/hero.jpg' },
    copy: { heroButton: 'Browse' }, sections: { flashSale: false },
    productOrder: ['one', 'two'],
    elementStyles: { 'hero.title': { fontSize: 42 } },
    responsive: { mobile: { elementStyles: { 'product.title': { fontSize: 16 } } } }
  });
  const result = applySignature2026Design(before);
  for (const key of ['copy', 'sections', 'productOrder', 'elementStyles', 'sectionGeometry', 'customSections', 'designTemplates', 'stylePresets']) {
    assert.deepEqual(result[key], before[key]);
  }
  assert.equal(result.hero.imageUrl, before.hero.imageUrl);
  assert.deepEqual(result.responsive.mobile.elementStyles, before.responsive.mobile.elementStyles);
  assert.deepEqual(result.responsive.mobile.sectionGeometry, before.responsive.mobile.sectionGeometry);
  assert.deepEqual(applySignature2026Design(result), result);
});

 test('Signature header activation survives draft normalization and legacy layouts stay unchanged', () => {
  assert.equal(normalizeStorefrontVisualDesign({}).signature2026, undefined);
  assert.equal(normalizeStorefrontVisualDesign({signature2026:'true'}).signature2026, undefined);
  assert.equal(normalizeStorefrontVisualDesign(applySignature2026Design({})).signature2026, true);
 });
