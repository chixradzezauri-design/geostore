import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const legacyIndex = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
const compatibility = readFileSync(new URL('../src/responsiveCompatibility.css', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
const design = readFileSync(new URL('../src/designSystemV2.css', import.meta.url), 'utf8');
const store = readFileSync(new URL('../src/components/StoreView.jsx', import.meta.url), 'utf8');
const productMedia = readFileSync(new URL('../src/components/ProductMediaImage.jsx', import.meta.url), 'utf8');
const modal = readFileSync(new URL('../src/components/Modals.jsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const header = readFileSync(new URL('../src/components/Header.jsx', import.meta.url), 'utf8');
const browser = readFileSync(new URL('./browser/realStorefrontSmoke.mjs', import.meta.url), 'utf8');
const layoutBrowser = readFileSync(new URL('./browser/responsiveLayout.mjs', import.meta.url), 'utf8');
const admin = readFileSync(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('Design System 2.0 is appended after all legacy admin and storefront styles', () => {
  assert.equal(main.match(/import '\.\/designSystemV2\.css'/g)?.length, 1);
  assert.ok(main.indexOf("import './designSystemV2.css'") > main.indexOf("import './adminDashboardPolish.css'"));
  assert.match(design, /GEOSTORE Design System 2\.0/);
  assert.match(design, /--gs-v2-space-2: 8px/);
});

test('first design-system pass does not overwrite editable storefront colors, sizes, typography or stored state', () => {
  assert.match(design, /\.geostore-fashion-store/);
  assert.match(design, /\.admin-dashboard-pro\.admin-dashboard-shell/);
  assert.doesNotMatch(design, /(?:background(?:-color)?|font-family|font-weight|color)\s*:/i);
  assert.doesNotMatch(design, /localStorage|supabase|persist|onclick|display:\s*none/i);
  assert.doesNotMatch(design, /\[data-visual-editor-target=/);
});

test('command-center KPI density is compact without removing operational navigation', () => {
  assert.match(admin, /className="admin-command-kpi group/);
  assert.match(admin, /onClick=\{\(\) => setAdminTab\('orders'\)\}/);
  assert.match(admin, /onClick=\{\(\) => setAdminTab\('replenishment'\)\}/);
  assert.match(design, /\.admin-command-kpi > strong\s*\{\s*font-size:\s*clamp\(18px, 1\.9vw, 25px\)/);
  assert.match(design, /\.admin-command-panel\s*\{\s*min-inline-size:\s*0/);
});

test('long menu labels and storefront search cannot force intrinsic horizontal overflow', () => {
  assert.match(header, /className="gs-main-menu"/);
  assert.match(header, /className="gs-header-search-row"/);
  assert.match(design, /\.gs-menu-link > span:not\(\.gs-menu-count\):not\(\.gs-menu-category-dot\)/);
  assert.match(design, /max-inline-size:\s*calc\(100vw - 16px\)/);
  assert.match(design, /\.gs-header-search input\s*\{\s*min-inline-size:\s*0/);
});

test('escape closes the menu and returns keyboard focus to the opener', () => {
  assert.match(header, /const menuToggleRef = useRef\(null\)/);
  assert.match(header, /ref=\{menuToggleRef\}/);
  assert.match(header, /if \(event\.key === 'Escape'\) \{\s*closeMenu\(\);\s*\/\/[^\n]*\s*menuToggleRef\.current\?\.focus\(\)/);
  assert.match(header, /aria-expanded=\{menuOpen\}/);
  assert.match(browser, /page\.keyboard\.press\('Escape'\)/);
  assert.match(browser, /document\.activeElement === node/);
});

test('focus and reduced-motion protections are scoped to storefront and admin', () => {
  assert.match(design, /:focus-visible\s*\{/);
  assert.match(design, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(design, /--gs-v2-focus-offset: 3px/);
});


test('product detail dialog is labelled, modal and keyboard closable without altering the purchase handler', () => {
  assert.match(store, /role="dialog" aria-modal="true" aria-labelledby="gs-product-dialog-title"/);
  assert.match(store, /id="gs-product-dialog-title"/);
  assert.match(store, /ref=\{productCloseButtonRef\}/);
  assert.match(store, /productCloseButtonRef\.current\?\.focus\(\)/);
  assert.match(store, /returnTarget\?\.isConnected/);
  assert.match(store, /document\.addEventListener\('keydown', handleProductDialogKeyDown\)/);
  assert.match(store, /event\.key !== 'Escape'/);
  assert.match(store, /if \(isSmartSizeModalOpen\) setIsSmartSizeModalOpen\(false\)/);
  assert.match(store, /else if \(isSizeGuideOpen\) setIsSizeGuideOpen\(false\)/);
  assert.match(store, /currentAvailableStock <= 0 \|\| \(hasCustomProductVariants\(selectedProduct\)/);
  assert.match(store, /addToCart\(\{/);
});

test('stage 2 product modal selectors preserve visual-editor customization and responsive stock UI', () => {
  assert.match(store, /data-visual-editor-target="product\.detail\.purchase"/);
  assert.match(store, /data-visual-editor-target="product\.detail\.variants"/);
  assert.match(store, /aria-pressed=\{selectedSize === size\}/);
  assert.match(store, /aria-pressed=\{selectedColor === colName\}/);
  assert.match(design, /Stage 2 — product dialog usability/);
  assert.match(design, /\.gs-product-modal-body\s*\{\s*flex: 1 1 auto/);
  assert.match(design, /\.gs-modal-add-to-cart\s*\{\s*display: grid;\s*grid-template-columns: auto minmax\(0, 1fr\) auto/);
  assert.match(design, /--gs-v2-control-target/);
});


test('stage 3 retains existing order and coupon business logic while adding accessible cart controls', () => {
  assert.match(app, /gs-cart-quantity-controls flex/);
  assert.match(app, /changeCartQuantity\(item, Number\(item\.quantity\) - 1\)/);
  assert.match(app, /changeCartQuantity\(item, Number\(item\.quantity\) \+ 1\)/);
  assert.match(app, /gs-cart-coupon-form flex/);
  assert.match(app, /onSubmit=\{handleApplyCoupon\}/);
  assert.match(app, /setAppliedCoupon\(null\)/);
  assert.match(app, /aria-label=\{t\.promoCode\}/);
  assert.match(app, /onClick=\{\(\) => \{\s*setCheckoutError\(''\);\s*setIsCheckoutOpen\(true\)/);
  assert.match(design, /Stage 3 — cart and checkout density/);
});

test('checkout error is labelled and announced without intercepting order submission', () => {
  assert.match(modal, /onSubmit=\{handlePlaceOrder\}/);
  assert.match(modal, /aria-describedby=\{checkoutError \? 'geostore-checkout-error' : undefined\}/);
  assert.match(modal, /id="geostore-checkout-error" role="alert" aria-atomic="true"/);
  assert.match(modal, /aria-labelledby="geostore-checkout-title"/);
  assert.match(modal, /aria-describedby="geostore-checkout-intro"/);
  assert.match(modal, /autoComplete="street-address"/);
  assert.match(modal, /autoComplete="email"/);
  assert.match(design, /\.gs-checkout-form :is\(input, select\)\s*\{\s*font-size: 16px !important/);
});

test('cart quantity touch targets and checkout shell have responsive browser checks', () => {
  assert.match(design, /\.gs-cart-quantity-controls button\s*\{\s*min-width: var\(--gs-v2-control-target\) !important/);
  assert.match(design, /\.gs-cart-coupon-form input\s*\{\s*flex: 1 1 0/);
  assert.match(design, /\.gs-commerce-overlay--checkout \.gs-checkout-dialog\s*\{\s*max-height: calc\(100dvh/);
  assert.match(layoutBrowser, /cartQtyMinHeight/);
  assert.match(layoutBrowser, /checkoutDialogRight/);
  assert.match(layoutBrowser, /checkoutInputFontSize/);
});


test('stage 4 extracts legacy responsive compatibility rules in original cascade order', () => {
  const oldMarker = 'GEOSTORE compact responsive pass 2026-11-20';
  assert.ok(!legacyIndex.includes(oldMarker), 'Extracted rules should not be duplicated in index.css');
  assert.ok(compatibility.includes(oldMarker), 'Extracted responsive rules remain present');
  assert.ok(compatibility.includes('admin-command-kpis'));
  assert.ok(compatibility.includes('geostore-footer-links'));
  assert.ok(compatibility.includes('gs-catalog-product-grid'));
  assert.ok(main.indexOf("import './responsiveCompatibility.css'") > main.indexOf("import './index.css'"));
  assert.ok(main.indexOf("import './responsiveCompatibility.css'") < main.indexOf("import './adminDashboard.css'"));
  assert.ok(main.indexOf("import './responsiveCompatibility.css'") < main.indexOf("import './designSystemV2.css'"));
});

test('stage 4 pauses idle flash-sale renders and resumes upon visibility or product update', () => {
  assert.match(store, /getFlashSaleNextTickDelay\(activeProducts, now\)/);
  assert.match(store, /window\.setTimeout\(tick, delay\)/);
  assert.match(store, /document\.visibilityState === 'hidden'/);
  assert.match(store, /document\.addEventListener\('visibilitychange', refreshWhenVisible\)/);
  assert.match(store, /document\.removeEventListener\('visibilitychange', refreshWhenVisible\)/);
  assert.match(store, /\}, \[activeProducts\]\);/);
  assert.doesNotMatch(store, /setInterval\(\(\) => setFlashSaleClock/);
});


test('stage 5 category images are native lazy images with unchanged crop and overlays', () => {
  assert.match(store, /<img className="gs-category-photo gs-editorial-category-photo"/);
  assert.match(store, /\{catImage \? <img className="gs-category-photo" src=\{catImage\}/);
  assert.doesNotMatch(store, /className="gs-category-photo" style=\{\{ backgroundImage:/);
  const lazyImages = store.match(/className="gs-category-photo[^"]*"[^>]*loading="lazy" decoding="async"/g) || [];
  assert.equal(lazyImages.length, 2);
  assert.match(design, /\.gs-category-card > img\.gs-category-photo\s*\{\s*display: block;/);
  assert.match(design, /object-fit: cover;/);
  assert.match(layoutBrowser, /categoryImageFit/);
  assert.match(browser, /img\.gs-category-photo/);
});

test('stage 5 broken cart/wishlist artwork is replaced with a labelled fallback without cart mutations', () => {
  assert.match(app, /import ProductMediaImage from '\.\/components\/ProductMediaImage'/);
  assert.equal((app.match(/<ProductMediaImage/g) || []).length, 2);
  assert.match(productMedia, /onError=\{\(\) => setFailedUrl\(imageUrl\)\}/);
  assert.match(productMedia, /imageUrl === failedUrl/);
  assert.match(productMedia, /loading="lazy"/);
  assert.match(productMedia, /decoding="async"/);
  assert.match(productMedia, /role="img" aria-label=\{alt\}/);
  assert.doesNotMatch(app, /event\.currentTarget\.style\.display = 'none'/);
});

test('stage 5 removes only adjacent identical CSS declarations from the legacy sheet', () => {
  const re = /([-a-zA-Z][-\w]*):([^;{}]+);\s*\1:\2;/g;
  assert.equal([...legacyIndex.matchAll(re)].length, 0);
  assert.match(legacyIndex, /\.gs-category-card \.gs-category-photo/);
  assert.match(main, /import '\.\/designSystemV2\.css'/);
});
