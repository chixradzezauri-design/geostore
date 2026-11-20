import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const assets = resolve('dist/assets');
const stylesheets = readdirSync(assets).filter(file => file.endsWith('.css'));
assert.ok(stylesheets.length, 'Production build must contain CSS');
const css = stylesheets.map(file => readFileSync(resolve(assets, file), 'utf8')).join('\n');
const stage6CssPresent = css.includes('.admin-products-panel .admin-product-controls');
assert.ok(stage6CssPresent, 'Stage 6 admin product rules must be included in the built stylesheet');
const cards = Array.from({ length: 2 }, (_, i) =>
  '<article class="gs-catalog-product-card"><div class="gs-catalog-product-media">Image</div>' +
  '<div class="gs-catalog-product-info"><h3>Product ' + i + '</h3><button>დამატება</button></div></article>'
).join('');
const nav = Array.from({ length: 23 }, (_, i) =>
  '<button type="button" data-admin-visual-nav-item="true" class="w-full min-w-0 px-3.5 py-3 rounded-2xl flex items-center justify-between">' +
  '<span>ადმინისტრატორის მენიუ ' + i + '</span></button>'
).join('');
const storefront = '<section class="geostore-fashion-store" style="width:100%;max-width:100%">' +
  '<main class="geostore-storefront"><div class="gs-catalog-product-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">' +
  cards + '</div></main><footer class="geostore-site-footer"><div class="geostore-footer-links">' +
  '<button>წესები და პირობები</button><span aria-hidden="true">•</span>' +
  '<button>კონფიდენციალურობა</button><span aria-hidden="true">•</span>' +
  '<button>საგარანტიო წესები</button></div></footer></section>';
const admin = '<section class="admin-dashboard-pro admin-dashboard-shell flex flex-col lg:flex-row gap-6 w-full" data-admin-visual-design="enabled">' +
  '<div class="w-full lg:w-72 shrink-0"><div>GEOSTORE Admin</div><div class="space-y-1.5">' + nav + '</div></div>' +
  '<div class="flex-1 w-full"><div data-admin-visual-header="true" class="flex flex-col lg:flex-row p-5 gap-3">' +
  '<div><h2>მოგესალმებით, მთავარო ადმინისტრატორო</h2></div>' +
  '<div class="grid grid-cols-2 gap-2"><button>მონახაზის შენახვა</button><button>ცვლილებების გამოქვეყნება</button></div>' +
  '</div><div class="admin-command-hero"><h3>მთავარი მართვის ცენტრი</h3></div>' +
  '<div class="admin-command-kpis"><button class="admin-command-kpi"><span>ახალი შეკვეთები</span><strong>120</strong></button></div>' +
  '</div></section>';

const adminProductFixture =
  '<section class="admin-products-panel"><div class="admin-product-row flex flex-col sm:flex-row justify-between gap-4">' +
  '<div class="admin-product-identity flex min-w-0 items-center gap-3.5">' +
  '<div style="width:56px;height:56px;flex-shrink:0"></div><div>' +
  '<h4>გრძელი დასახელების ქართული პროდუქტი სხვადასხვა ზომით და ფერით</h4>' +
  '<p>კატეგორია: ტანსაცმელი | SKU: GEO-VERY-LONG-SKU-00001</p></div></div>' +
  '<div class="admin-product-controls flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">' +
  '<div class="flex items-center gap-2"><span>COGS:</span><input aria-label="თვითღირებულება" type="number" class="w-20" value="99"></div>' +
  '<div class="flex items-center gap-2"><span>ფასი:</span><input aria-label="ფასი" type="number" class="w-24" value="120"></div>' +
  '<div class="flex items-center gap-2"><span>მარაგი:</span><input aria-label="მარაგი" type="number" class="w-16" value="10"><span>მარაგშია</span></div>' +
  '<button type="button">გამოქვეყნება</button><button type="button">რედაქტირება</button>' +
  '<button type="button">წაშლა</button></div></div>' +
  '<nav class="admin-product-pagination"><button type="button">წინა</button>' +
  '<button type="button">1</button><button type="button">შემდეგი</button></nav></section>';

const adminOrdersFixture =
  '<section class="admin-orders-panel">' +
  '<div class="admin-orders-toolbar flex flex-col sm:flex-row gap-3">' +
  '<div class="admin-orders-search w-full sm:w-80"><input aria-label="შეკვეთების ძებნა" type="text" /></div>' +
  '<div class="admin-order-status-filters flex items-center gap-2 overflow-x-auto"><button>ყველა</button><button>მუშავდება</button></div></div>' +
  '<div class="admin-orders-list"><article class="admin-order-card">' +
  '<div class="admin-order-card-heading"><strong>შეკვეთა #1001</strong><span>120.00 ₾</span></div>' +
  '<div class="admin-order-card-customer"><p>მყიდველი: გრძელისახელისგრძელიმომხმარებელი</p></div>' +
  '<div class="admin-order-actions flex gap-2"><button>სრული დეტალები</button><button>ინვოისი</button>' +
  '<div class="admin-order-status-actions flex gap-1"><button>ახალი</button><button>მუშავდება</button></div></div>' +
  '</article></div>' +
  '<nav class="admin-orders-pagination" aria-label="შეკვეთების გვერდები"><div class="flex gap-2">' +
  '<button>წინა</button><button>1</button><button>შემდეგი</button></div></nav></section>';

const adminCrmFixture =
  '<section class="admin-crm-panel"><div class="admin-crm-search">' +
  '<input type="text" aria-label="CRM მომხმარებლების ძებნა"></div>' +
  '<div class="admin-crm-list"><article class="admin-crm-user-card">' +
  '<div><h4>ძალიან გრძელი ქართული მომხმარებლის სახელი სატესტო მონაცემებით</h4>' +
  '<p>user.with.long.email.address@example.test | +995555555555</p></div>' +
  '<div class="admin-crm-user-actions flex flex-wrap gap-2 w-full sm:w-auto justify-end">' +
  '<button type="button">VIP მინიჭება</button><button type="button">შეზღუდულად მონიშვნა</button>' +
  '<button type="button">რედაქტირება</button><button type="button">ლოკალური წაშლა</button>' +
  '</div></article></div>' +
  '<nav class="admin-crm-pagination" aria-label="CRM მომხმარებლების გვერდები">' +
  '<p>ნაჩვენებია 1–10 / 150</p><div class="flex flex-wrap gap-2">' +
  '<button type="button">წინა</button><button type="button">1</button><button type="button">შემდეგი</button>' +
  '</div></nav></section>';

const adminAnalyticsFixture =
  '<section class="admin-analytics space-y-6">' +
  '<div class="admin-analytics-toolbar flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">' +
  '<div class="admin-analytics-heading min-w-0"><h3>ფინანსური ანალიტიკა</h3><p>შერჩეული პერიოდის შედეგები</p></div>' +
  '<div class="admin-analytics-actions flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">' +
  '<label class="sr-only" for="fixture-analytics-period">პერიოდი</label>' +
  '<select id="fixture-analytics-period"><option>ბოლო 30 დღე</option></select>' +
  '<button type="button">ანგარიშების CSV ექსპორტი</button></div></div>' +
  '<div class="admin-analytics-kpis grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">' +
  Array.from({ length: 8 }, (_, i) =>
    '<article class="admin-analytics-card p-5"><p>ფინანსური მაჩვენებელი ' + (i + 1) + '</p>' +
    '<p class="admin-analytics-value text-2xl sm:text-3xl">12345678.90 ₾</p>' +
    '<span class="admin-analytics-note">გრძელი ფინანსური შენიშვნა შეკვეთებში დაფიქსირებული თვითღირებულების შესახებ</span></article>'
  ).join('') + '</div>' +
  '<div class="grid grid-cols-1 xl:grid-cols-2 gap-5"><div class="p-5">' +
  '<h3>გაყიდვების დინამიკა</h3>' +
  '<div class="admin-analytics-trend-scroll max-w-full overflow-x-auto" role="region" tabindex="0">' +
  '<div class="admin-analytics-trend-bars flex items-end gap-1.5 h-44 pt-3" style="min-width:max(100%,1320px)" role="list">' +
  Array.from({ length: 30 }, (_, i) =>
    '<div role="listitem" aria-label="' + (i + 1) + ' ნოემბერი: 150.00 ₾" class="flex-1 min-w-0 h-full flex flex-col justify-end items-center gap-1">' +
    '<div aria-hidden="true" style="height:50%" class="w-full"></div>' +
    '<span aria-hidden="true" class="text-[8px] whitespace-nowrap">დღე ' + (i + 1) + '</span></div>'
  ).join('') +
  '</div></div></div></div></section>';

const productDialog = '<div class="gs-product-modal fixed inset-0">' +
  '<div class="gs-product-dialog" role="dialog" aria-modal="true" aria-labelledby="fixture-product-heading">' +
  '<div class="gs-product-modal-header"><span id="fixture-product-heading">პროდუქტის დეტალური ხედი</span>' +
  '<button class="gs-product-modal-close" aria-label="დახურვა">×</button></div>' +
  '<div class="gs-product-modal-body"><div class="grid">' +
  '<div class="gs-product-gallery"><div class="gs-product-detail-image-stage">სურათი</div>' +
  '<div class="gs-product-gallery-thumbnails"><button class="gs-product-gallery-thumb">1</button></div></div>' +
  '<div class="gs-product-detail-info"><div class="gs-size-selector">' +
  '<div class="flex"><span>აირჩიეთ ზომა</span><button>ზომების გიდი</button></div>' +
  '<div class="gs-size-options-grid">' +
  '<button class="gs-size-option">M</button><button class="gs-size-option">L</button></div></div>' +
  '<div class="gs-color-selector"><div class="flex"><button class="gs-color-option">ბეჟი</button></div></div>' +
  '</div></div></div><div class="gs-product-modal-purchase-bar">' +
  '<button class="gs-modal-add-to-cart"><span>🛍</span>' +
  '<span class="gs-modal-add-label">კალათაში დამატება · M / ბეჟი</span>' +
  '<span class="gs-modal-add-price">199.00 ₾</span></button></div></div></div>';

const cartFixture =
  '<div class="gs-cart-page gs-cart-layout"><div class="gs-cart-content-grid grid grid-cols-1 lg:grid-cols-3">' +
  '<div class="gs-cart-items-list lg:col-span-2"><div class="gs-cart-item flex items-start gap-3">' +
  '<div class="gs-cart-item-media relative flex w-20 h-20 shrink-0">სურათი</div>' +
  '<div class="min-w-0 flex-1"><h4 class="gs-cart-item-title">ქართული პროდუქტის დასახელება</h4>' +
  '<div class="gs-cart-quantity-controls flex items-center gap-2">' +
  '<button type="button" class="w-8 h-8">−</button><span>2</span><button type="button" class="w-8 h-8">+</button></div></div>' +
  '<button class="gs-cart-remove">წაშლა</button></div></div>' +
  '<div class="gs-cart-summary"><form class="gs-cart-coupon-form flex gap-2">' +
  '<input placeholder="GEOSTORE2026"><button type="submit">გამოყენება</button></form>' +
  '<div class="gs-cart-totals"><div class="flex justify-between"><span>სრული თანხა</span><span>199.00 ₾</span></div></div>' +
  '<button class="gs-cart-checkout">შეკვეთის გაფორმება</button></div></div></div>';

const checkoutFixture =
  '<div class="gs-commerce-overlay gs-commerce-overlay--checkout fixed inset-0">' +
  '<section class="gs-commerce-dialog gs-commerce-dialog--checkout gs-checkout-dialog flex w-full max-w-xl flex-col overflow-hidden">' +
  '<header class="gs-checkout-header flex items-center justify-between">' +
  '<div class="gs-checkout-heading"><h3>შეკვეთის გაფორმება</h3><p>შეავსეთ ინფორმაცია</p></div>' +
  '<button class="gs-checkout-close">×</button></header>' +
  '<form class="gs-checkout-form space-y-4 overflow-y-auto">' +
  '<div class="gs-checkout-contact-grid grid grid-cols-1 gap-4 sm:grid-cols-2">' +
  '<label><span>სრული სახელი</span><input type="text" /></label>' +
  '<label><span>ტელეფონის ნომერი</span><input type="tel" /></label></div>' +
  '<label><span>ელ-ფოსტა</span><input type="email" /></label>' +
  '<label><span>მიწოდების რეგიონი</span><select><option>თბილისი</option></select></label>' +
  '<label><span>მისამართი</span><input type="text" /></label>' +
  '<p class="gs-checkout-error" role="alert">გთხოვთ გადაამოწმოთ მონაცემები.</p>' +
  '<div class="gs-checkout-submit-area"><button type="submit">შეკვეთის დადასტურება</button></div>' +
  '</form></section></div>';

const categoryArtworkFixture = '<div class="gs-category-grid"><div class="gs-category-card">' +
  '<img class="gs-category-photo" loading="lazy" decoding="async" alt="" aria-hidden="true" ' +
  'src="data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2230%22%20height=%2230%22/%3E" />' +
  '<div><h4>ყველა კატეგორია</h4></div></div></div>';

const browser = await chromium.launch({ headless: true });
try {
  for (const width of [320, 359, 375, 430, 640, 768, 1024, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 820 } });
    try {
      await page.setContent('<!doctype html><html lang="ka"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' +
        storefront.replace('</main>', categoryArtworkFixture + productDialog + cartFixture + '</main>') + admin.replace('</div></section>', adminProductFixture + adminOrdersFixture + adminCrmFixture + adminAnalyticsFixture + '</div></section>') + checkoutFixture + '</body></html>', { waitUntil: 'domcontentloaded' });
      await page.addStyleTag({ content: css });
      const layout = await page.evaluate(() => {
        const grid = document.querySelector('.gs-catalog-product-grid');
        const links = document.querySelector('.geostore-footer-links');
        const dots = [...links.querySelectorAll('span[aria-hidden="true"]')];
        const buttons = [...links.querySelectorAll('button')];
        const sidebar = document.querySelector('.admin-dashboard-pro > div:first-child');
        const welcome = document.querySelector('[data-admin-visual-header="true"]');
        const productDialog = document.querySelector('.gs-product-dialog');
        const productBody = document.querySelector('.gs-product-modal-body');
        const purchase = document.querySelector('.gs-modal-add-to-cart');
        const productOptions = [...document.querySelectorAll('.gs-size-option, .gs-color-option')];
        const categoryImg = document.querySelector('.gs-category-card > img.gs-category-photo');
        const cartQtyButtons = [...document.querySelectorAll('.gs-cart-quantity-controls button')];
        const cartCoupon = document.querySelector('.gs-cart-coupon-form');
        const checkoutDialog = document.querySelector('.gs-checkout-dialog');
        const checkoutInput = document.querySelector('.gs-checkout-form input');
        const checkoutError = document.querySelector('.gs-checkout-error');
        const checkoutSubmit = document.querySelector('.gs-checkout-submit-area button');
        const adminProductRow = document.querySelector('.admin-product-row');
        const adminProductControls = document.querySelector('.admin-product-controls');
        const adminProductButtons = [...adminProductControls.querySelectorAll('button')];
        const adminPaginationButtons = [...document.querySelectorAll('.admin-product-pagination button')];
        const adminProductPrice = adminProductControls.querySelector('input');
        const adminOrders = document.querySelector('.admin-orders-panel');
        const orderFilterButtons = [...adminOrders.querySelectorAll('.admin-order-status-filters button')];
        const orderActionButtons = [...adminOrders.querySelectorAll('.admin-order-actions button')];
        const orderPaginationButtons = [...adminOrders.querySelectorAll('.admin-orders-pagination button')];
        const orderSearch = adminOrders.querySelector('.admin-orders-search input');
        const adminCrm = document.querySelector('.admin-crm-panel');
        const adminCrmActions = [...adminCrm.querySelectorAll('.admin-crm-user-actions button')];
        const adminCrmPagination = [...adminCrm.querySelectorAll('.admin-crm-pagination button')];
        const adminCrmSearch = adminCrm.querySelector('.admin-crm-search input');
        const adminCrmActionGrid = adminCrm.querySelector('.admin-crm-user-actions');
        const adminAnalytics = document.querySelector('.admin-analytics');
        const analyticsControls = [...adminAnalytics.querySelectorAll('.admin-analytics-actions > select, .admin-analytics-actions > button')];
        const analyticsCards = [...adminAnalytics.querySelectorAll('.admin-analytics-card')];
        const analyticsChartScroll = adminAnalytics.querySelector('.admin-analytics-trend-scroll');

        return {
          scrollWidth: document.documentElement.scrollWidth,
          width: window.innerWidth,
          gridTracks: getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
          footerDisplay: getComputedStyle(links).display,
          hiddenDots: dots.every(dot => getComputedStyle(dot).display === 'none'),
          footerMinButtonHeight: Math.min(...buttons.map(button => button.getBoundingClientRect().height)),
          sidebarPosition: getComputedStyle(sidebar).position,
          sidebarOverflowY: getComputedStyle(sidebar).overflowY,
          sidebarHeight: sidebar.getBoundingClientRect().height,
          welcomeRight: welcome.getBoundingClientRect().right,
          kpiFontSize: parseFloat(getComputedStyle(document.querySelector('.admin-command-kpi > strong')).fontSize),
          productDialogRight: productDialog.getBoundingClientRect().right,
          productBodyScrollable: ['auto', 'scroll'].includes(getComputedStyle(productBody).overflowY),
          productDialogMaxHeight: productDialog.getBoundingClientRect().height,
          purchaseRight: purchase.getBoundingClientRect().right,
          minOptionHeight: Math.min(...productOptions.map(element => element.getBoundingClientRect().height)),
          optionMetrics: productOptions.map(element => ({ type: element.className, height: element.getBoundingClientRect().height, display: getComputedStyle(element).display, minHeight: getComputedStyle(element).minHeight, minBlockSize: getComputedStyle(element).minBlockSize })),
          purchaseTextVisible: purchase.querySelector('.gs-modal-add-label').getBoundingClientRect().width > 0,
          categoryImageFit: getComputedStyle(categoryImg).objectFit,
          categoryImageLoading: categoryImg.loading,
          categoryImageWidth: categoryImg.getBoundingClientRect().width,
          categoryCardWidth: categoryImg.parentElement.getBoundingClientRect().width,
          cartQtyMinHeight: Math.min(...cartQtyButtons.map(node => node.getBoundingClientRect().height)),
          cartCouponRight: cartCoupon.getBoundingClientRect().right,
          checkoutDialogRight: checkoutDialog.getBoundingClientRect().right,
          checkoutDialogHeight: checkoutDialog.getBoundingClientRect().height,
          checkoutInputFontSize: parseFloat(getComputedStyle(checkoutInput).fontSize),
          checkoutErrorRight: checkoutError.getBoundingClientRect().right,
          checkoutSubmitHeight: checkoutSubmit.getBoundingClientRect().height,
          adminProductRowRight: adminProductRow.getBoundingClientRect().right,
          adminProductControlsRight: adminProductControls.getBoundingClientRect().right,
          adminProductButtonMinHeight: Math.min(...adminProductButtons.map(button => button.getBoundingClientRect().height)),
          adminProductPaginationMinHeight: Math.min(...adminPaginationButtons.map(button => button.getBoundingClientRect().height)),
          adminProductPriceFontSize: parseFloat(getComputedStyle(adminProductPrice).fontSize),
          adminProductColumns: getComputedStyle(adminProductControls).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
          adminOrdersRight: adminOrders.getBoundingClientRect().right,
          minOrderFilterHeight: Math.min(...orderFilterButtons.map(node => node.getBoundingClientRect().height)),
          minOrderActionHeight: Math.min(...orderActionButtons.map(node => node.getBoundingClientRect().height)),
          minOrderPaginationHeight: Math.min(...orderPaginationButtons.map(node => node.getBoundingClientRect().height)),
          orderSearchFontSize: parseFloat(getComputedStyle(orderSearch).fontSize),
          crmPanelRight: adminCrm.getBoundingClientRect().right,
          crmActionMinHeight: Math.min(...adminCrmActions.map(node => node.getBoundingClientRect().height)),
          crmPaginationMinHeight: Math.min(...adminCrmPagination.map(node => node.getBoundingClientRect().height)),
          crmSearchFontSize: parseFloat(getComputedStyle(adminCrmSearch).fontSize),
          crmActionGridColumns: getComputedStyle(adminCrmActionGrid).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
          analyticsPanelRight: adminAnalytics.getBoundingClientRect().right,
          analyticsControlMinHeight: Math.min(...analyticsControls.map(node => node.getBoundingClientRect().height)),
          analyticsCardMaxRight: Math.max(...analyticsCards.map(node => node.getBoundingClientRect().right)),
          analyticsCardCount: analyticsCards.length,
          analyticsChartRight: analyticsChartScroll.getBoundingClientRect().right,
          analyticsChartClientWidth: analyticsChartScroll.clientWidth,
          analyticsChartScrollWidth: analyticsChartScroll.scrollWidth
        };
      });
      assert.ok(layout.scrollWidth <= width + 2, width + 'px overflow ' + JSON.stringify(layout));
      assert.ok(layout.welcomeRight <= width + 2, width + 'px header overflow ' + JSON.stringify(layout));
      assert.ok(layout.productDialogRight <= width + 2, width + 'px product dialog overflow: ' + JSON.stringify(layout));
      assert.ok(layout.purchaseRight <= width + 2, width + 'px purchase CTA overflow: ' + JSON.stringify(layout));
      assert.ok(layout.productDialogMaxHeight <= 820 + 2, width + 'px product dialog height: ' + JSON.stringify(layout));
      assert.ok(layout.productBodyScrollable, width + 'px product detail content should scroll');
      assert.ok(layout.minOptionHeight >= 43, width + 'px variant controls should be accessible touch targets: ' + JSON.stringify(layout.optionMetrics));
      assert.ok(layout.purchaseTextVisible, width + 'px cart CTA label must be visible');
      assert.equal(layout.categoryImageFit, 'cover', width + 'px category crop must match the original background');
      assert.equal(layout.categoryImageLoading, 'lazy', width + 'px category artwork should load natively on demand');
      assert.ok(Math.abs(layout.categoryImageWidth - layout.categoryCardWidth) <= 2, width + 'px category image should fill its card');
      assert.ok(layout.cartQtyMinHeight >= 43, width + 'px cart quantity controls must be touch-sized: ' + JSON.stringify(layout));
      assert.ok(layout.cartCouponRight <= width + 2, width + 'px coupon form overflow: ' + JSON.stringify(layout));
      assert.ok(layout.checkoutDialogRight <= width + 2, width + 'px checkout dialog overflow: ' + JSON.stringify(layout));
      assert.ok(layout.checkoutErrorRight <= width + 2, width + 'px checkout error overflow: ' + JSON.stringify(layout));
      assert.ok(layout.checkoutDialogHeight <= 822, width + 'px checkout dialog height: ' + JSON.stringify(layout));
      assert.ok(layout.checkoutSubmitHeight >= 43, width + 'px checkout action must be touch-sized: ' + JSON.stringify(layout));
      assert.ok(layout.adminProductRowRight <= width + 2, width + 'px admin product row overflow: ' + JSON.stringify(layout));
      assert.ok(layout.adminOrdersRight <= width + 2, width + 'px admin orders overflow: ' + JSON.stringify(layout));
      assert.ok(layout.crmPanelRight <= width + 2, width + 'px CRM panel overflow: ' + JSON.stringify(layout));
      assert.ok(layout.analyticsPanelRight <= width + 2, width + 'px analytics panel overflow: ' + JSON.stringify(layout));
      assert.ok(layout.analyticsCardMaxRight <= width + 2, width + 'px analytics KPI overflow: ' + JSON.stringify(layout));
      assert.equal(layout.analyticsCardCount, 8, width + 'px all financial KPIs must remain in the DOM');
      assert.ok(layout.analyticsControlMinHeight >= 43, width + 'px analytics controls must be touch-sized: ' + JSON.stringify(layout));
      assert.ok(layout.analyticsChartRight <= width + 2, width + 'px chart scroll viewport overflow: ' + JSON.stringify(layout));
      if (width <= 768) assert.ok(layout.analyticsChartScrollWidth > layout.analyticsChartClientWidth, width + 'px dense chart should scroll inside its own viewport: ' + JSON.stringify(layout));
      assert.ok(layout.crmActionMinHeight >= 43, width + 'px CRM customer actions must be touch-sized: ' + JSON.stringify(layout));
      assert.ok(layout.crmPaginationMinHeight >= 43, width + 'px CRM pagination must be touch-sized: ' + JSON.stringify(layout));
      if (width <= 640) assert.ok(layout.crmSearchFontSize >= 16, width + 'px CRM search must avoid iOS focus zoom: ' + JSON.stringify(layout));
      if (width <= 639) assert.equal(layout.crmActionGridColumns, width <= 380 ? 1 : 2, width + 'px CRM actions should use narrow safe grid: ' + JSON.stringify(layout));
      assert.ok(layout.minOrderFilterHeight >= 43, width + 'px order filters should be touch-sized: ' + JSON.stringify(layout));
      assert.ok(layout.minOrderActionHeight >= 43, width + 'px order actions should be touch-sized: ' + JSON.stringify(layout));
      assert.ok(layout.minOrderPaginationHeight >= 43, width + 'px order pagination should be touch-sized: ' + JSON.stringify(layout));
      if (width <= 640) assert.ok(layout.orderSearchFontSize >= 16, width + 'px order search should avoid iOS zoom: ' + JSON.stringify(layout));
      assert.ok(layout.adminProductControlsRight <= width + 2, width + 'px admin product controls overflow: ' + JSON.stringify(layout));
      assert.ok(layout.adminProductButtonMinHeight >= 43, width + 'px admin product buttons must be touch-sized: ' + JSON.stringify(layout));
      assert.ok(layout.adminProductPaginationMinHeight >= 43, width + 'px product pages must be touch-sized: ' + JSON.stringify(layout));
      if (width <= 639) {
        assert.ok(layout.adminProductPriceFontSize >= 16, width + 'px admin product inputs must avoid iOS zoom: ' + JSON.stringify(layout));
        assert.equal(layout.adminProductColumns, width <= 380 ? 1 : 2, width + 'px admin product controls should respect narrow layout');
      }
      if (width <= 640) assert.ok(layout.checkoutInputFontSize >= 16, width + 'px checkout should avoid iOS zoom: ' + JSON.stringify(layout));
      assert.ok(layout.kpiFontSize >= 17 && layout.kpiFontSize <= 25,
        width + 'px compact KPI value should be 17–25px: ' + JSON.stringify(layout));
      if (width <= 359) assert.equal(layout.gridTracks, 1, width + 'px catalog');
      if (width >= 375 && width <= 640) assert.equal(layout.gridTracks, 2, width + 'px catalog');
      if (width <= 640) {
        assert.equal(layout.footerDisplay, 'flex', width + 'px footer');
        assert.ok(layout.hiddenDots, width + 'px dot separators');
        assert.ok(layout.footerMinButtonHeight >= 38, width + 'px footer touch targets');
      }
      if (width >= 1024) {
        assert.equal(layout.sidebarPosition, 'sticky', width + 'px desktop sidebar');
        assert.equal(layout.sidebarOverflowY, 'auto', width + 'px nav overflow');
        assert.ok(layout.sidebarHeight <= 820, width + 'px sidebar max height');
      }
      process.stdout.write('PASS viewport ' + width + 'px\n');
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
