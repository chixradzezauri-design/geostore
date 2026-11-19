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
  assert.deepEqual(buildStorefrontElementStyle({ version: 1 }, 'hero.title'), {});
});

test('element style builder independently rejects unsafe alignment and font-weight values', () => {
  const style = buildStorefrontElementStyle({
    elementStyles: {
      'hero.title': {
        textColor: 'url(javascript:alert(1))',
        backgroundColor: '#abcdef',
        fontSize: '22',
        textAlign: 'url(javascript:alert(1))',
        fontWeight: 'expression(alert(1))'
      }
    }
  }, 'hero.title');
  assert.equal(style.color, undefined);
  assert.equal(style.backgroundColor, '#abcdef');
  assert.equal(style.fontSize, '22px');
  assert.equal(style.textAlign, undefined);
  assert.equal(style.fontWeight, undefined);
});

test('catalog product image target supports independent safe image styling', () => {
  const design = normalizeStorefrontVisualDesign({
    elementStyles: {
      'product.image': { objectFit: 'cover', objectPositionX: 72, width: 85, opacity: 90 }
    }
  });
  const style = buildStorefrontElementStyle(design, 'product.image');
  assert.equal(style.objectFit, 'cover');
  assert.equal(style.objectPosition, '72% center');
  assert.equal(style.width, '85%');
  assert.equal(style.opacity, '0.9');
});

test('product detail targets support independent safe styling', () => {
  const design = normalizeStorefrontVisualDesign({
    elementStyles: {
      'product.detail.title': { textColor: '#123abc', fontSize: 30 },
      'product.detail.description': { textAlign: 'right', padding: 12 }
    }
  });
  assert.equal(buildStorefrontElementStyle(design, 'product.detail.title').color, '#123abc');
  assert.equal(buildStorefrontElementStyle(design, 'product.detail.title').fontSize, '30px');
  assert.equal(buildStorefrontElementStyle(design, 'product.detail.description').textAlign, 'right');
  assert.equal(buildStorefrontElementStyle(design, 'product.detail.description').padding, '12px');
  assert.deepEqual(buildStorefrontElementStyle(design, 'product.detail.purchase'), {});
});

test('element styling supports safe borders, typography, shadows and category targets', () => {
  const design = normalizeStorefrontVisualDesign({
    elementStyles: {
      'category.card': {
        backgroundColor: '#101010', borderColor: '#abcdef', borderWidth: 4,
        borderRadius: 18, boxShadow: 'strong', width: 90
      },
      'category.title': {
        textColor: '#ffffff', fontSize: 22, lineHeight: 1.3,
        letterSpacing: 2, textTransform: 'uppercase',
        fontFamily: 'georgia'
      },
      'category.description': { textColor: 'url(javascript:alert(1))', textTransform: 'invalid' }
    }
  });
  const card = buildStorefrontElementStyle(design, 'category.card');
  const title = buildStorefrontElementStyle(design, 'category.title');
  const description = buildStorefrontElementStyle(design, 'category.description');
  assert.equal(card.backgroundColor, '#101010');
  assert.equal(card.borderColor, '#abcdef');
  assert.equal(card.borderWidth, '4px');
  assert.equal(card.borderRadius, '18px');
  assert.equal(card.boxShadow, '0 16px 40px rgba(0,0,0,.32)');
  assert.equal(title.color, '#ffffff');
  assert.equal(title.fontSize, '22px');
  assert.equal(title.lineHeight, '1.3');
  assert.equal(title.letterSpacing, '2px');
  assert.equal(title.textTransform, 'uppercase');
  assert.match(title.fontFamily, /Georgia/);
  assert.equal(description.color, undefined);
  assert.equal(description.textTransform, undefined);
});

test('element styles support bounded width, height, opacity and safe image fit controls', () => {
  const design = normalizeStorefrontVisualDesign({
    elementStyles: {
      'product.detail.image': {
        width: 140,
        minHeight: 820,
        opacity: 45,
        objectFit: 'contain',
        objectPositionX: 120
      }
    }
  });
  const style = buildStorefrontElementStyle(design, 'product.detail.image');
  assert.equal(style.width, '100%');
  assert.equal(style.minHeight, '600px');
  assert.equal(style.opacity, '0.45');
  assert.equal(style.objectFit, 'contain');
  assert.equal(style.objectPosition, '100% center');
  assert.equal(buildStorefrontElementStyle({ elementStyles: { 'hero.title': { objectFit: 'url(javascript:1)' } } }, 'hero.title').objectFit, undefined);
});

test('banner and filter sub-elements expose independent safe visual styles', () => {
  const design = normalizeStorefrontVisualDesign({
    elementStyles: {
      'banner.image': { objectFit: 'cover', objectPositionX: 35, opacity: 80 },
      'banner.description': { textColor: '#fefefe', fontSize: 18 },
      'banner.button': { backgroundColor: '#112233', borderColor: '#abcdef', borderRadius: 14 },
      'filters.input': { backgroundColor: '#090909', textColor: '#ffffff', borderColor: '#92785f' },
      'filters.sortSelect': { fontSize: 16, fontWeight: 700 }
    }
  });
  assert.equal(buildStorefrontElementStyle(design, 'banner.image').objectFit, 'cover');
  assert.equal(buildStorefrontElementStyle(design, 'banner.image').objectPosition, '35% center');
  assert.equal(buildStorefrontElementStyle(design, 'banner.description').color, '#fefefe');
  assert.equal(buildStorefrontElementStyle(design, 'banner.button').backgroundColor, '#112233');
  assert.equal(buildStorefrontElementStyle(design, 'filters.input').borderColor, '#92785f');
  assert.equal(buildStorefrontElementStyle(design, 'filters.sortSelect').fontSize, '16px');
});

test('product ordering accepts unique bounded IDs and ignores empty values', () => {
  const design = normalizeStorefrontVisualDesign({
    productOrder: ['sku-2', 'sku-1', 'sku-2', '', null, 'sku-3']
  });
  assert.deepEqual(design.productOrder, ['sku-2', 'sku-1', 'sku-3']);
});
