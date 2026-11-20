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
const adminVisualCss = readFileSync(new URL('../src/adminPanelVisualDesign.css', import.meta.url), 'utf8');

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


test('stage 6 admin product quick controls stay accessible and usable on narrow screens', () => {
  assert.match(admin, /aria-label="პროდუქტის ძებნა"/);
  assert.match(admin, /aria-label=\{`თვითღირებულება: \$\{p\.name\}`\}/);
  assert.match(admin, /aria-label=\{`ფასი ლარში: \$\{p\.name\}`\}/);
  assert.match(admin, /aria-label=\{`რედაქტირება: \$\{p\.name\}`\}/);
  assert.match(admin, /aria-label=\{`წაშლა: \$\{p\.name\}`\}/);
  assert.match(admin, /handleEditProduct\(p\)/);
  assert.match(admin, /handleDeleteProduct\(p\.id\)/);
  assert.match(admin, /handleQuickUpdateProduct\(p\.id, 'purchaseCost', draft\)/);
  assert.match(admin, /handleQuickUpdateProduct\(p\.id, 'priceGEL', draft\)/);
  assert.match(admin, /handleToggleProductPublished\(p\.id\)/);
  assert.match(design, /Stage 6 — product-operations usability/);
  assert.match(design, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(design, /\.admin-product-pagination button\s*\{\s*min-block-size: var\(--gs-v2-control-target, 44px\)/);
  assert.match(design, /\.admin-product-search input\s*\{\s*font-size: 16px !important/);
  assert.doesNotMatch(design, /\[data-visual-editor-target=/);
});


test('stage 7 order management retains bounded pagination and existing order operations', () => {
  assert.match(admin, /const orderPaginationItems = getPaginationItems\(safeOrderPage, totalOrderPages\)/);
  assert.match(admin, /\{orderPaginationItems\.map\(\(page, index\) => page === '…'/);
  assert.doesNotMatch(admin, /Array\.from\(\{ length: totalOrderPages \}/);
  assert.match(admin, /<nav aria-label="შეკვეთების გვერდები"/);
  assert.match(admin, /aria-label="შეკვეთების ძებნა"/);
  assert.match(admin, /aria-label="შეკვეთების სტატუსის ფილტრები"/);
  assert.match(admin, /aria-pressed=\{orderStatusFilter === st\}/);
  assert.match(admin, /aria-label=\{`შეკვეთა #\$\{o\.id\} — სრული დეტალები`\}/);
  assert.match(admin, /aria-label=\{`შეკვეთა #\$\{o\.id\} — ინვოისის ბეჭდვა`\}/);
  assert.match(admin, /onClick=\{\(\) => handleUpdateOrderStatus\(o\.id, 'გაუქმებული'\)\}/);
  assert.match(admin, /onClick=\{\(\) => handlePrintInvoice\(o\)\}/);
  assert.match(admin, /onClick=\{handleExportOrders\}/);
  assert.match(design, /Stage 7 — admin orders readability/);
  assert.match(design, /\.admin-orders-panel \.admin-orders-search input\s*\{\s*font-size: 16px !important/);
  assert.match(design, /\.admin-orders-panel \.admin-order-status-actions > button,/);
});


test('stage 7 owner visual editor font precedence maintains accessible operational fields', () => {
  assert.match(design, /Stage 7 — visual-editor input precedence/);
  assert.match(design, /\[data-admin-visual-design="enabled"\] \.admin-orders-panel \.admin-orders-search input/);
  assert.match(design, /\[data-admin-visual-design="enabled"\] \.admin-products-panel \.admin-product-controls input/);
  assert.match(design, /max\(16px, var\(--admin-vd-inputFontSize-active, 16px\)\) !important/);
  assert.match(design, /@media \(max-width: 640px\)/);
});


test('stage 7 mobile editor input typography prevents focus zoom without locking larger designs', () => {
  assert.match(adminVisualCss, /Design System 2\.0 — prevent iOS focus zoom/);
  assert.match(adminVisualCss, /@media \(max-width: 640px\)/);
  assert.match(adminVisualCss, /font-size: max\(16px, var\(--admin-vd-inputFontSize-active, 16px\)\) !important/);
  assert.match(adminVisualCss, /input:not\(\[type="checkbox"\]\):not\(\[type="radio"\]\)/);
  assert.match(layoutBrowser, /orderSearchFontSize >= 16/);
  assert.match(layoutBrowser, /adminProductPriceFontSize >= 16/);
});


test('stage 8 support controls expose status, conversation and reply affordances', () => {
  assert.match(admin, /role="group" aria-label=\{`ტიკეტი #\$\{t\.id\} — სტატუსი`\}/);
  assert.match(admin, /aria-pressed=\{t\.status === 'ღია'\}/);
  assert.match(admin, /aria-pressed=\{t\.status === 'მუშაობდება'\}|aria-pressed=\{t\.status === 'მუშავდება'\}/);
  assert.match(admin, /aria-pressed=\{t\.status === 'მოგვარებული'\}/);
  assert.match(admin, /aria-expanded=\{String\(selectedSupportTicketId\) === String\(t\.id\)\}/);
  assert.match(admin, /aria-controls=\{`admin-support-thread-\$\{t\.id\}`\}/);
  assert.match(admin, /role="region" aria-label=\{`ტიკეტი #\$\{t\.id\} — მიმოწერის ისტორია`\}/);
  assert.match(admin, /aria-label=\{`ტიკეტი #\$\{t\.id\} — პასუხის ტექსტი`\}/);
  assert.match(admin, /aria-label=\{`ტიკეტი #\$\{t\.id\} — პასუხის გაგზავნა`\}/);
  assert.match(admin, /handleSendTicketReply\(t\.id\)/);
  assert.match(admin, /fetchSupportTicketThread\(ticketId\)/);
  assert.match(design, /Stage 8 — accessible support tickets/);
  assert.match(design, /\.admin-support-panel \.admin-support-status-actions > button/);
  assert.match(design, /min-block-size: 44px !important/);
  assert.match(design, /\.admin-support-panel \.admin-support-reply-form > input/);
});


test('stage 9 CRM customer list paginates without modifying customer authorization or data', () => {
  assert.match(admin, /const \[crmPage, setCrmPage\] = useState\(1\)/);
  assert.match(admin, /const CRM_PER_PAGE = 10/);
  assert.match(admin, /const totalCrmPages = Math\.max\(1, Math\.ceil\(filteredUsers\.length \/ CRM_PER_PAGE\)\)/);
  assert.match(admin, /const paginatedCrmUsers = filteredUsers\.slice\(/);
  assert.match(admin, /const crmPaginationItems = getPaginationItems\(safeCrmPage, totalCrmPages\)/);
  assert.match(admin, /paginatedCrmUsers\.map\(\(u, i\) =>/);
  assert.match(admin, /setUserSearchQuery\(e\.target\.value\); setCrmPage\(1\)/);
  assert.match(admin, /<nav aria-label="CRM მომხმარებლების გვერდები"/);
  assert.match(admin, /aria-current=\{safeCrmPage === page \? 'page' : undefined\}/);
  assert.match(admin, /onClick=\{\(\) => handleToggleVipUser\(u\.id \|\| u\.email\)\}/);
  assert.match(admin, /onClick=\{\(\) => handleToggleBlockUser\(u\.id \|\| u\.email\)\}/);
  assert.match(admin, /onClick=\{\(\) => handleSaveUserCrm\(u\.id \|\| u\.email\)\}/);
  assert.match(admin, /onClick=\{\(\) => handleDeleteUser\(u\.id \|\| u\.email, u\.name\)\}/);
  assert.match(design, /Stage 9 — CRM customer workspace/);
  assert.match(design, /\.admin-crm-user-actions > button,/);
  assert.match(design, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(design, /\[data-visual-editor-target=/);
});


test('stage 10 analytics controls and chart remain accessible without changing reporting logic', () => {
  assert.match(admin, /className="admin-analytics-actions flex/);
  assert.match(admin, /htmlFor="admin-analytics-period"/);
  assert.match(admin, /id="admin-analytics-period" aria-label="ანალიტიკის პერიოდი"/);
  assert.match(admin, /value=\{analyticsPeriod\} onChange=\{e => setAnalyticsPeriod\(e\.target\.value\)\}/);
  assert.match(admin, /onClick=\{handleExportAnalytics\}/);
  assert.match(admin, /className="admin-analytics-trend-scroll/);
  assert.match(admin, /role="region" aria-label="გაყიდვების დინამიკის გადახვევადი გრაფიკი" tabIndex=\{0\}/);
  assert.match(admin, /role="listitem" aria-label=\{\x60\$\{point\.label\}: \$\{point\.revenue\.toFixed\(2\)\} ₾/);
  assert.match(admin, /financialOverview\.salesTrend\.map\(point =>/);
  assert.match(admin, /financialOverview\.totalSalesRevenue\.toFixed\(2\)/);
  assert.match(admin, /financialOverview\.grossProfit === null/);
  assert.match(admin, /financialOverview\.netProfit === null/);
  assert.match(admin, /financialOverview\.deliveredOrdersMissingStatusDate > 0/);
  assert.equal((admin.match(/className="admin-analytics-value text-2xl/g) || []).length, 8);
  assert.equal((admin.match(/className="admin-analytics-note text-/g) || []).length, 8);
  assert.match(design, /Stage 10 — analytics and finance dashboard/);
  assert.match(design, /\.admin-analytics-trend-scroll:focus-visible/);
  assert.match(design, /repeat\(auto-fit, minmax\(min\(100%, 210px\), 1fr\)\)/);
  assert.match(layoutBrowser, /analyticsChartClientWidth/);
  assert.doesNotMatch(design, /\[data-visual-editor-target=/);
});


test('stage 11 finance breakdown preserves amount calculations and uncertainty notes', () => {
  assert.match(admin, /className="admin-finance-sources-panel/);
  assert.match(admin, /className="admin-finance-expenses-panel/);
  assert.match(admin, /className="admin-finance-products-panel/);
  assert.match(admin, /className="admin-finance-vendors-panel/);
  assert.equal((admin.match(/className="admin-finance-breakdown-row /g) || []).length, 2);
  assert.match(admin, /className="admin-finance-recent-row /);
  assert.equal((admin.match(/className="admin-profitability-row /g) || []).length, 2);
  assert.equal((admin.match(/className="admin-profitability-metrics /g) || []).length, 2);
  assert.equal((admin.match(/className="admin-profitability-results /g) || []).length, 2);
  assert.match(admin, /incomeSources\.map\(source =>/);
  assert.match(admin, /expenseBreakdown\.map\(expense =>/);
  assert.match(admin, /financialOverview\.periodExpenses\.slice\(0,5\)\.map/);
  assert.match(admin, /financialOverview\.productProfitability\.map\(item =>/);
  assert.match(admin, /financialOverview\.vendorProfitability\.map\(item =>/);
  assert.match(admin, /item\.grossProfit === null \? '—'/);
  assert.match(admin, /item\.margin === null \? '—'/);
  assert.match(admin, /item\.unknownCostItems > 0/);
  assert.match(admin, /item\.estimatedCostItems > 0/);
  assert.match(design, /Stage 11 — finance breakdown detail readability/);
  assert.match(design, /\.admin-finance-breakdown-row,/);
  assert.match(design, /\.admin-profitability-metrics/);
  assert.match(layoutBrowser, /financeRowMaxRight/);
  assert.doesNotMatch(design, /\[data-visual-editor-target=/);
});


test('stage 12 expense and calculator forms have readable labels without changing financial handlers', () => {
  for (const id of ['admin-expense-category', 'admin-expense-amount', 'admin-expense-date', 'admin-expense-description',
    'admin-calc-purchase-cost', 'admin-calc-selling-price', 'admin-calc-discount-percent', 'admin-calc-shipping-cost']) {
    assert.ok(admin.includes('htmlFor="' + id + '"'), id + ' must have a label');
    assert.ok(admin.includes('id="' + id + '"'), id + ' must have a matching field');
  }
  assert.ok(admin.includes('onSubmit={handleAddExpense}'));
  assert.ok(admin.includes('value={expenseForm.category} onChange={e => setExpenseForm'));
  assert.ok(admin.includes('value={expenseForm.amount} onChange={e => setExpenseForm'));
  assert.ok(admin.includes('value={expenseForm.date} onChange={e => setExpenseForm'));
  assert.ok(admin.includes('value={expenseForm.description} onChange={e => setExpenseForm'));
  assert.ok(admin.includes('inputMode="decimal" min="0.01" max="1000000000" step="0.01" required'));
  assert.ok(admin.includes('maxLength={300} required'));
  assert.ok(admin.includes('aria-describedby="admin-expense-amount-help"'));
  assert.ok(admin.includes('aria-describedby="admin-expense-description-help"'));
  assert.ok(admin.includes('handleDeleteExpense(exp.id)'));
  assert.ok(admin.includes("const validDate = Boolean(dateParts && parsedExpenseDate"));
  assert.ok(admin.includes("if (!/^\\d+(?:\\.\\d{1,2})?$/.test(amountText)"));
  assert.ok(admin.includes("method: 'POST'"));
  assert.ok(admin.includes("method: 'DELETE'"));
  assert.ok(admin.includes('calculatedSalesMetrics.discountedPrice.toFixed(2)'));
  assert.ok(admin.includes('calculatedSalesMetrics.profitMargin.toFixed(1)'));
  assert.ok(design.includes('Stage 12 — expense entry and calculator forms'));
  assert.ok(design.includes('.admin-expense-submit'));
  assert.ok(design.includes('.admin-calculator-field-grid'));
  assert.ok(layoutBrowser.includes('expenseFormMinInputFontSize'));
  assert.ok(layoutBrowser.includes('calculatorMinInputFontSize'));
  assert.doesNotMatch(design, /\[data-visual-editor-target=/);
});


test('stage 13 expense ledger filters and pagination keep complete financial data unchanged', () => {
  assert.match(admin, /const \[expenseSearchQuery, setExpenseSearchQuery\] = useState\(''\)/);
  assert.match(admin, /const \[expenseCategoryFilter, setExpenseCategoryFilter\] = useState\('all'\)/);
  assert.match(admin, /const \[expensePage, setExpensePage\] = useState\(1\)/);
  assert.match(admin, /const EXPENSES_PER_PAGE = 10/);
  assert.match(admin, /const expenseCategoryOptions = Array\.from\(new Set\(expenses\.map/);
  assert.match(admin, /const filteredExpenses = expenses\.filter\(exp =>/);
  assert.match(admin, /const totalExpensePages = Math\.max\(1, Math\.ceil\(filteredExpenses\.length \/ EXPENSES_PER_PAGE\)\)/);
  assert.match(admin, /const safeExpensePage = Math\.min\(Math\.max\(1, expensePage\), totalExpensePages\)/);
  assert.match(admin, /const paginatedExpenses = filteredExpenses\.slice\(/);
  assert.match(admin, /const expensePaginationItems = getPaginationItems\(safeExpensePage, totalExpensePages\)/);
  assert.match(admin, /htmlFor="admin-expense-history-search"/);
  assert.match(admin, /htmlFor="admin-expense-history-category"/);
  assert.match(admin, /setExpenseSearchQuery\(e\.target\.value\); setExpensePage\(1\)/);
  assert.match(admin, /setExpenseCategoryFilter\(e\.target\.value\); setExpensePage\(1\)/);
  assert.match(admin, /paginatedExpenses\.map\(exp =>/);
  assert.match(admin, /filteredExpenses\.length === 0/);
  assert.match(admin, /filteredExpenses\.length > EXPENSES_PER_PAGE/);
  assert.match(admin, /aria-current=\{safeExpensePage === page \? 'page' : undefined\}/);
  assert.match(admin, /aria-label="ხარჯების ისტორიის გვერდები"/);
  assert.match(admin, /onClick=\{\(\) => void fetchExpenses\(\)\}/);
  assert.match(admin, /financialOverview\.periodExpenses\.map\(item =>/);
  assert.match(admin, /setExpenses\(allExpenses\)/);
  assert.match(admin, /setExpenses\(prev => \[newExp, \.\.\.prev\]\)/);
  assert.match(admin, /setExpenses\(prev => prev\.filter\(expense => String\(expense\.id\) !== normalizedId\)\)/);
  assert.match(design, /Stage 13 — expense ledger search and pagination/);
  assert.match(layoutBrowser, /expenseHistoryFilterMinHeight/);
  assert.doesNotMatch(design, /\[data-visual-editor-target=/);
});


test('stage 14 calculator exposes its four pre-existing hidden inputs without changing the formula', () => {
  const fields = [
    ['admin-calc-purchase-cost', 'purchaseCost'],
    ['admin-calc-selling-price', 'sellingPrice'],
    ['admin-calc-discount-percent', 'discountPercent'],
    ['admin-calc-shipping-cost', 'shippingCost'],
    ['admin-calc-packaging-cost', 'packagingCost'],
    ['admin-calc-processing-fee', 'processingFee'],
    ['admin-calc-other-expenses', 'otherExpenses'],
    ['admin-calc-quantity', 'quantity']
  ];
  for (const [id, field] of fields) {
    assert.ok(admin.includes('htmlFor="' + id + '"'), id + ' requires a label');
    assert.ok(admin.includes('id="' + id + '"'), id + ' requires an input');
    assert.ok(admin.includes('value={calcForm.' + field + '} onChange={e => setCalcForm('), field + ' must remain controlled');
    assert.ok(admin.includes('toNonNegative(calcForm.' + field + ')') || field === 'quantity', field + ' must remain in financial formula');
  }
  assert.match(admin, /const \[calcForm, setCalcForm\] = useState\(\{/);
  assert.match(admin, /packagingCost: '2'/);
  assert.match(admin, /processingFee: '2'/);
  assert.match(admin, /quantity: '1'/);
  assert.match(admin, /const revenue = discountedPrice \* qty/);
  assert.match(admin, /const grossProfit = \(discountedPrice - pCost\) \* qty/);
  assert.match(admin, /const netProfit = grossProfit - \(\(ship \+ pack \+ proc \+ other\) \* qty\)/);
  assert.match(admin, /calculatedSalesMetrics\.revenue\.toFixed\(2\)/);
  assert.match(admin, /className="admin-calculator-extra-fields/);
  assert.match(admin, /aria-labelledby="admin-calc-extra-title"/);
  assert.match(design, /Stage 14 — fully editable profit calculator inputs/);
  assert.match(layoutBrowser, /calculatorExtraCount/);
  assert.doesNotMatch(design, /\[data-visual-editor-target=/);
});
