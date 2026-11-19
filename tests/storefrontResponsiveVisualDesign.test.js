import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_STOREFRONT_VISUAL_DESIGN,
  normalizeStorefrontVisualDesign,
  buildStorefrontVisualStyle,
  buildStorefrontElementStyle
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

test('storefront image styles support independently clamped horizontal and vertical focal positioning', () => {
  const design = normalizeStorefrontVisualDesign({
    elementStyles: {
      'hero.image': { objectPositionX: 25, objectPositionY: 70 }
    },
    responsive: {
      mobile: {
        elementStyles: {
          'hero.image': { objectPositionX: 140, objectPositionY: -20 }
        }
      }
    }
  });

  const desktop = buildStorefrontElementStyle(design, 'hero.image', 'desktop');
  const mobile = buildStorefrontElementStyle(design, 'hero.image', 'mobile');

  assert.equal(desktop.objectPosition, '25% 70%');
  assert.equal(mobile.objectPosition, '100% 0%');
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

test('responsive colors and typography override only their own viewport and inherit unset values', () => {
  const design = normalizeStorefrontVisualDesign({
    theme: { canvas: '#112233', accent: '#445566' },
    typography: { fontFamily: 'manrope', headingFontFamily: 'georgia', baseFontSize: 15, headingScale: 1 },
    responsive: {
      tablet: { theme: { canvas: '#abcdef' }, typography: { baseFontSize: 16 } },
      mobile: { theme: { accent: '#123456' }, typography: { fontFamily: 'arial', headingScale: 1.1 } }
    }
  });

  const desktop = buildStorefrontVisualStyle(design, 'desktop');
  const tablet = buildStorefrontVisualStyle(design, 'tablet');
  const mobile = buildStorefrontVisualStyle(design, 'mobile');

  assert.equal(desktop['--gs-canvas'], '#112233');
  assert.equal(desktop['--gs-base-font-size'], '15px');
  assert.equal(tablet['--gs-canvas'], '#abcdef');
  assert.equal(tablet['--gs-accent'], '#445566');
  assert.equal(tablet['--gs-base-font-size'], '16px');
  assert.equal(tablet['--gs-heading-font-family'], "Georgia, 'Noto Serif Georgian', serif");
  assert.equal(mobile['--gs-canvas'], '#112233');
  assert.equal(mobile['--gs-accent'], '#123456');
  assert.equal(mobile['--gs-font-family'], "Arial, 'Noto Sans Georgian', sans-serif");
  assert.equal(mobile['--gs-heading-scale'], '1.1');
});

test('responsive element styles merge over desktop styles without changing desktop', () => {
  const design = normalizeStorefrontVisualDesign({
    elementStyles: { 'hero.title': { textColor: '#111111', fontSize: 30, padding: 8 } },
    responsive: {
      tablet: { elementStyles: { 'hero.title': { textColor: '#222222' } } },
      mobile: { elementStyles: { 'hero.title': { fontSize: 22, padding: 4 } } }
    }
  });

  const desktop = buildStorefrontElementStyle(design, 'hero.title', 'desktop');
  const tablet = buildStorefrontElementStyle(design, 'hero.title', 'tablet');
  const mobile = buildStorefrontElementStyle(design, 'hero.title', 'mobile');

  assert.equal(desktop.color, '#111111');
  assert.equal(desktop.fontSize, '30px');
  assert.equal(tablet.color, '#222222');
  assert.equal(tablet.fontSize, '30px');
  assert.equal(mobile.color, '#111111');
  assert.equal(mobile.fontSize, '22px');
  assert.equal(mobile.padding, '4px');
});


test('custom storefront sections use the same tablet and mobile breakpoints as the visual editor', async () => {
  const storeView = await readFile(new URL('../src/components/StoreView.jsx', import.meta.url), 'utf8');
  const customSectionCss = storeView.slice(
    storeView.indexOf('const buildCustomSectionResponsiveCss'),
    storeView.indexOf('export default function StoreView')
  );
  assert.ok(customSectionCss.includes('@media (min-width:641px) and (max-width:1023px)'));
  assert.ok(customSectionCss.includes('@media (max-width:640px)'));
  assert.ok(!customSectionCss.includes('@media (min-width:768px) and (max-width:1023px)'));
  assert.ok(!customSectionCss.includes('@media (max-width:767px)'));
});


test('every storefront visual editor target exists in the rendered storefront components', async () => {
  const editor = await readFile(new URL('../src/components/StorefrontVisualEditor.jsx', import.meta.url), 'utf8');
  const componentPaths = [
    '../src/components/StoreView.jsx',
    '../src/components/Header.jsx',
    '../src/components/StorefrontFooter.jsx'
  ];
  const components = await Promise.all(componentPaths.map(path => readFile(new URL(path, import.meta.url), 'utf8')));
  const targetMap = editor.slice(
    editor.indexOf('const VISUAL_EDITOR_TARGETS = {'),
    editor.indexOf('const VISUAL_EDITOR_TREE = [')
  );
  const targetIds = [...targetMap.matchAll(/^\s{2}'([^']+)':\s*\{/gm)].map(match => match[1]);
  const renderedTargets = new Set(
    components.flatMap(source => [...source.matchAll(/data-visual-editor-target=["']([^"']+)["']/g)].map(match => match[1]))
  );

  assert.ok(targetIds.length >= 50, 'expected the full storefront target catalog');
  for (const targetId of targetIds) {
    assert.ok(renderedTargets.has(targetId), `editor target has no rendered DOM element: ${targetId}`);
  }
  assert.equal(targetIds.length, renderedTargets.size, 'rendered target catalog and editor target catalog should stay aligned');
});

test('storefront visual selection highlight styles cover every selectable target', async () => {
  const editor = await readFile(new URL('../src/components/StorefrontVisualEditor.jsx', import.meta.url), 'utf8');
  const targetMap = editor.slice(
    editor.indexOf('const VISUAL_EDITOR_TARGETS = {'),
    editor.indexOf('const VISUAL_EDITOR_TREE = [')
  );
  const targetIds = [...targetMap.matchAll(/^\s{2}'([^']+)':\s*\{/gm)].map(match => match[1]);
  for (const targetId of targetIds) {
    assert.ok(
      editor.includes(`[data-visual-editor-selected="${targetId}"] [data-visual-editor-target="${targetId}"]`),
      `missing selection outline for ${targetId}`
    );
  }
});


test('every selectable storefront target accepts independent responsive element styling', async () => {
  const editor = await readFile(new URL('../src/components/StorefrontVisualEditor.jsx', import.meta.url), 'utf8');
  const targetMap = editor.slice(
    editor.indexOf('const VISUAL_EDITOR_TARGETS = {'),
    editor.indexOf('const VISUAL_EDITOR_TREE = [')
  );
  const targetIds = [...targetMap.matchAll(/^\s{2}'([^']+)':\s*\{/gm)].map(match => match[1]);
  const elementStyles = Object.fromEntries(targetIds.map(id => [id, { textColor: '#123456' }]));
  const mobileStyles = Object.fromEntries(targetIds.map(id => [id, { textColor: '#abcdef' }]));
  const design = normalizeStorefrontVisualDesign({
    elementStyles,
    responsive: { mobile: { elementStyles: mobileStyles } }
  });

  for (const targetId of targetIds) {
    assert.equal(buildStorefrontElementStyle(design, targetId, 'desktop').color, '#123456', `desktop style not applied to ${targetId}`);
    assert.equal(buildStorefrontElementStyle(design, targetId, 'mobile').color, '#abcdef', `mobile style not applied to ${targetId}`);
  }
});
