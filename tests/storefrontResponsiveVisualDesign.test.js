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


test('automatic storefront responsive styles use the editor breakpoints at tablet/mobile boundaries', () => {
  const originalWindow = globalThis.window;
  const design = normalizeStorefrontVisualDesign({
    layout: { productColumns: 4 },
    elementStyles: { 'hero.title': { textColor: '#111111' } },
    responsive: {
      tablet: { layout: { productColumns: 3 }, elementStyles: { 'hero.title': { textColor: '#222222' } } },
      mobile: { layout: { productColumns: 2 }, elementStyles: { 'hero.title': { textColor: '#333333' } } }
    }
  });
  try {
    globalThis.window = { innerWidth: 641 };
    assert.equal(buildStorefrontVisualStyle(design)['--gs-product-columns'], '3');
    assert.equal(buildStorefrontElementStyle(design, 'hero.title').color, '#222222');

    globalThis.window = { innerWidth: 700 };
    assert.equal(buildStorefrontVisualStyle(design)['--gs-product-columns'], '3');
    assert.equal(buildStorefrontElementStyle(design, 'hero.title').color, '#222222');

    globalThis.window = { innerWidth: 640 };
    assert.equal(buildStorefrontVisualStyle(design)['--gs-product-columns'], '2');
    assert.equal(buildStorefrontElementStyle(design, 'hero.title').color, '#333333');

    globalThis.window = { innerWidth: 1023 };
    assert.equal(buildStorefrontVisualStyle(design)['--gs-product-columns'], '3');
    assert.equal(buildStorefrontElementStyle(design, 'hero.title').color, '#222222');

    globalThis.window = { innerWidth: 1024 };
    assert.equal(buildStorefrontVisualStyle(design)['--gs-product-columns'], '4');
    assert.equal(buildStorefrontElementStyle(design, 'hero.title').color, '#111111');
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});


test('all supported visual style properties remain independent across elements and viewports', () => {
  const desktopStyle = {
    textColor: '#112233', backgroundColor: '#223344', borderColor: '#334455',
    borderWidth: 3, lineHeight: 1.6, letterSpacing: 1.5, textTransform: 'uppercase',
    textDecoration: 'underline', fontStyle: 'italic', fontFamily: 'georgia', boxShadow: 'soft',
    fontSize: 31, padding: 12, paddingX: 18, paddingY: 7, marginTop: 9, marginBottom: 11,
    minWidth: 120, maxWidth: 520, borderRadius: 14, textAlign: 'center', fontWeight: 800,
    width: 75, minHeight: 90, opacity: 65, objectFit: 'contain', objectPositionX: 25, objectPositionY: 70
  };
  const tabletStyle = { ...desktopStyle, textColor: '#445566', fontSize: 26, paddingX: 14 };
  const mobileStyle = { ...desktopStyle, textColor: '#778899', fontSize: 21, paddingX: 8 };
  const design = normalizeStorefrontVisualDesign({
    elementStyles: {
      'hero.title': desktopStyle,
      'hero.description': { textColor: '#abcdef' }
    },
    responsive: {
      tablet: { elementStyles: { 'hero.title': tabletStyle } },
      mobile: { elementStyles: { 'hero.title': mobileStyle } }
    }
  });

  const desktop = buildStorefrontElementStyle(design, 'hero.title', 'desktop');
  const tablet = buildStorefrontElementStyle(design, 'hero.title', 'tablet');
  const mobile = buildStorefrontElementStyle(design, 'hero.title', 'mobile');
  assert.equal(desktop.color, '#112233');
  assert.equal(desktop.backgroundColor, '#223344');
  assert.equal(desktop.borderColor, '#334455');
  assert.equal(desktop.borderWidth, '3px');
  assert.equal(desktop.lineHeight, '1.6');
  assert.equal(desktop.letterSpacing, '1.5px');
  assert.equal(desktop.textTransform, 'uppercase');
  assert.equal(desktop.textDecoration, 'underline');
  assert.equal(desktop.fontStyle, 'italic');
  assert.equal(desktop.fontFamily, "Georgia, 'Noto Serif Georgian', serif");
  assert.equal(desktop.boxShadow, '0 2px 10px rgba(0,0,0,.12)');
  assert.equal(desktop.fontSize, '31px');
  assert.equal(desktop.padding, '12px');
  assert.equal(desktop.paddingLeft, '18px');
  assert.equal(desktop.paddingRight, '18px');
  assert.equal(desktop.paddingTop, '7px');
  assert.equal(desktop.paddingBottom, '7px');
  assert.equal(desktop.marginTop, '9px');
  assert.equal(desktop.marginBottom, '11px');
  assert.equal(desktop.minWidth, '120px');
  assert.equal(desktop.maxWidth, '520px');
  assert.equal(desktop.borderRadius, '14px');
  assert.equal(desktop.textAlign, 'center');
  assert.equal(desktop.fontWeight, 800);
  assert.equal(desktop.width, '75%');
  assert.equal(desktop.minHeight, '90px');
  assert.equal(desktop.opacity, '0.65');
  assert.equal(desktop.objectFit, 'contain');
  assert.equal(desktop.objectPosition, '25% 70%');

  assert.equal(tablet.color, '#445566');
  assert.equal(tablet.fontSize, '26px');
  assert.equal(tablet.paddingLeft, '14px');
  assert.equal(tablet.backgroundColor, '#223344');
  assert.equal(mobile.color, '#778899');
  assert.equal(mobile.fontSize, '21px');
  assert.equal(mobile.paddingLeft, '8px');
  assert.equal(mobile.backgroundColor, '#223344');

  assert.equal(buildStorefrontElementStyle(design, 'hero.description', 'desktop').color, '#abcdef');
  assert.equal(buildStorefrontElementStyle(design, 'hero.description', 'tablet').color, '#abcdef');
  assert.equal(buildStorefrontElementStyle(design, 'hero.description', 'mobile').color, '#abcdef');
});

test('direct-edit storefront text targets stay connected to rendered settings and shared draft saving', async () => {
  const editor = await readFile(new URL('../src/components/StorefrontVisualEditor.jsx', import.meta.url), 'utf8');
  const components = await Promise.all([
    '../src/components/StoreView.jsx',
    '../src/components/Header.jsx',
    '../src/components/StorefrontFooter.jsx'
  ].map(path => readFile(new URL(path, import.meta.url), 'utf8')));
  const targetMap = editor.slice(
    editor.indexOf('const VISUAL_EDITOR_TARGETS = {'),
    editor.indexOf('const VISUAL_EDITOR_TREE = [')
  );
  const editableTargets = [...targetMap.matchAll(/^\s{2}'([^']+)': \{[^}]*settingKey: '([^']+)'[^}]*\}/gm)];
  assert.ok(editableTargets.length >= 8, 'expected direct text editing across storefront regions');

  for (const [targetId, settingKey] of editableTargets) {
    assert.ok(
      components.some(source => source.includes(settingKey)),
      `direct-edit target ${targetId} is not connected to a rendered setting: ${settingKey}`
    );
  }

  assert.ok(editor.includes('siteSettings?.[selectedElement.settingKey]'));
  assert.ok(editor.includes('setSiteSettings(current => ({ ...(current || {}), [key]: value }))'));
  assert.ok(editor.includes('const snapshot = { ...(siteSettings || {}), visualDesign: snapshotDesign }'));
  assert.ok(editor.includes('onSaveStorefrontDraft(snapshot)'));
});

test('responsive-only visual element styles remain in the effective tablet and mobile editor preview', async () => {
  const editor = await readFile(new URL('../src/components/StorefrontVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /Object\.keys\(\{ \.\.\.\(design\.elementStyles \|\| \{\}\), \.\.\.\(activeResponsive\.elementStyles \|\| \{\}\) \}\)/);
  assert.ok(editor.includes('design.elementStyles?.[id]') && editor.includes('activeResponsive.elementStyles?.[id]'), 'effective preview merges desktop and device-specific styles');

  const design = normalizeStorefrontVisualDesign({
    ...DEFAULT_STOREFRONT_VISUAL_DESIGN,
    responsive: {
      tablet: { elementStyles: { 'hero.title': { fontSize: 27 } } },
      mobile: { elementStyles: { 'hero.description': { textColor: '#123456' } } }
    }
  });
  assert.equal(buildStorefrontElementStyle(design, 'hero.title', 'tablet').fontSize, '27px');
  assert.equal(buildStorefrontElementStyle(design, 'hero.description', 'mobile').color, '#123456');
});

test('clearing selected element colors is atomic and preserves non-color responsive overrides', async () => {
  const editor = await readFile(new URL('../src/components/StorefrontVisualEditor.jsx', import.meta.url), 'utf8');
  const start = editor.indexOf('const clearSelectedElementColors = () => {');
  const end = editor.indexOf('const resetSelectedElementStyle = () => {', start);
  assert.ok(start >= 0 && end > start);
  const clearColors = editor.slice(start, end);
  assert.match(clearColors, /keys\.forEach\(key => \{ delete style\[key\]; \}\)/);
  assert.match(clearColors, /commitDesign\(\{ \.\.\.design, responsive \}\)/);
  assert.match(clearColors, /commitDesign\(\{ \.\.\.design, elementStyles \}\)/);
  assert.equal((clearColors.match(/commitDesign\(/g) || []).length, 2, 'one commit per viewport branch');
  assert.ok(editor.includes('onClick={clearSelectedElementColors}'));
  assert.ok(!editor.includes("updateSelectedElementStyle('textColor', ''); updateSelectedElementStyle('backgroundColor', '');"));
});

test('device-wide visual reset requires confirmation and keeps undo history', async () => {
  const editor = await readFile(new URL('../src/components/StorefrontVisualEditor.jsx', import.meta.url), 'utf8');
  const start = editor.indexOf('const clearViewportOverrides = () => {');
  const end = editor.indexOf('const handleHeroFileChange =', start);
  assert.ok(start >= 0 && end > start);
  const reset = editor.slice(start, end);
  assert.ok(reset.includes('window.confirm('), 'device reset must request explicit confirmation');
  assert.ok(reset.indexOf('window.confirm(') < reset.indexOf('delete responsive[previewMode]'), 'confirmation must happen before deletion');
  assert.ok(reset.includes('commitDesign({ ...design, responsive })'), 'reset must remain undoable');
  assert.ok(reset.includes("previewMode === 'desktop'"), 'desktop base design must not be cleared by device reset');
});

test('visual preview selection blocks navigation even when clicking an untagged child', async () => {
  const editor = await readFile(new URL('../src/components/StorefrontVisualEditor.jsx', import.meta.url), 'utf8');
  const start = editor.indexOf('const handlePreviewSelect = event => {');
  const end = editor.indexOf('const selectElementFromTree =', start);
  assert.ok(start >= 0 && end > start);
  const handler = editor.slice(start, end);
  assert.ok(handler.indexOf('if (!selectionMode) return;') < handler.indexOf('event.preventDefault();'));
  assert.ok(handler.indexOf('event.preventDefault();') < handler.indexOf('if (!target) return;'));
  assert.ok(handler.indexOf('event.stopPropagation();') < handler.indexOf('if (!target) return;'));
  assert.ok(editor.includes('onClickCapture={handlePreviewSelect}'));
});

test('visual preview selection mode can be exited using Escape', async () => {
  const editor = await readFile(new URL('../src/components/StorefrontVisualEditor.jsx', import.meta.url), 'utf8');
  const start = editor.indexOf('const handlePreviewKeyDown = event => {');
  const end = editor.indexOf('const selectElementFromTree =', start);
  assert.ok(start >= 0 && end > start);
  const handler = editor.slice(start, end);
  assert.ok(handler.includes("event.key !== 'Escape'"));
  assert.ok(handler.includes('setSelectionMode(false)'));
  assert.ok(editor.includes('onKeyDownCapture={handlePreviewKeyDown}'));
  assert.ok(editor.includes('tabIndex={selectionMode ? 0 : undefined}'));
});

test('resetting one visual element requires confirmation before deleting viewport styles', async () => {
  const editor = await readFile(new URL('../src/components/StorefrontVisualEditor.jsx', import.meta.url), 'utf8');
  const start = editor.indexOf('const resetSelectedElementStyle = () => {');
  const end = editor.indexOf('const clearViewportOverrides =', start);
  assert.ok(start >= 0 && end > start);
  const reset = editor.slice(start, end);
  assert.ok(reset.includes('window.confirm('));
  assert.ok(reset.indexOf('window.confirm(') < reset.indexOf('delete elementStyles[selectedElement.id]'));
  assert.ok(reset.includes('commitDesign({ ...design, responsive })'));
  assert.ok(reset.includes('commitDesign({ ...design, elementStyles })'));
});

test('one visual style property can be reset without clearing sibling overrides', async () => {
  const editor = await readFile(new URL('../src/components/StorefrontVisualEditor.jsx', import.meta.url), 'utf8');
  const start = editor.indexOf('const resetSelectedElementStyleProperty = key => {');
  const end = editor.indexOf('const clearSelectedElementColors =', start);
  assert.ok(start >= 0 && end > start);
  const reset = editor.slice(start, end);
  assert.ok(reset.includes('delete style[key]'));
  assert.ok(reset.includes('if (Object.keys(style).length) elementStyles[selectedElement.id] = style'));
  assert.ok(reset.includes('commitDesign({ ...design, responsive })'));
  assert.ok(reset.includes('commitDesign({ ...design, elementStyles })'));
  assert.ok(editor.includes('resetSelectedElementStyleProperty(event.target.value)'));
});

test('individual visual style reset options have understandable Georgian labels', async () => {
  const editor = await readFile(new URL('../src/components/StorefrontVisualEditor.jsx', import.meta.url), 'utf8');
  assert.ok(editor.includes("textColor: 'ტექსტის ფერი'"));
  assert.ok(editor.includes("fontSize: 'ტექსტის ზომა'"));
  assert.ok(editor.includes("marginTop: 'ზედა გარე დაშორება'"));
  assert.ok(editor.includes('ELEMENT_STYLE_LABELS[key] || key'));
});

test('visual selection preview highlights hovered and keyboard-focused targets', async () => {
  const editor = await readFile(new URL('../src/components/StorefrontVisualEditor.jsx', import.meta.url), 'utf8');
  assert.ok(editor.includes('.gs-visual-preview-frame.gs-visual-select-mode [data-visual-editor-target]:hover'));
  assert.ok(editor.includes('.gs-visual-preview-frame.gs-visual-select-mode [data-visual-editor-target]:focus-visible'));
  assert.ok(editor.includes('outline: 2px dashed #10b981'));
});
