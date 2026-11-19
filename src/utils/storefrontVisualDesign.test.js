import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_STOREFRONT_VISUAL_DESIGN,
  normalizeStorefrontVisualDesign,
  buildStorefrontVisualStyle,
  buildStorefrontElementStyle
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


test('normalization supports independent heading font, custom section copy and responsive media dimensions', () => {
  const design = normalizeStorefrontVisualDesign({
    typography: { headingFontFamily: 'georgia' },
    copy: { heroEyebrow: 'New season', categoriesTitle: 'Discover', heroStampTitle: 'STYLE\nEDIT' },
    layout: { heroContentWidth: 84, bannerHeight: 300, productImageRatio: 1.1 }
  });
  assert.equal(design.typography.headingFontFamily, 'georgia');
  assert.equal(design.copy.heroEyebrow, 'New season');
  assert.equal(design.copy.heroStampTitle, 'STYLE\nEDIT');
  assert.equal(design.layout.heroContentWidth, 84);
  assert.equal(design.layout.bannerHeight, 300);
  assert.equal(design.layout.productImageRatio, 1.1);
});

test('temporary local hero image data URLs are accepted for preview before secure upload', () => {
  const design = normalizeStorefrontVisualDesign({
    hero: { imageUrl: 'data:image/png;base64,iVBORw0KGgo=' }
  });
  assert.equal(design.hero.imageUrl, 'data:image/png;base64,iVBORw0KGgo=');
  assert.match(buildStorefrontVisualStyle(design)['--gs-hero-image'], /^url\("data:image\/png;base64,/);
});

test('element-level visual styles are normalized, clamped and rendered only for known targets', () => {
  const design = normalizeStorefrontVisualDesign({
    elementStyles: {
      'hero.title': {
        textColor: '#123456',
        backgroundColor: 'url(javascript:alert(1))',
        fontSize: 100,
        padding: -5,
        borderRadius: 12,
        textAlign: 'center',
        fontWeight: 700
      },
      'unknown.target': { textColor: '#ffffff', fontSize: 20 }
    }
  });
  assert.equal(design.elementStyles['hero.title'].textColor, '#123456');
  assert.equal(design.elementStyles['hero.title'].backgroundColor, '');
  assert.equal(design.elementStyles['hero.title'].fontSize, 64);
  assert.equal(design.elementStyles['hero.title'].padding, 0);
  assert.equal(design.elementStyles['hero.title'].borderRadius, 12);
  assert.equal(design.elementStyles['hero.title'].textAlign, 'center');
  assert.equal(design.elementStyles['hero.title'].fontWeight, 700);
  assert.equal(buildStorefrontElementStyle(design, 'hero.title').fontSize, '64px');
  assert.deepEqual(buildStorefrontElementStyle(design, 'unknown.target'), {});
});

test('unset element styles remain unset after repeated normalization and render no inline overrides', () => {
  const firstPass = normalizeStorefrontVisualDesign();
  const secondPass = normalizeStorefrontVisualDesign(firstPass);
  assert.equal(secondPass.elementStyles['hero.title'].fontSize, null);
  assert.equal(secondPass.elementStyles['hero.title'].padding, null);
  assert.equal(secondPass.elementStyles['hero.title'].borderRadius, null);
  assert.deepEqual(buildStorefrontElementStyle(secondPass, 'hero.title'), {});
});
