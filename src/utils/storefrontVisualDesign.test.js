import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_STOREFRONT_VISUAL_DESIGN,
  normalizeStorefrontVisualDesign,
  buildStorefrontVisualStyle
} from './storefrontVisualDesign.js';

test('visual design defaults preserve the existing GEOSTORE light theme', () => {
  const design = normalizeStorefrontVisualDesign();
  assert.equal(design.theme.canvas, '#f7f4ef');
  assert.equal(design.theme.ink, '#29241f');
  assert.deepEqual(design.sectionOrder, ['hero', 'banners', 'flashSale', 'categories', 'filters', 'products']);
  assert.equal(design.sections.products, true);
});

test('normalization rejects unsafe colors and non-http hero image URLs', () => {
  const design = normalizeStorefrontVisualDesign({
    theme: { canvas: 'url(javascript:alert(1))' },
    hero: { imageUrl: 'javascript:alert(1)' }
  });
  assert.equal(design.theme.canvas, DEFAULT_STOREFRONT_VISUAL_DESIGN.theme.canvas);
  assert.equal(design.hero.imageUrl, '');
});

test('normalization clamps visual values and deduplicates section order', () => {
  const design = normalizeStorefrontVisualDesign({
    layout: { contentWidth: 99999, heroHeight: 100, categoryColumns: 99 },
    typography: { baseFontSize: 50, headingScale: 3, fontFamily: 'comic-sans' },
    sectionOrder: ['products', 'products', 'invalid']
  });
  assert.equal(design.layout.contentWidth, 1600);
  assert.equal(design.layout.heroHeight, 320);
  assert.equal(design.layout.categoryColumns, 6);
  assert.equal(design.typography.baseFontSize, 18);
  assert.equal(design.typography.headingScale, 1.25);
  assert.equal(design.typography.fontFamily, 'manrope');
  assert.deepEqual(design.sectionOrder, ['products', 'hero', 'banners', 'flashSale', 'categories', 'filters']);
});

test('style builder exposes theme, section visibility and order as safe CSS variables', () => {
  const style = buildStorefrontVisualStyle({
    theme: { accent: '#123456' },
    sections: { hero: false },
    sectionOrder: ['products', 'hero']
  });
  assert.equal(style['--gs-accent'], '#123456');
  assert.equal(style['--gs-show-hero'], 'none');
  assert.equal(style['--gs-order-products'], '1');
  assert.equal(style['--gs-order-hero'], '2');
  assert.equal(style['--gs-hero-image'], undefined);
});
