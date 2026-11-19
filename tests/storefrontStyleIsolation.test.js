import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const header = readFileSync(new URL('../src/components/Header.jsx', import.meta.url), 'utf8');
const storeView = readFileSync(new URL('../src/components/StoreView.jsx', import.meta.url), 'utf8');
const modals = readFileSync(new URL('../src/components/Modals.jsx', import.meta.url), 'utf8');
const imageSearch = readFileSync(new URL('../src/components/ImageSearchModal.jsx', import.meta.url), 'utf8');
const productCompare = readFileSync(new URL('../src/components/ProductCompareModal.jsx', import.meta.url), 'utf8');
const wardrobe = readFileSync(new URL('../src/components/AIDigitalWardrobe.jsx', import.meta.url), 'utf8');
const aiAssistant = readFileSync(new URL('../src/components/AiAssistantModal.jsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const footer = readFileSync(new URL('../src/components/StorefrontFooter.jsx', import.meta.url), 'utf8');
const visualEditor = readFileSync(new URL('../src/components/StorefrontVisualEditor.jsx', import.meta.url), 'utf8');
const designSource = readFileSync(new URL('../src/utils/storefrontVisualDesign.js', import.meta.url), 'utf8');

test('storefront navigation styles do not leak into the AI assistant header', () => {
  assert.doesNotMatch(css, /\.geostore-fashion-store\s+header\b/);
  assert.match(css, /\.gs-ai-header\s*\{[^}]*background:\s*#29241f/s);
  assert.match(header, /gs-site-header/);
  assert.match(aiAssistant, /className="gs-ai-header"/);
});

test('catalogue card styles are isolated from the product detail information panel', () => {
  assert.match(storeView, /className=\{?\s*["'`] ?gs-catalog-product-grid/);
  assert.match(storeView, /className="gs-catalog-product-info/);
  assert.match(storeView, /className="gs-product-detail-info/);
  assert.ok(!['gs-product-grid', 'gs-product-card', 'gs-product-media', 'gs-product-title', 'gs-product-price', 'gs-product-action', 'gs-product-card-action'].some(className => new RegExp(`(?:^|[\\s"'])${className}(?:$|[\\s"'])`).test(storeView)));
  assert.match(css, /\.gs-product-detail-info\{display:flex!important;flex-direction:column!important;/);
});

test('customer tabs share the storefront theme while admin stays separate', () => {
  assert.match(app, /activeTab !== 'admin'\s*\?\s*'geostore-fashion-store'/);
});

test('flash-sale layout rules do not capture category tiles', () => {
  assert.doesNotMatch(css, /\.geostore-fashion-store\s+\.geostore-storefront\s+\.grid:has\(\s*>div\.group\)/);
  assert.match(css, /\.gs-flash-sale-section\s*>\s*\.grid/);
});

test('mobile product-detail form controls use an iOS-safe text size', () => {
  const mobileRule = css.split('@media(max-width:767px){').slice(1).find(block => block.includes('.gs-product-modal-body input'));
  assert.ok(mobileRule);
  assert.match(mobileRule, /font-size:16px!important/);
});

test('wishlist markup and styles use the shared customer storefront theme', () => {
  assert.match(app, /gs-wishlist-page/);
  assert.match(app, /gs-wishlist-card/);
  assert.match(css, /\.geostore-fashion-store\s+\.gs-wishlist-card/);
});


test('order confirmation code uses responsive wrapping styles on its actual code element', () => {
  assert.match(modals, /className="gs-order-code-value/);
  assert.match(css, /\.gs-order-success-dialog \.gs-order-code-value\{/);
  assert.match(css, /\.gs-order-code-value\{[^}]*overflow-wrap:anywhere!important;/s);
});

test('mobile category imagery and the catalogue filter panel retain readable contrast', () => {
  assert.match(css, /\.gs-editorial-category-card \.gs-category-photo\{\s*opacity:1!important;/s);
  const finalFilterTheme = css.slice(css.lastIndexOf('GEOSTORE maintenance: unify catalogue filters'));
  assert.match(finalFilterTheme, /\.gs-catalog-controls\{[^}]*background:var\(--gs-page\)!important;/s);
  assert.match(finalFilterTheme, /\.gs-catalog-controls \.gs-price-filter>div:first-child,[\s\S]*?color:var\(--gs-muted-strong\)!important;/);
  assert.match(finalFilterTheme, /\.gs-catalog-controls \.gs-price-filter input,[\s\S]*?background:var\(--gs-surface\)!important;/);
});


test('image search and product comparison use the shared editorial modal theme', () => {
  assert.match(imageSearch, /gs-image-search-overlay/);
  assert.match(imageSearch, /gs-image-search-dialog/);
  assert.match(productCompare, /gs-product-compare-overlay/);
  assert.match(productCompare, /gs-product-compare-card/);
  assert.match(css, /\.gs-image-search-dialog,\s*\.gs-product-compare-dialog,\s*\.gs-wardrobe-add-form\{[^}]*background:var\(--gs-surface\)!important;/s);
  assert.match(css, /\.gs-product-compare-card\{[^}]*background:var\(--gs-surface\)!important;/s);
});

test('digital wardrobe and its add-item dialog use the shared responsive design system', () => {
  assert.match(wardrobe, /gs-digital-wardrobe/);
  assert.match(wardrobe, /gs-wardrobe-hero/);
  assert.match(wardrobe, /gs-wardrobe-add-form/);
  assert.match(css, /\.gs-wardrobe-hero\{[^}]*background:linear-gradient\(115deg,#f5f0e9 0%,#ebe3d9 100%\)!important;/s);
  assert.match(css, /\.gs-wardrobe-add-form\{[^}]*max-height:min\(90dvh,780px\)!important;/s);
});
 
test('product comparison uses variant-aware prices and actual available stock', () => {
  assert.match(productCompare, /getProductStartingPrice\(prod\)/);
  assert.match(productCompare, /getProductAvailableStock\(prod\)/);
  assert.doesNotMatch(productCompare, /prod\.stock\s*\|\|\s*1/);
});


 
test('mobile navigation retains login and registration inside the hamburger menu', () => {
  assert.match(header, /<nav id="geostore-main-menu"/);
  assert.match(header, /<div className="gs-menu-auth">/);
  assert.match(header, /openAuth\('login'\)/);
  assert.match(header, /openAuth\('register'\)/);
  const authRuleStart = css.lastIndexOf('.geostore-fashion-store .gs-menu-auth{');
  const authRuleEnd = css.indexOf('}', authRuleStart);
  const authRule = css.slice(authRuleStart, authRuleEnd + 1);
  const mobileAuthMediaStart = css.lastIndexOf('@media(max-width:640px)', authRuleStart);
  assert.ok(authRuleStart >= 0 && authRuleEnd > authRuleStart && mobileAuthMediaStart >= 0);
  assert.match(authRule, /display:grid!important;/);
});

test('visual editor preview passes the merged responsive draft design to live storefront components', () => {
  assert.match(visualEditor, /siteSettings=\{\{ \.\.\.\(siteSettings \|\| \{\}\), visualDesign: previewDesign \}\}/);
  assert.match(visualEditor, /visualDesign=\{previewDesign\}/);
  assert.match(visualEditor, /elementStyles: Object\.fromEntries\([\s\S]*?activeResponsive\.elementStyles/);
});

test('mobile footer policy links use a compact responsive layout', () => {
  assert.match(app, /<StorefrontFooter/);
  assert.match(footer, /className="geostore-footer-links/);
  const footerStyles = css.slice(css.lastIndexOf('GEOSTORE — compact footer and floating assistance dock'));
  assert.match(footerStyles, /\.geostore-footer-links\{[\s\S]*?display:grid!important;/);
  assert.match(footerStyles, /grid-template-columns:1fr!important/);
});


test('retired catalogue information selectors are removed after style isolation', () => {
  assert.doesNotMatch(storeView, /gs-product-info/);
  assert.doesNotMatch(css, /\.gs-product-info\b/);
});

test('legacy catalogue card selectors are removed after migrating to semantic card classes', () => {
  assert.doesNotMatch(storeView, /\bgs-product-(?:grid|card|media|title|price|action|card-action)(?![\w-])/);
  assert.doesNotMatch(css, /\.gs-product-(?:grid|card|media|title|price|action|card-action)(?![\w-])/);
});


test('customer-facing pages share one centralized premium design-token palette', () => {
  assert.match(css, /:root\{[\s\S]*?--gs-page:#f7f4ef;[\s\S]*?--gs-surface:#fffdfa;[\s\S]*?--gs-ink:#302a24;[\s\S]*?--gs-accent:#80684f;/);
  assert.match(css, /\.gs-catalog-product-card\{[\s\S]*?background:var\(--gs-surface\)!important;/);
  assert.match(css, /\.gs-product-compare-card\{[\s\S]*?background:var\(--gs-surface\)!important;/);
  assert.match(css, /\.gs-wardrobe-summary,[\s\S]*?background:var\(--gs-surface\)!important;/);
});

test('mobile floating assistance controls collapse to a non-obstructive stacked icon dock', () => {
  const dockMarker = 'GEOSTORE — compact floating assistance controls for small screens';
  const dockStart = css.lastIndexOf(dockMarker);
  assert.ok(dockStart >= 0);
  const dockStyles = css.slice(dockStart);
  assert.match(dockStyles, /@media\s*\(max-width:\s*640px\)/);
  assert.match(dockStyles, /\.gs-floating-ai[\s\S]*?bottom:\s*calc\(72px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(dockStyles, /\.gs-floating-support[\s\S]*?bottom:\s*calc\(12px \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(dockStyles, /\.gs-floating-action-copy,[\s\S]*?display:\s*none\s*!important;/);
  assert.match(dockStyles, /\.gs-floating-action-arrow[\s\S]*?display:\s*none\s*!important;/);
  assert.match(dockStyles, /width:\s*48px\s*!important;[\s\S]*?height:\s*48px\s*!important;[\s\S]*?border-radius:\s*50%\s*!important;/);
});


test('product detail gallery has responsive touch targets and clear selected-image state', () => {
  const stage38 = css.slice(css.lastIndexOf('GEOSTORE — stage 38: product detail gallery refinement'));
  assert.ok(stage38.length > 0);
  assert.match(stage38, /\.gs-product-gallery-thumbnails\{[\s\S]*?scroll-snap-type:x proximity!important;/);
  assert.match(stage38, /\.gs-product-gallery-thumb\{[\s\S]*?min-width:72px!important;[\s\S]*?min-height:72px!important;/);
  assert.match(stage38, /\.gs-product-gallery-thumb\[aria-pressed="true"\]\{[\s\S]*?border:2px solid #80684f!important;/);
  assert.match(stage38, /\.gs-product-gallery-thumb:focus-visible/);
  assert.match(stage38, /\.gs-product-modal-header button\{[\s\S]*?width:44px!important;[\s\S]*?height:44px!important;/);
  assert.match(stage38, /@media\(max-width:700px\)[\s\S]*?\.gs-product-gallery-thumb\{[\s\S]*?width:68px!important;/);
  assert.match(stage38, /@media\(prefers-reduced-motion:reduce\)[\s\S]*?\.gs-product-gallery-thumb\{[\s\S]*?transition:none!important;/);
  assert.match(storeView, /aria-pressed=\{activeImage === img\}/);
});


test('product detail information uses responsive wrapping and readable description typography', () => {
  const stage39 = css.slice(css.lastIndexOf('GEOSTORE — stage 39: product information hierarchy'));
  assert.ok(stage39.length > 0);
  assert.match(storeView, /gs-product-description-panel/);
  assert.match(storeView, /gs-product-description-copy/);
  assert.match(stage39, /\.gs-product-detail-title\{[^}]*overflow-wrap:anywhere!important;/);
  assert.match(stage39, /\.gs-product-price-panel\{[^}]*flex-wrap:wrap!important;/);
  assert.match(stage39, /\.gs-product-detail-specs\{[^}]*min-width:0!important(?:;|\})/);
  assert.match(stage39, /@media\(max-width:700px\)[\s\S]*?\.gs-product-description-copy\{[^}]*font-size:13px!important;/);
});


test('product option selectors have accessible responsive touch targets and clear states', () => {
  const stage40 = css.slice(css.lastIndexOf('GEOSTORE — stage 40: responsive product option selectors'));
  assert.ok(stage40.length > 0);
  assert.match(stage40, /\.gs-custom-variant-selector[\s\S]*?grid-template-columns:repeat\(auto-fit,minmax\(min\(100%,220px\),1fr\)\)!important;/);
  assert.match(stage40, /\.gs-size-option\{[\s\S]*?min-height:48px!important;/);
  assert.match(stage40, /\.gs-size-option\[aria-pressed="true"\]/);
  assert.match(stage40, /\.gs-color-option\{[\s\S]*?min-height:44px!important;/);
  assert.match(stage40, /:focus-visible/);
  assert.match(stage40, /:disabled/);
});


test('stage 43 repairs the mobile size-selector header and compacts the single-item flash sale', () => {
  const stage43 = css.slice(css.lastIndexOf('GEOSTORE — stage 43: repair mobile product selectors'));
  assert.ok(stage43.length > 0);
  assert.match(storeView, /className="gs-size-options-grid flex flex-wrap gap-2 w-full"/);
  assert.match(stage43, /\.gs-size-selector>div\.gs-size-options-grid\{[\s\S]*?grid-template-columns:repeat\(auto-fill,minmax\(48px,1fr\)\)!important;/);
  assert.match(stage43, /\.gs-size-selector>div:first-child\{[\s\S]*?flex-direction:row!important;/);
  assert.match(stage43, /\.gs-flash-sale-card:only-child\{[\s\S]*?grid-template-columns:minmax\(0,112px\) minmax\(0,1fr\)!important;/);
  assert.match(stage43, /\.gs-product-dialog\{[^}]*max-height:min\(92dvh,900px\)!important;/);
});


test('visual editor uses the real Header and Footer components and provides a navigator for all editable targets', () => {
  assert.match(visualEditor, /import Header from '\.\/Header';/);
  assert.match(visualEditor, /import StorefrontFooter from '\.\/StorefrontFooter';/);
  assert.match(visualEditor, /<Header[\s\S]*?setActiveTab=\{NOOP\}[\s\S]*?setIsAuthOpen=\{NOOP\}/);
  assert.match(visualEditor, /<StorefrontFooter[\s\S]*?setActiveTab=\{NOOP\}[\s\S]*?setIsTermsOpen=\{NOOP\}/);
  assert.match(visualEditor, /const VISUAL_EDITOR_TREE = \[/);
  assert.match(visualEditor, /const selectElementFromTree = targetId =>/);
  assert.match(visualEditor, /კომპონენტების იერარქია/);
  assert.match(visualEditor, /metadata\.label/);
});


test('Header and Footer copy can be edited independently without replacing locale fallbacks or navigation actions', () => {
  assert.match(visualEditor, /'header\.caption': \{[^}]*settingKey: 'headerCaptionText'/);
  assert.match(visualEditor, /'header\.search\.input': \{[^}]*settingKey: 'headerSearchPlaceholder'/);
  assert.match(visualEditor, /'footer\.termsLink': \{[^}]*settingKey: 'footerTermsText'/);
  assert.match(visualEditor, /'footer\.privacyLink': \{[^}]*settingKey: 'footerPrivacyText'/);
  assert.match(visualEditor, /'footer\.warrantyLink': \{[^}]*settingKey: 'footerWarrantyText'/);
  assert.match(visualEditor, /'footer\.copyright': \{[^}]*settingKey: 'footerCopyrightText'/);
  assert.match(header, /siteSettings\?\.headerCaptionText \|\| 'CURATED FOR YOU'/);
  assert.match(header, /siteSettings\?\.headerSearchPlaceholder \|\| t\.searchPlaceholder/);
  assert.match(footer, /siteSettings\?\.footerTermsText \|\| t\.terms/);
  assert.match(footer, /siteSettings\?\.footerPrivacyText \|\| t\.privacy/);
  assert.match(footer, /siteSettings\?\.footerWarrantyText \|\| t\.warranty/);
  assert.match(footer, /siteSettings\?\.footerCopyrightText \|\|/);
  assert.match(footer, /setIsTermsOpen\?\.\(true\)/);
  assert.match(footer, /setActiveTab\?\.\('privacy'\)/);
  assert.match(footer, /setIsWarrantyOpen\?\.\(true\)/);
});

test('Header and Footer individual link targets are registered for responsive visual styling', () => {
  assert.match(visualEditor, /'footer\.termsLink': \{/);
  assert.match(visualEditor, /'footer\.privacyLink': \{/);
  assert.match(visualEditor, /'footer\.warrantyLink': \{/);
  assert.match(designSource, /'footer\.termsLink', 'footer\.privacyLink', 'footer\.warrantyLink'/);
});


test('visual editor element geometry controls are normalized and rendered safely', async () => {
  const { normalizeStorefrontVisualDesign, buildStorefrontElementStyle } = await import('../src/utils/storefrontVisualDesign.js');
  const design = normalizeStorefrontVisualDesign({
    elementStyles: {
      'header.caption': {
        paddingX: 18, paddingY: 12, marginTop: 14, marginBottom: 22,
        minWidth: 120, maxWidth: 480, fontStyle: 'italic', textDecoration: 'underline'
      }
    },
    responsive: {
      mobile: {
        elementStyles: {
          'header.caption': { paddingX: 8, marginBottom: 6, maxWidth: 260, textDecoration: 'line-through' }
        }
      }
    }
  });
  const desktop = buildStorefrontElementStyle(design, 'header.caption', 'desktop');
  const mobile = buildStorefrontElementStyle(design, 'header.caption', 'mobile');
  assert.equal(desktop.paddingLeft, '18px');
  assert.equal(desktop.paddingRight, '18px');
  assert.equal(desktop.paddingTop, '12px');
  assert.equal(desktop.marginTop, '14px');
  assert.equal(desktop.marginBottom, '22px');
  assert.equal(desktop.minWidth, '120px');
  assert.equal(desktop.maxWidth, '480px');
  assert.equal(desktop.fontStyle, 'italic');
  assert.equal(desktop.textDecoration, 'underline');
  assert.equal(mobile.paddingLeft, '8px');
  assert.equal(mobile.paddingTop, '12px');
  assert.equal(mobile.marginBottom, '6px');
  assert.equal(mobile.maxWidth, '260px');
  assert.equal(mobile.textDecoration, 'line-through');
});

test('element-level responsive styles automatically follow the real device viewport', async () => {
  const { buildStorefrontElementStyle } = await import('../src/utils/storefrontVisualDesign.js');
  const design = {
    elementStyles: { 'header.caption': { paddingX: 18 } },
    responsive: {
      tablet: { elementStyles: { 'header.caption': { paddingX: 12 } } },
      mobile: { elementStyles: { 'header.caption': { paddingX: 8 } } }
    }
  };
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  try {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { innerWidth: 390 } });
    assert.equal(buildStorefrontElementStyle(design, 'header.caption').paddingLeft, '8px');
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { innerWidth: 900 } });
    assert.equal(buildStorefrontElementStyle(design, 'header.caption').paddingLeft, '12px');
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { innerWidth: 1280 } });
    assert.equal(buildStorefrontElementStyle(design, 'header.caption').paddingLeft, '18px');
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else delete globalThis.window;
  }
});

test('visual editor element geometry values are clamped and unsupported text styles are ignored', async () => {
  const { normalizeStorefrontVisualDesign, buildStorefrontElementStyle } = await import('../src/utils/storefrontVisualDesign.js');
  const design = normalizeStorefrontVisualDesign({
    elementStyles: {
      'footer.copyright': {
        paddingX: 999, marginTop: -20, marginBottom: 999,
        minWidth: 9999, maxWidth: 9999, fontStyle: 'oblique', textDecoration: 'blink'
      }
    }
  });
  const style = buildStorefrontElementStyle(design, 'footer.copyright');
  assert.equal(style.paddingLeft, '64px');
  assert.equal(style.marginTop, '0px');
  assert.equal(style.marginBottom, '120px');
  assert.equal(style.minWidth, '800px');
  assert.equal(style.maxWidth, '1200px');
  assert.equal(style.fontStyle, undefined);
  assert.equal(style.textDecoration, undefined);
});

test('storefront visual editor navigator lists only selectable real DOM targets', () => {
  const editor = readFileSync(new URL('../src/components/StorefrontVisualEditor.jsx', import.meta.url), 'utf8');
  const header = readFileSync(new URL('../src/components/Header.jsx', import.meta.url), 'utf8');
  const store = readFileSync(new URL('../src/components/StoreView.jsx', import.meta.url), 'utf8');
  const footer = readFileSync(new URL('../src/components/StorefrontFooter.jsx', import.meta.url), 'utf8');
  const targetBlock = editor.match(/const VISUAL_EDITOR_TARGETS = \{([\s\S]*?)\n\};/);
  assert.ok(targetBlock, 'visual editor target registry exists');
  const registered = [...targetBlock[1].matchAll(/^\s*'([^']+)'\s*:/gm)].map(match => match[1]);
  const actual = [...new Set([header, store, footer].join('\n').matchAll(/data-visual-editor-target=["']([^"']+)["']/g))].map(match => match[1]);
  assert.deepEqual(registered.sort(), actual.sort());
});
