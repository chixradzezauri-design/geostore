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
  '<article class="gs-catalog-product-card"><div class="gs-catalog-product-media">Image' +
  '<button type="button" class="gs-catalog-media-toggle gs-catalog-wishlist-toggle" aria-label="სურვილები: Product ' + i + '" aria-pressed="false">♡</button>' +
  '<button type="button" class="gs-catalog-media-toggle gs-catalog-comparison-toggle" aria-label="შედარება: Product ' + i + '" aria-pressed="false">⇄</button>' +
  '</div><div class="gs-catalog-product-info"><h3 class="gs-catalog-product-title"><button type="button" class="gs-catalog-product-title-action">Product ' + i + '</button></h3><button>დამატება</button></div></article>'
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
  '<div class="w-full lg:w-72 shrink-0" data-admin-sidebar="true"><div>GEOSTORE Admin</div><div id="geostore-admin-desktop-modules" class="space-y-1.5">' + nav + '</div>' +
  '<div class="admin-mobile-section-picker"><label for="fixture-mobile-admin-section">სექციაზე გადასვლა</label>' +
  '<select id="fixture-mobile-admin-section"><option>მთავარი</option><option>შეკვეთები</option></select></div></div>' +
  '<div class="flex-1 w-full"><div data-admin-visual-header="true" class="flex flex-col lg:flex-row p-5 gap-3" style="height:480px;justify-content:space-between">' +
  '<div><h2>მოგესალმებით, მთავარო ადმინისტრატორო</h2></div>' +
  '<div class="grid grid-cols-2 gap-2"><button>მონახაზის შენახვა</button><button>ცვლილებების გამოქვეყნება</button></div>' +
  '</div><div class="admin-command-hero"><h3>მთავარი მართვის ცენტრი</h3></div>' +
  '<div class="admin-command-kpis"><button class="admin-command-kpi"><span>ახალი შეკვეთები</span><strong>120</strong></button></div>' +
  '</div></section>';

const stage37ProductFiltersFixture = '<div class="admin-product-list-filters flex flex-col sm:flex-row gap-2">' +
  '<select aria-label="კატეგორია"><option>ყველა კატეგორია</option></select>' +
  '<div class="admin-product-search"><input type="search" aria-label="პროდუქტის ძებნა"></div></div>';

const adminProductFixture =
  '<section class="admin-products-panel">' + stage37ProductFiltersFixture + '<div class="admin-product-row flex flex-col sm:flex-row justify-between gap-4">' +
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
  '<div class="admin-order-status-actions flex gap-1"><button>ახალი</button><button>მუშავდება</button>' +
   '<button>გაგზავნილი</button><button>ჩაბარებული</button><button>გაუქმება</button></div></div>' +
  '</article></div>' +
  '<nav class="admin-orders-pagination" aria-label="შეკვეთების გვერდები"><div class="flex gap-2">' +
  '<button>წინა</button><button>1</button><button>შემდეგი</button></div></nav></section>';


const stage36OperationsFixture = '<section class="admin-inventory-panel">' +
  '<div class="admin-inventory-history-toolbar flex w-full flex-col sm:flex-row gap-2">' +
  '<input aria-label="მარაგის ძებნა" type="search" /><button>ფილტრი</button><button>განახლება</button></div>' +
  '<div class="admin-inventory-table-scroll overflow-x-auto" role="region" tabindex="0">' +
  '<table style="min-width:900px"><tbody><tr><td>მარაგის ცვლილება</td></tr></tbody></table></div></section>' +
  '<section class="admin-inventory-panel"><div class="admin-replenishment-row grid grid-cols-2 gap-3">' +
  '<div class="admin-replenishment-metric"><label for="fixture-threshold">დაბალი მარაგის ზღვარი</label>' +
  '<input id="fixture-threshold" type="number" value="5"></div>' +
  '<div class="admin-replenishment-metric"><label for="fixture-target">სამიზნე მარაგი</label>' +
  '<input id="fixture-target" type="number" disabled value="20"></div>' +
  '<div class="admin-replenishment-save"><button disabled>შენახვა</button></div></div></section>';


const stage37SupportFixture = '<section class="admin-support-panel">' +
  '<article class="admin-support-ticket"><div class="admin-support-ticket-header">' +
  '<div class="admin-support-ticket-controls flex flex-wrap gap-2">' +
  '<div class="admin-support-status-actions flex gap-1">' +
  '<button type="button">ღია</button><button type="button">მუშავდება</button><button type="button">მოგვარებული</button></div>' +
  '<button type="button">მიმოწერის ნახვა</button></div></div>' +
  '<div class="admin-support-reply-form flex flex-col sm:flex-row gap-3 pt-2">' +
  '<textarea class="admin-support-reply-input" rows="3" aria-label="პასუხის ტექსტი"></textarea>' +
  '<button type="button">გაგზავნა</button></div></article></section>';
const stage37CrmEditorFixture = '<div class="admin-crm-edit-panel">' +
  '<div><label for="test-crm-discount">ფასდაკლება</label>' +
  '<input id="test-crm-discount" type="number" value="10"></div>' +
  '<div><label for="test-crm-note">შენიშვნა</label>' +
  '<input id="test-crm-note" type="text" value="სატესტო"></div>' +
  '<div><button type="button">გაუქმება</button><button type="button">შენახვა</button></div></div>';
const adminCrmFixture =
  '<section class="admin-crm-panel"><div class="admin-crm-search">' +
  '<input type="text" aria-label="CRM მომხმარებლების ძებნა"></div>' +
  stage37CrmEditorFixture + '<div class="admin-crm-list"><article class="admin-crm-user-card">' +
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
  '<div role="alert" class="admin-finance-data-warning rounded-2xl border border-amber-500/30 px-4 py-3">' +
  '<strong>ხარჯების სრული ისტორია არ არის დადასტურებული</strong>' +
  '<p>წმინდა მოგება და ხარჯები ვერ განისაზღვრება.</p>' +
  '<button type="button" class="admin-finance-retry">ხარჯების ისტორიის განახლება</button></div>' +
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

const adminFinancialDetailsFixture =
  '<div class="grid grid-cols-1 xl:grid-cols-2 gap-5">' +
  '<div class="admin-finance-sources-panel p-5"><div class="flex items-center justify-between gap-3"><h3>შემოსავლის წყაროები</h3>' +
  '<span>პროდუქტი, დამატებითი მომსახურება და მიწოდება</span></div>' +
  '<div class="admin-finance-breakdown-row flex justify-between gap-3"><span>პროდუქტის შემოსავალი გრძელი დასახელებით</span><b class="whitespace-nowrap">123456789012.34 ₾</b></div></div>' +
  '<div class="admin-finance-expenses-panel p-5"><div class="flex items-center justify-between gap-3"><h3>ხარჯების კატეგორიები</h3>' +
  '<span>ჩანაწერები: 120</span></div>' +
  '<div class="admin-finance-breakdown-row flex justify-between gap-3"><span>სარეკლამო კამპანიის გრძელიდასახელებისხარჯისკატეგორია (120 ჩანაწერი)</span><b class="whitespace-nowrap">876543210987.65 ₾</b></div>' +
  '<div class="admin-finance-recent-list"><div class="admin-finance-recent-row flex justify-between gap-3"><span>2026-11-20 · სარეკლამო კამპანია და გრძელი ხარჯის აღწერა</span><b class="whitespace-nowrap">-123456789.00 ₾</b></div></div></div>' +
  '</div><div class="grid grid-cols-1 xl:grid-cols-2 gap-5">' +
  '<div class="admin-finance-products-panel p-5"><div class="flex items-center justify-between gap-3"><h3>პროდუქტების მომგებიანობა</h3><span>არჩეული პერიოდი</span></div>' +
  '<article class="admin-profitability-row"><div class="admin-profitability-heading flex justify-between gap-3"><b>გრძელიდასახელებისპროდუქტისსატესტოდატა</b><span>120 ც.</span></div>' +
  '<p>მომწოდებელი · კატეგორია</p><div class="admin-profitability-metrics flex flex-wrap justify-between gap-2">' +
  '<span>შემოსავალი: 123456789012.34 ₾</span><span>თვითღირებულება: არასრულია</span></div>' +
  '<div class="admin-profitability-results flex justify-between gap-2"><b>მოგება: —</b><span>მარჟა: —</span></div>' +
  '<p>თვითღირებულება აკლია 6 ერთეულს.</p></article></div>' +
  '<div class="admin-finance-vendors-panel p-5"><div class="flex items-center justify-between gap-3"><h3>მომწოდებლების მომგებიანობა</h3><span>პროდუქტები და გაყიდვები</span></div>' +
  '<article class="admin-profitability-row"><div class="admin-profitability-heading flex justify-between gap-3"><b>ძალიანგრძელიმომწოდებლისდასახელება</b><span>12 პროდუქტი · 120 ც.</span></div>' +
  '<div class="admin-profitability-metrics flex flex-wrap justify-between gap-2">' +
  '<span>შემოსავალი: 123456789012.34 ₾</span><span>თვითღირებულება: შეფასებულია</span></div>' +
  '<div class="admin-profitability-results flex justify-between gap-2"><b>მოგება: 9876.54 ₾</b><span>მარჟა: 8.1%</span></div>' +
  '<p>მიმდინარე ფასით შეფასებულია 3 ერთეული; მოგება დადასტურებული არ არის.</p></article></div></div>';

const adminExpenseHistoryFixture =
  '<section class="admin-expense-history-panel p-6">' +
  '<p class="admin-expense-mutation-notice" role="alert">წაშლის დასტური არ დაბრუნდა — გადაამოწმეთ ისტორია, სანამ ისევ ცდით. გრძელიშეცდომისმონაცემებიდამატებითტექსტით</p>' +
  '<div class="admin-expense-history-heading flex flex-wrap items-center justify-between gap-3">' +
  '<div><h3 id="fixture-expense-history-title">ხარჯების ისტორია (120)</h3><p>ძებნა მხოლოდ სიას ცვლის</p></div>' +
  '<button class="admin-expense-refresh" type="button" aria-busy="true">ახლდება… ხელახლა შემოწმება</button></div>' +
  '<p class="admin-expense-sync-state" role="status" aria-live="polite">' +
  'მიმდინარეობს სრული ისტორიის შემოწმება… ბოლო წარმატებული შემოწმება: ' +
  '<time datetime="2026-11-20T15:40:00.000Z">20 ნოემბერი 2026, 19:40</time>' +
  '<span class="block">ნაჩვენები ძველი ჩანაწერები დროებით დაუდასტურებელია.</span></p>' +
  '<div class="admin-expense-load-error" role="alert"><span>ისტორია ვერ განახლდა.</span>' +
  '<button type="button" class="admin-expense-error-retry" aria-busy="true">ხელახლა ცდა</button></div>' +
  '<div class="admin-expense-history-filters grid grid-cols-1 sm:grid-cols-2 gap-2" role="search">' +
  '<div><label for="fixture-expense-history-search">მოძებნე ხარჯი</label>' +
  '<input id="fixture-expense-history-search" type="search" placeholder="აღწერა, კატეგორია, თარიღი ან თანხა"></div>' +
  '<div><label for="fixture-expense-history-category">კატეგორიის ფილტრი</label>' +
  '<select id="fixture-expense-history-category"><option>ყველა კატეგორია</option></select></div></div>' +
  '<p role="status">ნაპოვნია 120 / 120 ჩანაწერი</p>' +
  '<div class="admin-expense-history-list">' +
  Array.from({ length: 10 }, (_, i) =>
    '<article class="admin-expense-row"><div class="admin-expense-details">' +
    '<div class="admin-expense-heading"><b class="admin-expense-description">გრძელიდასახელებისსარეკლამოხარჯი' + i + '</b>' +
    '<span class="admin-expense-category">(რეკლამა &amp; მარკეტინგი)</span></div>' +
    '<span class="admin-expense-date">2026-11-20</span></div>' +
    '<div class="admin-expense-actions flex items-center gap-3">' +
    '<span class="admin-expense-amount whitespace-nowrap">-123456789012.34 ₾</span>' +
    '<button type="button" class="admin-expense-delete" disabled>წაშლა</button></div></article>'
  ).join('') + '</div>' +
  '<nav class="admin-expense-pagination flex flex-wrap items-center justify-between gap-3">' +
  '<p>ნაჩვენებია 1–10 / 120</p>' +
  '<div class="admin-expense-pagination-controls flex flex-wrap items-center gap-1.5">' +
  '<button type="button">წინა</button><button type="button">1</button>' +
  '<button type="button">2</button><button type="button">შემდეგი</button></div></nav></section>';

const adminFinanceFormsFixture =
  '<section class="admin-profit-calculator">' +
  '<div class="admin-calculator-layout grid grid-cols-1 lg:grid-cols-2 gap-6">' +
  '<div class="admin-calculator-fields space-y-4">' +
  Array.from({ length: 2 }, (_, k) =>
    '<div class="admin-calculator-field-grid grid grid-cols-2 gap-3">' +
    Array.from({ length: 2 }, (_, j) =>
      '<div><label for="fixture-calc-' + (k * 2 + j) + '">ფინანსური კალკულატორის ველი ' + (k * 2 + j) + '</label>' +
      '<input id="fixture-calc-' + (k * 2 + j) + '" type="number" value="100.50" /></div>'
    ).join('') + '</div>'
  ).join('') +
  '<section class="admin-calculator-extra-fields space-y-3">' +
  '<h4>დამატებითი ხარჯები და რაოდენობა</h4>' +
  Array.from({ length: 2 }, (_, k) =>
    '<div class="admin-calculator-field-grid grid grid-cols-2 gap-3">' +
    Array.from({ length: 2 }, (_, j) =>
      '<div><label for="fixture-calc-extra-' + (k * 2 + j) + '">შეფუთვა, დამუშავება, სხვა ხარჯი ან რაოდენობა ' + (k * 2 + j) + '</label>' +
      '<input id="fixture-calc-extra-' + (k * 2 + j) + '" type="number" value="2" /></div>'
    ).join('') + '</div>'
  ).join('') + '</section>' +
  '</div><div class="admin-calculator-results"><h4>გამოთვლილი მონაცემები</h4>' +
  '<div class="flex justify-between"><span>ჯამური შემოსავალი:</span><b>123456789.00 ₾</b></div>' +
  '<div class="flex justify-between"><span>წმინდა მოგება:</span><b>987654321.00 ₾</b></div></div></div></section>' +
  '<section class="admin-expenses"><div class="admin-staff-panel p-6">' +
  '<form class="admin-expense-form space-y-4">' +
  '<div class="admin-expense-fields grid grid-cols-1 sm:grid-cols-3 gap-3">' +
  '<div class="admin-expense-field"><label for="fixture-expense-category">კატეგორია</label>' +
  '<select id="fixture-expense-category"><option>რეკლამა &amp; მარკეტინგი</option></select></div>' +
  '<div class="admin-expense-field"><label for="fixture-expense-amount">თანხა (₾)</label>' +
  '<input id="fixture-expense-amount" type="number" min="0.01" max="1000000000" step="0.01" value="150.00"></div>' +
  '<div class="admin-expense-field"><label for="fixture-expense-date">თარიღი</label>' +
  '<input id="fixture-expense-date" type="date" value="2026-11-20"></div></div>' +
  '<div class="admin-expense-field"><label for="fixture-expense-description">ხარჯის აღწერა</label>' +
  '<input id="fixture-expense-description" type="text" value="სარეკლამო კამპანია"></div>' +
  '<button class="admin-expense-submit" type="submit" disabled>ხარჯის შენახვა მოწმდება…</button>' +
  '</form>' +
  '<p class="admin-expense-mutation-notice" role="alert">ხარჯის დადასტურება ვერ მოხერხდა. სერვერის პასუხი არ არის დადასტურებული.</p>' +
  '</div>' + adminExpenseHistoryFixture + '</section>';

const productDialog = '<div class="gs-product-modal fixed inset-0">' +
  '<div class="gs-product-dialog" role="dialog" aria-modal="true" aria-labelledby="fixture-product-heading">' +
  '<div class="gs-product-modal-header"><span id="fixture-product-heading">პროდუქტის დეტალური ხედი</span>' +
  '<button class="gs-product-modal-close" aria-label="დახურვა">×</button></div>' +
  '<div class="gs-product-modal-body"><div class="grid">' +
  '<div class="gs-product-gallery"><div class="gs-product-detail-image-stage">სურათი</div>' +
  '<div class="gs-product-gallery-thumbnails"><button class="gs-product-gallery-thumb">1</button></div>' +
  '<div class="gs-product-gallery-toolbar" role="group" aria-label="გალერეის მართვა">' +
  '<span class="gs-product-gallery-counter" role="status">1 / 2</span>' +
  '<div><button class="gs-product-gallery-step" type="button" aria-label="წინა ფოტო">‹</button>' +
  '<button class="gs-product-gallery-step" type="button" aria-label="შემდეგი ფოტო">›</button></div></div></div>' +
  '<div class="gs-product-detail-info"><div class="gs-size-selector">' +
  '<div class="flex"><span>აირჩიეთ ზომა</span><button>ზომების გიდი</button></div>' +
  '<div class="gs-size-options-grid">' +
  '<button class="gs-size-option">M</button><button class="gs-size-option">L</button></div></div>' +
  '<div class="gs-color-selector"><div class="flex"><button class="gs-color-option">ბეჟი</button></div></div>' +
  '</div><section class="gs-product-description-panel" aria-label="პროდუქტის აღწერა"><p class="gs-product-description-copy">გრძელიდასახელებისსაკომპოზიციომასალა012345678901234567890 გრძელი აღწერა</p></section>' +
  '<div class="gs-product-detail-specs"><div><b>გრძელიმასალისსახელიABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789</b></div></div>' +
  '<section class="gs-product-reviews" aria-labelledby="fixture-review-title"><h3 id="fixture-review-title">შეფასებები</h3>' +
  '<details class="gs-product-review-entry"><summary class="gs-product-review-entry-toggle"><span>დატოვეთ შეფასება და ატვირთეთ ფოტო</span></summary>' +
  '<form class="gs-product-review-form"><div class="gs-product-review-rating"><label for="fixture-rating">შეფასება</label>' +
  '<select id="fixture-rating" class="gs-product-review-rating-select"><option>5</option></select></div>' +
  '<input class="gs-product-review-field" aria-label="თქვენი სახელი" type="text" placeholder="სახელი">' +
  '<textarea class="gs-product-review-field gs-product-review-comment" aria-label="კომენტარი"></textarea>' +
  '<div class="gs-product-review-upload"><label>ფოტოს ატვირთვა<input type="file" class="gs-product-review-file-input sr-only"></label></div>' +
  '<button class="gs-product-review-submit" type="submit">გამოქვეყნება</button></form></details>' +
  '<div class="gs-product-review-list"><article class="gs-product-review-card"><b class="gs-product-review-author">გრძელისახელითტექსტი0123456789</b><p class="gs-product-review-comment-text">ძალიანგრძელიშეფასებისტექსტი12345678901234567890123456789</p></article></div></section>' +
  '</div></div></div><div class="gs-product-modal-purchase-bar">' +
  '<p class="gs-product-purchase-hint" id="gs-product-purchase-hint" role="status">მარაგში არ არის</p>' +
  '<button class="gs-modal-add-to-cart" aria-describedby="gs-product-purchase-hint" disabled><span>🛍</span>' +
  '<span class="gs-modal-add-label">კალათაში დამატება · M / ბეჟი</span>' +
  '<span class="gs-modal-add-price">199.00 ₾</span></button></div></div></div>';

const cartFixture =
  '<div class="gs-cart-page gs-cart-layout"><div class="gs-cart-content-grid grid grid-cols-1 lg:grid-cols-3">' +
  '<div class="gs-cart-items-list lg:col-span-2"><div class="gs-cart-item flex items-start gap-3">' +
  '<div class="gs-cart-item-media relative flex w-20 h-20 shrink-0">სურათი</div>' +
  '<div class="min-w-0 flex-1"><h4 class="gs-cart-item-title">ქართული პროდუქტის დასახელება</h4>' +
  '<div class="gs-cart-quantity-controls flex items-center gap-2" role="group" aria-label="რაოდენობა: სატესტო პროდუქტი">' +
  '<button type="button" class="w-8 h-8" aria-label="რაოდენობის შემცირება: სატესტო პროდუქტი">−</button><span aria-live="polite">2</span><button type="button" class="w-8 h-8" aria-label="რაოდენობის გაზრდა: სატესტო პროდუქტი">+</button></div></div>' +
  '<button class="gs-cart-remove">წაშლა</button></div></div>' +
  '<div class="gs-cart-summary"><label>მიწოდების რეგიონი<select aria-label="მიწოდების რეგიონი"><option>თბილისი</option></select></label><form class="gs-cart-coupon-form flex gap-2">' +
  '<input placeholder="პრომოკოდი"><button type="submit">გამოყენება</button></form>' +
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
  '<p class="gs-checkout-error" role="alert" tabindex="-1">გთხოვთ გადაამოწმოთ მონაცემები.</p>' +
  '<div class="gs-checkout-submit-area"><button type="submit">შეკვეთის დადასტურება</button></div>' +
  '</form></section></div>';

const categoryArtworkFixture = '<div class="gs-category-grid"><div class="gs-category-card">' +
  '<img class="gs-category-photo" loading="lazy" decoding="async" alt="" aria-hidden="true" ' +
  'src="data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2230%22%20height=%2230%22/%3E" />' +
  '<div><h4>ყველა კატეგორია</h4></div></div></div>';


const stage43Fixture = '<section class="geostore-fashion-store"><div class="gs-wishlist-page"><div class="gs-wishlist-grid">' +
  '<div class="gs-wishlist-card gs-wishlist-card--actions"><div class="gs-wishlist-main flex items-center gap-3.5 min-w-0">' +
  '<div class="gs-wishlist-image">image</div><div class="gs-wishlist-meta min-w-0">' +
  '<h3 class="gs-wishlist-product-title"><button type="button" class="gs-wishlist-detail-link" aria-label="დეტალურად ნახვა">გრძელისასურველინივთისდასახელება0000000</button></h3></div></div>' +
  '<div class="gs-wishlist-actions flex flex-wrap gap-2"><button class="gs-wishlist-add">აირჩიეთ ვარიანტი</button>' +
  '<button class="gs-wishlist-remove" aria-label="წაშლა">×</button></div></div></div></div></section>' +
  '<div class="gs-product-compare-overlay fixed inset-0"><div class="gs-product-compare-dialog" role="dialog" aria-modal="true">' +
  '<div class="gs-product-compare-header flex justify-between"><div><h2>შედარება</h2></div>' +
  '<button class="gs-product-compare-clear">გასუფთავება</button><button class="gs-product-compare-close">×</button></div>' +
  '<div class="gs-product-compare-scroll overflow-x-auto" tabindex="0" role="region">' +
  '<div class="gs-product-compare-grid grid grid-flow-col auto-cols-[minmax(260px,1fr)] gap-6">' +
  Array.from({length:4}, (_,i) => '<article class="gs-product-compare-card"><button class="gs-product-compare-remove" aria-label="წაშლა ' + i + '">×</button>' +
    '<h3 class="gs-product-compare-heading"><button class="gs-product-compare-detail-link" type="button" aria-label="დეტალურად ნახვა: პროდუქტი ' + i + '">პროდუქტი ' + i + '</button></h3>' +
    '<div class="gs-product-compare-specs">გრძელიმახასიათებელი012345678901234567890</div>' +
    '<button class="gs-product-compare-action">კალათაში</button></article>').join('') +
  '</div></div></div></div>';

const browser = await chromium.launch({ headless: true });
try {
  for (const width of [320, 359, 375, 430, 640, 768, 1024, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 820 } });
    try {
      await page.setContent('<!doctype html><html lang="ka"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' +
        storefront.replace('</main>', categoryArtworkFixture + productDialog + cartFixture + '</main>') + admin.replace('</div></section>', adminProductFixture + adminOrdersFixture + stage36OperationsFixture + stage37SupportFixture + adminCrmFixture + adminAnalyticsFixture.replace('</section>', adminFinancialDetailsFixture + '</section>') + adminFinanceFormsFixture + '</div></section>') + checkoutFixture + '</body></html>', { waitUntil: 'domcontentloaded' });
      await page.addStyleTag({ content: css });
      const layout = await page.evaluate(() => {
        const grid = document.querySelector('.gs-catalog-product-grid');
        const catalogActions = [...document.querySelectorAll('.gs-catalog-product-media > button.gs-catalog-media-toggle')];
        const catalogTitleActions = [...document.querySelectorAll('.gs-catalog-product-title-action')];
        const links = document.querySelector('.geostore-footer-links');
        const dots = [...links.querySelectorAll('span[aria-hidden="true"]')];
        const buttons = [...links.querySelectorAll('button')];
        const sidebar = document.querySelector('.admin-dashboard-pro > div:first-child');
        const welcome = document.querySelector('[data-admin-visual-header="true"]');
        const productDialog = document.querySelector('.gs-product-dialog');
        const productBody = document.querySelector('.gs-product-modal-body');
        const purchase = document.querySelector('.gs-modal-add-to-cart');
        const productOptions = [...document.querySelectorAll('.gs-size-option, .gs-color-option')];
        const gallerySteps = [...document.querySelectorAll('.gs-product-gallery-step')];
        const purchaseHint = document.querySelector('.gs-product-purchase-hint');
        const reviewDetails = document.querySelector('.gs-product-review-entry');
        const reviewSummary = document.querySelector('.gs-product-review-entry-toggle');
        const reviewForm = document.querySelector('.gs-product-review-form');
        const reviewRating = document.querySelector('.gs-product-review-rating-select');
        const reviewField = document.querySelector('.gs-product-review-field');
        const description = document.querySelector('.gs-product-description-panel');
        const specification = document.querySelector('.gs-product-detail-specs');
        const categoryImg = document.querySelector('.gs-category-card > img.gs-category-photo');
        const cartQtyButtons = [...document.querySelectorAll('.gs-cart-quantity-controls button')];
        const cartCoupon = document.querySelector('.gs-cart-coupon-form');
        const checkoutDialog = document.querySelector('.gs-checkout-dialog');
        const checkoutInput = document.querySelector('.gs-checkout-form input');
        const checkoutError = document.querySelector('.gs-checkout-error');
        const checkoutSubmit = document.querySelector('.gs-checkout-submit-area button');
        const checkoutSubmitArea = document.querySelector('.gs-checkout-submit-area');
        const cartCouponInput = document.querySelector('.gs-cart-coupon-form input');
        const cartRegionSelect = document.querySelector('.gs-cart-summary select');
        const cartQtyGroup = document.querySelector('.gs-cart-quantity-controls');
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
        const orderActionsGroup = adminOrders.querySelector('.admin-order-actions');
        const orderStatusActions = adminOrders.querySelector('.admin-order-status-actions');
        const inventoryBar = document.querySelector('.admin-inventory-history-toolbar');
        const inventorySearch = inventoryBar.querySelector('input');
        const inventoryButtons = [...inventoryBar.querySelectorAll('button')];
        const inventoryScroll = document.querySelector('.admin-inventory-table-scroll');
        const replenishmentRow = document.querySelector('.admin-replenishment-row');
        const replenishmentInputs = [...replenishmentRow.querySelectorAll('input[type="number"]')];
        const support = document.querySelector('.admin-support-panel');
        const supportControls = support.querySelector('.admin-support-ticket-controls');
        const supportStatusButtons = [...support.querySelectorAll('.admin-support-status-actions button')];
        const supportStatusGroup = support.querySelector('.admin-support-status-actions');
        const supportTextarea = support.querySelector('.admin-support-reply-input');
        const supportSend = support.querySelector('.admin-support-reply-form button');
        const crmEditor = document.querySelector('.admin-crm-edit-panel');
        const crmEditorInputs = [...crmEditor.querySelectorAll('input')];
        const productFilters = document.querySelector('.admin-product-list-filters');
        const productFilterInputs = [...productFilters.querySelectorAll('input, select')];
        const adminCrm = document.querySelector('.admin-crm-panel');
        const adminCrmActions = [...adminCrm.querySelectorAll('.admin-crm-user-actions button')];
        const adminCrmPagination = [...adminCrm.querySelectorAll('.admin-crm-pagination button')];
        const adminCrmSearch = adminCrm.querySelector('.admin-crm-search input');
        const adminCrmActionGrid = adminCrm.querySelector('.admin-crm-user-actions');
        const adminAnalytics = document.querySelector('.admin-analytics');
        const analyticsControls = [...adminAnalytics.querySelectorAll('.admin-analytics-actions > select, .admin-analytics-actions > button')];
        const analyticsCards = [...adminAnalytics.querySelectorAll('.admin-analytics-card')];
        const analyticsChartScroll = adminAnalytics.querySelector('.admin-analytics-trend-scroll');
        const financeWarning = adminAnalytics.querySelector('.admin-finance-data-warning');
        const financeWarningButton = financeWarning.querySelector('.admin-finance-retry');
        const financialPanels = [...adminAnalytics.querySelectorAll('.admin-finance-sources-panel, .admin-finance-expenses-panel, .admin-finance-products-panel, .admin-finance-vendors-panel')];
        const financialRows = [...adminAnalytics.querySelectorAll('.admin-finance-breakdown-row, .admin-finance-recent-row, .admin-profitability-heading, .admin-profitability-metrics, .admin-profitability-results')];
        const financeBreakdown = adminAnalytics.querySelector('.admin-finance-breakdown-row');
        const financeProfitabilityHeading = adminAnalytics.querySelector('.admin-profitability-heading');
        const expenseForm = document.querySelector('.admin-expense-form');
        const expenseInputs = [...expenseForm.querySelectorAll('input, select')];
        const expenseSubmit = expenseForm.querySelector('.admin-expense-submit');
        const expenseGrid = expenseForm.querySelector('.admin-expense-fields');
        const calcFields = document.querySelector('.admin-calculator-fields');
        const calcInputs = [...calcFields.querySelectorAll('input')];
        const calcGrid = calcFields.querySelector('.admin-calculator-field-grid');
        const calcResults = document.querySelector('.admin-calculator-results');
        const calcExtra = document.querySelector('.admin-calculator-extra-fields');
        const calcExtraInputs = [...calcExtra.querySelectorAll('input')];
        const calcExtraLabels = [...calcExtra.querySelectorAll('label')];
        const expenseHistoryPanel = document.querySelector('.admin-expense-history-panel');
        const expenseHistoryFilters = expenseHistoryPanel.querySelector('.admin-expense-history-filters');
        const expenseHistoryInputs = [...expenseHistoryFilters.querySelectorAll('input, select')];
        const expenseHistoryButtons = [...expenseHistoryPanel.querySelectorAll('.admin-expense-pagination button, .admin-expense-refresh')];
        const expenseHistoryCards = [...expenseHistoryPanel.querySelectorAll('.admin-expense-row')];
        const expenseSyncNotice = expenseHistoryPanel.querySelector('.admin-expense-sync-state');
        const expenseRetry = expenseHistoryPanel.querySelector('.admin-expense-error-retry');
        const mutationNotices = [...document.querySelectorAll('.admin-expense-mutation-notice')];
        const expenseDeleteButtons = [...expenseHistoryPanel.querySelectorAll('.admin-expense-delete')];

        return {
          scrollWidth: document.documentElement.scrollWidth,
          width: window.innerWidth,
          gridTracks: getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
          catalogActionsCount: catalogActions.length,
          catalogActionMinSize: Math.min(...catalogActions.map(el => Math.min(el.getBoundingClientRect().height, el.getBoundingClientRect().width))),
          catalogActionMaxRight: Math.max(...catalogActions.map(el => el.getBoundingClientRect().right)),
          catalogActionsNamed: catalogActions.every(el => Boolean(el.getAttribute('aria-label')) && el.hasAttribute('aria-pressed')),
          catalogTitleActionCount: catalogTitleActions.length,
          footerDisplay: getComputedStyle(links).display,
          hiddenDots: dots.every(dot => getComputedStyle(dot).display === 'none'),
          footerMinButtonHeight: Math.min(...buttons.map(button => button.getBoundingClientRect().height)),
          sidebarPosition: getComputedStyle(sidebar).position,
          sidebarOverflowY: getComputedStyle(sidebar).overflowY,
          sidebarHeight: sidebar.getBoundingClientRect().height,
          welcomeRight: welcome.getBoundingClientRect().right,
          welcomeHeight: welcome.getBoundingClientRect().height,
          mobilePickerDisplay: getComputedStyle(document.querySelector('.admin-mobile-section-picker')).display,
          mobilePickerHeight: document.querySelector('.admin-mobile-section-picker select').getBoundingClientRect().height,
          mobilePickerFontSize: parseFloat(getComputedStyle(document.querySelector('.admin-mobile-section-picker select')).fontSize),
          navRailDisplay: getComputedStyle(document.querySelector('[data-admin-sidebar="true"] > div:nth-child(2)')).display,
          kpiFontSize: parseFloat(getComputedStyle(document.querySelector('.admin-command-kpi > strong')).fontSize),
          productDialogRight: productDialog.getBoundingClientRect().right,
          productBodyScrollable: ['auto', 'scroll'].includes(getComputedStyle(productBody).overflowY),
          productDialogMaxHeight: productDialog.getBoundingClientRect().height,
          purchaseRight: purchase.getBoundingClientRect().right,
          minOptionHeight: Math.min(...productOptions.map(element => element.getBoundingClientRect().height)),
          galleryStepMinHeight: Math.min(...gallerySteps.map(element => element.getBoundingClientRect().height)),
          galleryStepRight: Math.max(...gallerySteps.map(element => element.getBoundingClientRect().right)),
          galleryStepsNamed: gallerySteps.length === 2 && gallerySteps.every(element => Boolean(element.getAttribute('aria-label'))),
          purchaseHintVisible: purchaseHint.getBoundingClientRect().height > 0,
          purchaseGuardDescribed: purchase.getAttribute('aria-describedby') === purchaseHint.id && purchase.disabled,
          reviewCollapsedInitially: !reviewDetails.open && reviewForm.getClientRects().length === 0,
          reviewSummaryHeight: reviewSummary.getBoundingClientRect().height,
          reviewSummaryRight: reviewSummary.getBoundingClientRect().right,
          descriptionRight: description.getBoundingClientRect().right,
          specificationRight: specification.getBoundingClientRect().right,
          reviewFieldNamed: Boolean(reviewField.getAttribute('aria-label')),
          reviewRatingNamed: Boolean(document.querySelector('label[for="fixture-rating"]')),
          optionMetrics: productOptions.map(element => ({ type: element.className, height: element.getBoundingClientRect().height, display: getComputedStyle(element).display, minHeight: getComputedStyle(element).minHeight, minBlockSize: getComputedStyle(element).minBlockSize })),
          purchaseTextVisible: purchase.querySelector('.gs-modal-add-label').getBoundingClientRect().width > 0,
          categoryImageFit: getComputedStyle(categoryImg).objectFit,
          categoryImageLoading: categoryImg.loading,
          // Stage53: compare layout widths, not transformed visual bounds.
          // Category images intentionally zoom on :hover (up to 1.035x);
          // getBoundingClientRect() includes that transient transform and
          // caused a false failure at the 1440px viewport.
          categoryImageWidth: categoryImg.offsetWidth,
          categoryCardWidth: categoryImg.parentElement.offsetWidth,
          cartQtyMinHeight: Math.min(...cartQtyButtons.map(node => node.getBoundingClientRect().height)),
          cartCouponRight: cartCoupon.getBoundingClientRect().right,
          checkoutDialogRight: checkoutDialog.getBoundingClientRect().right,
          checkoutDialogHeight: checkoutDialog.getBoundingClientRect().height,
          checkoutInputFontSize: parseFloat(getComputedStyle(checkoutInput).fontSize),
          checkoutErrorRight: checkoutError.getBoundingClientRect().right,
          checkoutSubmitHeight: checkoutSubmit.getBoundingClientRect().height,
          checkoutSubmitPosition: getComputedStyle(checkoutSubmitArea).position,
          checkoutErrorFocusable: checkoutError.tabIndex === -1,
          cartCouponPlaceholder: cartCouponInput.placeholder,
          cartQuantityGroupNamed: cartQtyGroup.getAttribute('role') === 'group' && Boolean(cartQtyGroup.getAttribute('aria-label')),
          cartQuantityButtonsNamed: cartQtyButtons.every(button => button.getAttribute('aria-label')?.includes('სატესტო პროდუქტი')),
          cartCouponFont: parseFloat(getComputedStyle(cartCouponInput).fontSize),
          cartRegionFont: parseFloat(getComputedStyle(cartRegionSelect).fontSize),
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
          orderActionsColumns: getComputedStyle(orderActionsGroup).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
          orderStatusesColumns: getComputedStyle(orderStatusActions).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
          inventoryToolbarColumns: getComputedStyle(inventoryBar).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
          inventorySearchFont: parseFloat(getComputedStyle(inventorySearch).fontSize),
          inventorySearchRight: inventorySearch.getBoundingClientRect().right,
          inventoryButtonMinHeight: Math.min(...inventoryButtons.map(button => button.getBoundingClientRect().height)),
          inventoryScrollFocusable: inventoryScroll.tabIndex === 0,
          inventoryScrollInner: inventoryScroll.scrollWidth > inventoryScroll.clientWidth,
          replenishmentInputMinFont: Math.min(...replenishmentInputs.map(input => parseFloat(getComputedStyle(input).fontSize))),
          replenishmentInputMinHeight: Math.min(...replenishmentInputs.map(input => input.getBoundingClientRect().height)),
          replenishmentRight: replenishmentRow.getBoundingClientRect().right,
          replenishmentDisabledPreserved: replenishmentInputs[1].disabled,
          financePeriodFont: parseFloat(getComputedStyle(adminAnalytics.querySelector('.admin-analytics-actions select')).fontSize),
          supportRight: support.getBoundingClientRect().right,
          supportStatusColumns: getComputedStyle(supportStatusGroup).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
          supportControlsColumns: getComputedStyle(supportControls).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
          supportStatusButtonMinHeight: Math.min(...supportStatusButtons.map(el => el.getBoundingClientRect().height)),
          supportReplyFont: parseFloat(getComputedStyle(supportTextarea).fontSize),
          supportReplyHeight: supportTextarea.getBoundingClientRect().height,
          supportReplyRight: supportTextarea.getBoundingClientRect().right,
          supportSendHeight: supportSend.getBoundingClientRect().height,
          crmEditInputFont: Math.min(...crmEditorInputs.map(el => parseFloat(getComputedStyle(el).fontSize))),
          crmEditInputMinHeight: Math.min(...crmEditorInputs.map(el => el.getBoundingClientRect().height)),
          crmEditLabelsLinked: crmEditorInputs.every(input => crmEditor.querySelector('label[for="' + input.id + '"]')),
          productFilterMinFont: Math.min(...productFilterInputs.map(el => parseFloat(getComputedStyle(el).fontSize))),
          productFilterMinHeight: Math.min(...productFilterInputs.map(el => el.getBoundingClientRect().height)),
          productFilterRight: productFilters.getBoundingClientRect().right,
          crmPanelRight: adminCrm.getBoundingClientRect().right,
          crmActionMinHeight: Math.min(...adminCrmActions.map(node => node.getBoundingClientRect().height)),
          crmPaginationMinHeight: Math.min(...adminCrmPagination.map(node => node.getBoundingClientRect().height)),
          crmSearchFontSize: parseFloat(getComputedStyle(adminCrmSearch).fontSize),
          crmActionGridColumns: getComputedStyle(adminCrmActionGrid).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
          analyticsPanelRight: adminAnalytics.getBoundingClientRect().right,
          financeWarningRight: financeWarning.getBoundingClientRect().right,
          financeWarningButtonHeight: financeWarningButton.getBoundingClientRect().height,
          financeWarningButtonRight: financeWarningButton.getBoundingClientRect().right,
          analyticsControlMinHeight: Math.min(...analyticsControls.map(node => node.getBoundingClientRect().height)),
          analyticsCardMaxRight: Math.max(...analyticsCards.map(node => node.getBoundingClientRect().right)),
          analyticsCardCount: analyticsCards.length,
          analyticsChartRight: analyticsChartScroll.getBoundingClientRect().right,
          analyticsChartClientWidth: analyticsChartScroll.clientWidth,
          analyticsChartScrollWidth: analyticsChartScroll.scrollWidth,
          financePanelCount: financialPanels.length,
          financePanelMaxRight: Math.max(...financialPanels.map(node => node.getBoundingClientRect().right)),
          financeRowMaxRight: Math.max(...financialRows.map(node => node.getBoundingClientRect().right)),
          financeBreakdownColumnCount: getComputedStyle(financeBreakdown).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
          financeProfitabilityColumnCount: getComputedStyle(financeProfitabilityHeading).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
          financeBreakdownAmountWrap: getComputedStyle(financeBreakdown.lastElementChild).whiteSpace,
          expenseFormRight: expenseForm.getBoundingClientRect().right,
          expenseFormMinInputHeight: Math.min(...expenseInputs.map(node => node.getBoundingClientRect().height)),
          expenseFormMinInputFontSize: Math.min(...expenseInputs.map(node => parseFloat(getComputedStyle(node).fontSize))),
          expenseSubmitHeight: expenseSubmit.getBoundingClientRect().height,
          expenseFormColumns: getComputedStyle(expenseGrid).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
          calculatorRight: calcFields.getBoundingClientRect().right,
          calculatorMinInputHeight: Math.min(...calcInputs.map(node => node.getBoundingClientRect().height)),
          calculatorMinInputFontSize: Math.min(...calcInputs.map(node => parseFloat(getComputedStyle(node).fontSize))),
          calculatorColumns: getComputedStyle(calcGrid).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
          calculatorResultsRight: calcResults.getBoundingClientRect().right,
          calculatorInputCount: calcInputs.length,
          calculatorExtraCount: calcExtraInputs.length,
          calculatorExtraLabelCount: calcExtraLabels.length,
          calculatorExtraRight: calcExtra.getBoundingClientRect().right,
          expenseHistoryPanelRight: expenseHistoryPanel.getBoundingClientRect().right,
          expenseHistoryFilterMinHeight: Math.min(...expenseHistoryInputs.map(node => node.getBoundingClientRect().height)),
          expenseHistoryFilterMinFont: Math.min(...expenseHistoryInputs.map(node => parseFloat(getComputedStyle(node).fontSize))),
          expenseHistoryMinButtonHeight: Math.min(...expenseHistoryButtons.map(node => node.getBoundingClientRect().height)),
          expenseHistoryFilterColumns: getComputedStyle(expenseHistoryFilters).gridTemplateColumns.split(/\s+/).filter(Boolean).length,
          expenseHistoryRenderedRows: expenseHistoryCards.length,
          expenseHistoryCardRight: Math.max(...expenseHistoryCards.map(node => node.getBoundingClientRect().right)),
          expenseSyncStatusVisible: expenseSyncNotice.getBoundingClientRect().height > 0,
          expenseSyncStatusRight: expenseSyncNotice.getBoundingClientRect().right,
          expenseSyncRetryHeight: expenseRetry.getBoundingClientRect().height,
          expenseSyncRetryRight: expenseRetry.getBoundingClientRect().right,
          expenseMutationNoticeRight: Math.max(...mutationNotices.map(node => node.getBoundingClientRect().right)),
          expenseMutationNoticeCount: mutationNotices.length,
          expenseMutationDeleteMinHeight: Math.min(...expenseDeleteButtons.map(node => node.getBoundingClientRect().height)),
          expenseMutationSubmitDisabled: expenseSubmit.disabled,
          expenseMutationDeleteDisabled: expenseDeleteButtons.every(node => node.disabled)
        };
      });
      assert.ok(layout.scrollWidth <= width + 2, width + 'px overflow ' + JSON.stringify(layout));
      assert.ok(layout.welcomeRight <= width + 2, width + 'px header overflow ' + JSON.stringify(layout));
      if (width <= 640) {
        assert.ok(layout.welcomeHeight < 230, width + 'px greeting must not be 480px on phones: ' + JSON.stringify(layout));
        assert.equal(layout.mobilePickerDisplay, 'grid', width + 'px native section picker must be visible');
        assert.equal(layout.navRailDisplay, 'none', width + 'px 23-module scroll rail must be replaced');
        assert.ok(layout.mobilePickerHeight >= 44, width + 'px native picker touch target');
        assert.ok(layout.mobilePickerFontSize >= 16, width + 'px iOS select text prevents focus zoom');
      } else if (width >= 768) {
        assert.equal(layout.mobilePickerDisplay, 'none', width + 'px desktop/tablet nav is unchanged');
      }
      assert.ok(layout.productDialogRight <= width + 2, width + 'px product dialog overflow: ' + JSON.stringify(layout));
      assert.ok(layout.purchaseRight <= width + 2, width + 'px purchase CTA overflow: ' + JSON.stringify(layout));
      assert.ok(layout.productDialogMaxHeight <= 820 + 2, width + 'px product dialog height: ' + JSON.stringify(layout));
      assert.equal(layout.catalogActionsCount, 4, width + 'px catalog wish/compare shortcuts exist');
      assert.ok(layout.catalogActionMinSize >= 43, width + 'px catalog shortcuts must be touch sized: ' + JSON.stringify(layout));
      assert.ok(layout.catalogActionMaxRight <= width + 2, width + 'px catalog shortcuts must not overflow');
      assert.ok(layout.catalogActionsNamed && layout.catalogTitleActionCount === 2, width + 'px named and keyboard product actions');
      assert.ok(layout.galleryStepMinHeight >= 43 && layout.galleryStepRight <= width + 2 && layout.galleryStepsNamed,
        width + 'px gallery navigation touch/label safety: ' + JSON.stringify(layout));
      assert.ok(layout.reviewCollapsedInitially && layout.reviewSummaryHeight >= 43,
        width + 'px review form should be collapsible with a 44px keyboard target: ' + JSON.stringify(layout));
      assert.ok(layout.reviewSummaryRight <= width + 2 && layout.descriptionRight <= width + 2 && layout.specificationRight <= width + 2,
        width + 'px descriptions and review disclosure must fit the screen');
      assert.ok(layout.reviewFieldNamed && layout.reviewRatingNamed, width + 'px review fields have readable labels');
      const reviewEntry = page.locator('.gs-product-review-entry');
      await reviewEntry.locator('summary').evaluate(node => node.click());
      assert.ok(await reviewEntry.evaluate(node => node.open), width + 'px review form opens');
      if (width <= 640) {
        const ratingFont = await page.locator('.gs-product-review-rating-select').evaluate(node => parseFloat(getComputedStyle(node).fontSize));
        const fieldFont = await page.locator('.gs-product-review-field').first().evaluate(node => parseFloat(getComputedStyle(node).fontSize));
        assert.ok(ratingFont >= 16 && fieldFont >= 16, width + 'px review inputs must avoid iOS zoom');
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth) <= width + 2,
        width + 'px expanded review form must not overflow');
      await reviewEntry.locator('summary').evaluate(node => node.click());
      assert.equal(await reviewEntry.evaluate(node => node.open), false, width + 'px review form closes');
      assert.ok(layout.purchaseHintVisible && layout.purchaseGuardDescribed,
        width + 'px disabled purchase action announces its reason: ' + JSON.stringify(layout));
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
      assert.ok(layout.checkoutErrorFocusable, 'checkout error must accept programmatic focus');
      assert.ok(layout.cartQuantityGroupNamed && layout.cartQuantityButtonsNamed, 'cart quantity controls must identify the product');
      assert.equal(layout.cartCouponPlaceholder, 'პრომოკოდი', 'cart must not advertise an expired demo promo');
      if (width <= 640) {
        assert.equal(layout.checkoutSubmitPosition, 'sticky', width + 'px checkout submit remains visible in scrolling form');
        assert.ok(layout.cartCouponFont >= 16, width + 'px promo field avoids iOS focus zoom');
        assert.ok(layout.cartRegionFont >= 16, width + 'px delivery selector avoids iOS focus zoom');
      }
      assert.ok(layout.adminProductRowRight <= width + 2, width + 'px admin product row overflow: ' + JSON.stringify(layout));
      assert.ok(layout.adminOrdersRight <= width + 2, width + 'px admin orders overflow: ' + JSON.stringify(layout));
      assert.ok(layout.crmPanelRight <= width + 2, width + 'px CRM panel overflow: ' + JSON.stringify(layout));
      assert.ok(layout.analyticsPanelRight <= width + 2, width + 'px analytics panel overflow: ' + JSON.stringify(layout));
      assert.ok(layout.financeWarningRight <= width + 2, width + 'px financial warning overflow: ' + JSON.stringify(layout));
      assert.ok(layout.financeWarningButtonRight <= width + 2, width + 'px financial warning retry overflow: ' + JSON.stringify(layout));
      assert.ok(layout.financeWarningButtonHeight >= 43, width + 'px financial warning retry must be touch-sized: ' + JSON.stringify(layout));
      assert.ok(layout.analyticsCardMaxRight <= width + 2, width + 'px analytics KPI overflow: ' + JSON.stringify(layout));
      assert.equal(layout.analyticsCardCount, 8, width + 'px all financial KPIs must remain in the DOM');
      assert.ok(layout.analyticsControlMinHeight >= 43, width + 'px analytics controls must be touch-sized: ' + JSON.stringify(layout));
      assert.ok(layout.analyticsChartRight <= width + 2, width + 'px chart scroll viewport overflow: ' + JSON.stringify(layout));
      assert.equal(layout.financePanelCount, 4, width + 'px all four finance detail panels must remain visible');
      assert.ok(layout.expenseFormRight <= width + 2, width + 'px expense form overflow: ' + JSON.stringify(layout));
      assert.ok(layout.expenseHistoryPanelRight <= width + 2, width + 'px expense history panel overflow: ' + JSON.stringify(layout));
      assert.ok(layout.expenseHistoryCardRight <= width + 2, width + 'px expense history rows overflow: ' + JSON.stringify(layout));
      assert.ok(layout.expenseSyncStatusVisible, width + 'px verification status must be visible');
      assert.ok(layout.expenseSyncStatusRight <= width + 2, width + 'px expense verification status overflow: ' + JSON.stringify(layout));
      assert.ok(layout.expenseSyncRetryHeight >= 43, width + 'px expense error retry should be touch-sized: ' + JSON.stringify(layout));
      assert.ok(layout.expenseSyncRetryRight <= width + 2, width + 'px expense error retry overflow: ' + JSON.stringify(layout));
      assert.equal(layout.expenseMutationNoticeCount, 2, width + 'px create and delete notices must render');
      assert.ok(layout.expenseMutationNoticeRight <= width + 2, width + 'px expense mutation notice overflow: ' + JSON.stringify(layout));
      assert.ok(layout.expenseMutationSubmitDisabled, width + 'px in-flight expense submit should be disabled');
      assert.ok(layout.expenseMutationDeleteDisabled, width + 'px in-flight expense deletes should be disabled');
      assert.ok(layout.expenseMutationDeleteMinHeight >= 43, width + 'px delete targets should remain accessible');
      assert.equal(layout.expenseHistoryRenderedRows, 10, width + 'px expense history fixture must show exactly one page');
      assert.ok(layout.expenseHistoryFilterMinHeight >= 43, width + 'px expense search/filter must be touch-sized: ' + JSON.stringify(layout));
      assert.ok(layout.expenseHistoryMinButtonHeight >= 43, width + 'px expense pagination and refresh must be touch-sized: ' + JSON.stringify(layout));
      if (width <= 640) {
        assert.ok(layout.expenseHistoryFilterMinFont >= 16, width + 'px expense history filters must avoid iOS zoom: ' + JSON.stringify(layout));
        assert.equal(layout.expenseHistoryFilterColumns, 1, width + 'px expense history filters should stack');
      }
      assert.ok(layout.calculatorRight <= width + 2, width + 'px calculator input overflow: ' + JSON.stringify(layout));
      assert.ok(layout.calculatorExtraRight <= width + 2, width + 'px calculator additional fields overflow: ' + JSON.stringify(layout));
      assert.equal(layout.calculatorInputCount, 8, width + 'px all 8 calculator inputs should be visible');
      assert.equal(layout.calculatorExtraCount, 4, width + 'px all hidden-cost variables must have inputs');
      assert.equal(layout.calculatorExtraLabelCount, 4, width + 'px all additional inputs should have labels');
      assert.ok(layout.calculatorResultsRight <= width + 2, width + 'px calculator results overflow: ' + JSON.stringify(layout));
      assert.ok(layout.expenseFormMinInputHeight >= 43, width + 'px expense inputs must be touch sized: ' + JSON.stringify(layout));
      assert.ok(layout.expenseSubmitHeight >= 43, width + 'px expense submit must be touch sized: ' + JSON.stringify(layout));
      assert.ok(layout.calculatorMinInputHeight >= 43, width + 'px calculator inputs must be touch sized: ' + JSON.stringify(layout));
      if (width <= 640) {
        assert.ok(layout.expenseFormMinInputFontSize >= 16, width + 'px expense fields must avoid iOS focus zoom: ' + JSON.stringify(layout));
        assert.ok(layout.calculatorMinInputFontSize >= 16, width + 'px calculator fields must avoid iOS focus zoom: ' + JSON.stringify(layout));
        assert.equal(layout.expenseFormColumns, 1, width + 'px expense fields should stack: ' + JSON.stringify(layout));
      }
      if (width <= 380) assert.equal(layout.calculatorColumns, 1, width + 'px calculator fields should stack: ' + JSON.stringify(layout));
      assert.ok(layout.financePanelMaxRight <= width + 2, width + 'px financial detail panel overflow: ' + JSON.stringify(layout));
      assert.ok(layout.financeRowMaxRight <= width + 2, width + 'px financial figure row overflow: ' + JSON.stringify(layout));
      assert.equal(layout.financeBreakdownAmountWrap, 'normal', width + 'px long currency amounts must wrap: ' + JSON.stringify(layout));
      if (width <= 380) {
        assert.equal(layout.financeBreakdownColumnCount, 1, width + 'px expense breakdown should stack: ' + JSON.stringify(layout));
        assert.equal(layout.financeProfitabilityColumnCount, 1, width + 'px profit labels should stack: ' + JSON.stringify(layout));
      }
      if (width <= 768) assert.ok(layout.analyticsChartScrollWidth > layout.analyticsChartClientWidth, width + 'px dense chart should scroll inside its own viewport: ' + JSON.stringify(layout));
      assert.ok(layout.crmEditLabelsLinked, 'CRM edit form must associate both labels with controls');
      assert.ok(layout.supportRight <= width + 2, width + 'px support panel overflow: ' + JSON.stringify(layout));
      assert.ok(layout.supportReplyRight <= width + 2, width + 'px support reply overflow: ' + JSON.stringify(layout));
      assert.ok(layout.productFilterRight <= width + 2, width + 'px product filter overflow: ' + JSON.stringify(layout));
      if (width <= 640) {
        assert.equal(layout.supportControlsColumns, 1, width + 'px support controls stack: ' + JSON.stringify(layout));
        assert.equal(layout.supportStatusColumns, 2, width + 'px support status layout: ' + JSON.stringify(layout));
        assert.ok(layout.supportReplyFont >= 16, width + 'px reply iOS focus safety: ' + JSON.stringify(layout));
        assert.ok(layout.supportReplyHeight >= 80, width + 'px multiline reply should be readable: ' + JSON.stringify(layout));
        assert.ok(layout.supportSendHeight >= 43, width + 'px send reply touch target: ' + JSON.stringify(layout));
        assert.ok(layout.crmEditInputFont >= 16 && layout.crmEditInputMinHeight >= 43, width + 'px CRM editor touch/zoom safety: ' + JSON.stringify(layout));
        assert.ok(layout.productFilterMinFont >= 16 && layout.productFilterMinHeight >= 43, width + 'px product filter touch/zoom safety: ' + JSON.stringify(layout));
      }
      assert.ok(layout.supportStatusButtonMinHeight >= 43, width + 'px support statuses touch targets: ' + JSON.stringify(layout));
      assert.ok(layout.crmActionMinHeight >= 43, width + 'px CRM customer actions must be touch-sized: ' + JSON.stringify(layout));
      assert.ok(layout.crmPaginationMinHeight >= 43, width + 'px CRM pagination must be touch-sized: ' + JSON.stringify(layout));
      if (width <= 640) assert.ok(layout.crmSearchFontSize >= 16, width + 'px CRM search must avoid iOS focus zoom: ' + JSON.stringify(layout));
      if (width <= 639) assert.equal(layout.crmActionGridColumns, width <= 380 ? 1 : 2, width + 'px CRM actions should use narrow safe grid: ' + JSON.stringify(layout));
      if (width <= 767) {
        assert.equal(layout.orderActionsColumns, width <= 359 ? 1 : 2, width + 'px order action columns: ' + JSON.stringify(layout));
        assert.equal(layout.orderStatusesColumns, 2, width + 'px status button columns: ' + JSON.stringify(layout));
        assert.equal(layout.inventoryToolbarColumns, 2, width + 'px inventory toolbar columns: ' + JSON.stringify(layout));
        assert.ok(layout.inventorySearchFont >= 16, width + 'px inventory search iOS focus zoom: ' + JSON.stringify(layout));
        assert.ok(layout.inventorySearchRight <= width + 2, width + 'px inventory filter overflow: ' + JSON.stringify(layout));
        assert.ok(layout.inventoryButtonMinHeight >= 43, width + 'px inventory touch targets: ' + JSON.stringify(layout));
        assert.ok(layout.replenishmentInputMinFont >= 16, width + 'px replenishment iOS focus zoom: ' + JSON.stringify(layout));
        assert.ok(layout.replenishmentInputMinHeight >= 43, width + 'px replenishment touch targets: ' + JSON.stringify(layout));
        assert.ok(layout.replenishmentRight <= width + 2, width + 'px replenishment overflow: ' + JSON.stringify(layout));
        assert.ok(layout.financePeriodFont >= 16, width + 'px finance period iOS focus zoom: ' + JSON.stringify(layout));
      }
      assert.ok(layout.inventoryScrollFocusable, 'inventory history must remain keyboard-focusable at every width');
      if (width <= 767) assert.ok(layout.inventoryScrollInner, width + 'px inventory history must scroll inside its container');
      assert.ok(layout.replenishmentDisabledPreserved, 'disabled replenishment input guard must stay intact');
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
      // Isolate comparison modal from the product/checkout overlay fixture.
      await page.setContent('<!doctype html><html lang="ka"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>' + stage43Fixture + '</body></html>');
      await page.addStyleTag({ content: css });
      const saved = await page.evaluate(() => {
        const card = document.querySelector('.gs-wishlist-card');
        const actions = [...document.querySelectorAll('.gs-wishlist-actions > button')];
        const dialog = document.querySelector('.gs-product-compare-dialog');
        const closeActions = [...document.querySelectorAll('.gs-product-compare-clear, .gs-product-compare-close, .gs-product-compare-remove')];
        const scroller = document.querySelector('.gs-product-compare-scroll');
        const detailActions = [...document.querySelectorAll('.gs-wishlist-detail-link, .gs-product-compare-detail-link')];
        return {
          pageWidth: document.documentElement.scrollWidth,
          cardRight: card.getBoundingClientRect().right,
          controlsMinHeight: Math.min(...actions.map(b => b.getBoundingClientRect().height)),
          dialogRight: dialog.getBoundingClientRect().right,
          compareControlsMinHeight: Math.min(...closeActions.map(b => b.getBoundingClientRect().height)),
          scrollWidth: scroller.scrollWidth,
          clientWidth: scroller.clientWidth,
          scrollFocusable: scroller.tabIndex === 0,
          detailActionCount: detailActions.length,
          detailActionMinHeight: Math.min(...detailActions.map(button => button.getBoundingClientRect().height)),
          detailActionsNamed: detailActions.every(button => Boolean(button.getAttribute('aria-label')))
        };
      });
      assert.ok(saved.pageWidth <= width + 2 && saved.cardRight <= width + 2 && saved.dialogRight <= width + 2,
        width + 'px wishlist/compare viewport overflow: ' + JSON.stringify(saved));
      assert.ok(saved.detailActionCount === 5 && saved.detailActionMinHeight >= 43 && saved.detailActionsNamed,
        width + 'px saved and compared product detail actions must be 44px and named: ' + JSON.stringify(saved));
      assert.ok(saved.controlsMinHeight >= 43 && saved.compareControlsMinHeight >= 43,
        width + 'px wishlist/compare action touch size: ' + JSON.stringify(saved));
      assert.ok(saved.scrollFocusable && (width < 1200
        ? saved.scrollWidth > saved.clientWidth
        : saved.scrollWidth >= saved.clientWidth),
        width + 'px comparison must scroll on narrow screens and fit when space allows: ' + JSON.stringify(saved));
      process.stdout.write('PASS viewport ' + width + 'px\n');
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
