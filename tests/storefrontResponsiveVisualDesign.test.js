import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_STOREFRONT_VISUAL_DESIGN,
  normalizeStorefrontVisualDesign,
  buildStorefrontVisualStyle
} from '../src/utils/storefrontVisualDesign.js';

test('responsive storefront layouts are normalized independently for tablet and mobile', () => {
  const design = normalizeStorefrontVisualDesign({
    ...DEFAULT_STOREFRONT_VISUAL_DESIGN,
    responsive: {
      tablet: { layout: { contentWidth: 1100, productColumns: 3 } },
      mobile: { layout: { contentWidth: 960, heroHeight: 360, productColumns: 2 } }
    }
  });

  assert.equal(design.layout.contentWidth, DEFAULT_STOREFRONT_VISUAL_DESIGN.layout.contentWidth);
  assert.equal(design.responsive.tablet.layout.contentWidth, 1100);
  assert.equal(design.responsive.tablet.layout.productColumns, 3);
  assert.equal(design.responsive.mobile.layout.contentWidth, 960);
  assert.equal(design.responsive.mobile.layout.heroHeight, 360);
  assert.equal(design.responsive.mobile.layout.productColumns, 2);
});

test('responsive layout values are clamped and invalid values are ignored', () => {
  const design = normalizeStorefrontVisualDesign({
    responsive: {
      mobile: { layout: { heroHeight: 9999, productColumns: 99, contentWidth: 'invalid' } }
    }
  });

  assert.equal(design.responsive.mobile.layout.heroHeight, 680);
  assert.equal(design.responsive.mobile.layout.productColumns, 5);
  assert.equal(Object.hasOwn(design.responsive.mobile.layout, 'contentWidth'), false);
});

test('storefront style builder applies only the requested device layout override', () => {
  const design = normalizeStorefrontVisualDesign({
    responsive: {
      tablet: { layout: { productColumns: 3 } },
      mobile: { layout: { productColumns: 2, heroHeight: 350 } }
    }
  });

  const desktop = buildStorefrontVisualStyle(design, 'desktop');
  const tablet = buildStorefrontVisualStyle(design, 'tablet');
  const mobile = buildStorefrontVisualStyle(design, 'mobile');

  assert.equal(desktop['--gs-product-columns'], String(DEFAULT_STOREFRONT_VISUAL_DESIGN.layout.productColumns));
  assert.equal(tablet['--gs-product-columns'], '3');
  assert.equal(mobile['--gs-product-columns'], '2');
  assert.equal(mobile['--gs-hero-height'], '350px');
});
