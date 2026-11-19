export const ADMIN_PANEL_VISUAL_STORAGE_KEY = 'geostore_admin_visual_design_v1';

export const ADMIN_PANEL_FONT_FAMILIES = Object.freeze({
  system: "Inter, 'Noto Sans Georgian', Arial, sans-serif",
  georgian: "'Noto Sans Georgian', 'DejaVu Sans', sans-serif",
  modern: "Inter, 'Noto Sans', 'Noto Sans Georgian', sans-serif",
  serif: "Georgia, 'Noto Serif Georgian', serif",
  mono: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace"
});

const normalizeFontFamily = (value, fallback = 'system') =>
  Object.hasOwn(ADMIN_PANEL_FONT_FAMILIES, value) ? value : fallback;

export const ADMIN_PANEL_CONTENT_FIELDS = Object.freeze([
  {
    "key": "staffExistingUsersTitle",
    "label": "თანამშრომლები — არსებული მომხმარებლის დაკავშირება",
    "maxLength": 100
  },
  {
    "key": "staffInviteTitle",
    "label": "თანამშრომლები — მოწვევის სათაური",
    "maxLength": 100
  },
  {
    "key": "staffListTitle",
    "label": "თანამშრომლები — სიის სათაური",
    "maxLength": 100
  },
  {
    "key": "inventoryTitle",
    "label": "მარაგები — სათაური",
    "maxLength": 120
  },
  {
    "key": "inventoryDescription",
    "label": "მარაგები — აღწერა",
    "maxLength": 260,
    "multiline": true
  },
  {
    "key": "analyticsPeriodTitle",
    "label": "ანალიტიკა — პერიოდის სათაური",
    "maxLength": 100
  },
  {
    "key": "analyticsPeriodDescription",
    "label": "ანალიტიკა — განმარტება",
    "maxLength": 260,
    "multiline": true
  },
  {
    "key": "ordersTitle",
    "label": "შეკვეთები — სათაური",
    "maxLength": 120
  },
  {
    "key": "ordersDescription",
    "label": "შეკვეთები — აღწერა",
    "maxLength": 260,
    "multiline": true
  },
  {
    "key": "ordersExportLabel",
    "label": "შეკვეთები — ექსპორტის ღილაკი",
    "maxLength": 100
  },
  {
    "key": "supportTitle",
    "label": "მხარდაჭერა — სათაური",
    "maxLength": 120
  },
  {
    "key": "supportEmptyLabel",
    "label": "მხარდაჭერა — ცარიელი სიის ტექსტი",
    "maxLength": 140
  },
  {
    "key": "discountsTitle",
    "label": "ფლეშ-აქციები — სათაური",
    "maxLength": 120
  },
  {
    "key": "discountsActiveLabel",
    "label": "ფლეშ-აქციები — აქტიური აქციის წარწერა",
    "maxLength": 100
  },
  {
    "key": "bannersCreateTitle",
    "label": "ბანერები — დამატების სათაური",
    "maxLength": 140
  },
  {
    "key": "bannersListTitle",
    "label": "ბანერები — სიის სათაური",
    "maxLength": 100
  },
  {
    "key": "bannersSubmitLabel",
    "label": "ბანერები — დამატების ღილაკი",
    "maxLength": 100
  },
  {
    "key": "categoriesCreateTitle",
    "label": "კატეგორიები — დამატების სათაური",
    "maxLength": 260,
    "multiline": true
  },
  {
    "key": "categoriesTreeTitle",
    "label": "კატეგორიები — იერარქიის სათაური",
    "maxLength": 160
  },
  {
    "key": "categoriesSubmitLabel",
    "label": "კატეგორიები — დამატების ღილაკი",
    "maxLength": 100
  },
  {
    "key": "couponsCreateTitle",
    "label": "კუპონები — შექმნის სათაური",
    "maxLength": 100
  },
  {
    "key": "couponsListTitle",
    "label": "კუპონები — სიის სათაური",
    "maxLength": 100
  },
  {
    "key": "couponsSubmitLabel",
    "label": "კუპონები — შექმნის ღილაკი",
    "maxLength": 100
  }
]);

const DEFAULT_ADMIN_PANEL_CONTENT = Object.freeze({
  "staffExistingUsersTitle": "არსებული მომხმარებლის დაკავშირება",
  "staffInviteTitle": "ახალი თანამშრომლის მოწვევა",
  "staffListTitle": "სერვერზე დაკავშირებული თანამშრომლები",
  "inventoryTitle": "მარაგის მოძრაობების ისტორია",
  "inventoryDescription": "თითოეული პროდუქტისა და ვარიანტის მარაგის ცვლილება — საწყისი/საბოლოო რაოდენობა, მიზეზი და შეკვეთის კავშირი.",
  "analyticsPeriodTitle": "ფინანსური პერიოდი",
  "analyticsPeriodDescription": "მოგებაში ითვლება მხოლოდ ჩაბარებული/დასრულებული შეკვეთები",
  "ordersTitle": "შეკვეთების სრული მართვის სისტემა",
  "ordersDescription": "მართეთ, გაფილტრეთ და აკონტროლეთ თითოეული შეკვეთა დეტალურად",
  "ordersExportLabel": "შეკვეთების ექსპორტი (CSV)",
  "supportTitle": "მომხმარებელთა მხარდაჭერა და პასუხები",
  "supportEmptyLabel": "მხარდაჭერის ტიგეტები არ არის.",
  "discountsTitle": "მასობრივი ფლეშ-ფასდაკლებების გააქტიურება",
  "discountsActiveLabel": "მოქმედი ფლეშ-აქცია",
  "bannersCreateTitle": "ახალი სარეკლამო ბანერის დამატება",
  "bannersListTitle": "აქტიური ბანერები",
  "bannersSubmitLabel": "ბანერის დამატება",
  "categoriesCreateTitle": "ახალი მთავარი კატეგორიის ან სუბკატეგორიის დამატება (ფოტოს ატვირთვა კომპიუტერიდან/მობილურიდან)",
  "categoriesTreeTitle": "კატეგორიებისა და სუბკატეგორიების იერარქია და ფოტოების მართვა",
  "categoriesSubmitLabel": "კატეგორიის დამატება 🚀",
  "couponsCreateTitle": "ახალი კუპონის შექმნა",
  "couponsListTitle": "აქტიური კუპონები",
  "couponsSubmitLabel": "კუპონის დამატება"
});

const ADMIN_PANEL_ELEMENT_DEFINITIONS = Object.freeze({"orderHeader":{"label":"შეკვეთები — სათაური","selector":".admin-orders-header"},"orderToolbar":{"label":"შეკვეთები — ძებნა და ფილტრები","selector":".admin-orders-toolbar"},"orderCard":{"label":"შეკვეთის ბარათი","selector":".admin-order-card"},"orderCardHeading":{"label":"შეკვეთის ბარათის ზედა ნაწილი","selector":".admin-order-card-heading"},"orderCustomer":{"label":"მომხმარებლის ინფორმაცია","selector":".admin-order-card-customer"},"orderActions":{"label":"შეკვეთის მოქმედებების ღილაკები","selector":".admin-order-actions"},"orderStatusBadge":{"label":"შეკვეთის სტატუსის წარწერა","selector":".admin-order-status-badge"},"orderPagination":{"label":"შეკვეთების გვერდების ნავიგაცია","selector":".admin-orders-pagination"},"orderDetailModal":{"label":"შეკვეთის დეტალების ფანჯარა","selector":".admin-order-detail-modal"},"staffList":{"label":"თანამშრომლები — სია","selector":".admin-staff-list-panel"},"staffCreateForm":{"label":"თანამშრომლები — დამატების ფორმა","selector":".admin-staff-create-form"},"inventoryPanel":{"label":"მარაგები — მთავარი ბლოკი","selector":".admin-inventory-panel"},"inventoryMovementRow":{"label":"მარაგის შევსება — პოზიციის ბარათი","selector":".admin-replenishment-row"},"inventoryMetric":{"label":"მარაგის შევსება — მაჩვენებლის ბარათი","selector":".admin-replenishment-metric"},"inventoryHistoryRow":{"label":"მარაგის ისტორია — ცვლილების ჩანაწერი","selector":".admin-inventory-movement-row"},"inventoryHistoryMetric":{"label":"მარაგის ისტორია — შეჯამების ბარათი","selector":".admin-inventory-history-metric"},"analyticsToolbar":{"label":"ანალიტიკა — ფილტრების პანელი","selector":".admin-analytics-toolbar"},"analyticsCard":{"label":"ანალიტიკა — მაჩვენებლის ბარათი","selector":".admin-analytics-card"},"analyticsGrid":{"label":"ანალიტიკა — მაჩვენებლების განლაგება","selector":".admin-analytics-kpis"},"supportTicket":{"label":"მხარდაჭერა — ბილეთის ბარათი","selector":".admin-support-ticket"},"supportTicketHeader":{"label":"მხარდაჭერა — ბილეთის სათაური","selector":".admin-support-ticket-header"},"supportTicketMessage":{"label":"მხარდაჭერა — შეტყობინების ბლოკი","selector":".admin-support-ticket-message"},"supportReplyForm":{"label":"მხარდაჭერა — პასუხის ფორმა","selector":".admin-support-reply-form"},"discountForm":{"label":"ფასდაკლებები — აქციის ფორმა","selector":".admin-flash-sale-form"},"discountFields":{"label":"ფასდაკლებები — ფორმის ველები","selector":".admin-flash-sale-fields"},"discountActiveSummary":{"label":"ფასდაკლებები — აქტიური აქციის ბლოკი","selector":".gs-admin-flash-sale-active"},"bannerForm":{"label":"ბანერები — დამატების ფორმა","selector":".admin-banner-form"},"bannerCard":{"label":"ბანერები — ბანერის ბარათი","selector":".admin-banner-card"},"bannerList":{"label":"ბანერები — სიის განლაგება","selector":".admin-banner-list"},"categoryForm":{"label":"კატეგორიები — დამატების ფორმა","selector":".admin-category-form"},"categoryCard":{"label":"კატეგორიები — მთავარი კატეგორიის ბარათი","selector":".admin-category-card"},"subcategoryCard":{"label":"კატეგორიები — ქვეკატეგორიის ბარათი","selector":".admin-subcategory-card"},"couponForm":{"label":"კუპონები — კუპონის ფორმა","selector":".admin-coupon-form"},"couponCard":{"label":"კუპონები — კუპონის ბარათი","selector":".admin-coupon-card"},"couponList":{"label":"კუპონები — სიის განლაგება","selector":".admin-coupon-list"}});
const DEFAULT_ADMIN_PANEL_ELEMENT_STYLES = Object.freeze({"orderHeader":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"orderToolbar":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"orderCard":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"orderCardHeading":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"orderCustomer":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"orderActions":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"orderStatusBadge":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"orderPagination":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"orderDetailModal":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"staffList":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"staffCreateForm":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"inventoryPanel":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"inventoryMovementRow":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"inventoryMetric":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"inventoryHistoryRow":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"inventoryHistoryMetric":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"analyticsToolbar":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"analyticsCard":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"analyticsGrid":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"supportTicket":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"supportTicketHeader":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"supportTicketMessage":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"supportReplyForm":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"discountForm":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"discountFields":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"discountActiveSummary":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"bannerForm":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"bannerCard":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"bannerList":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"categoryForm":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"categoryCard":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"subcategoryCard":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"couponForm":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"couponCard":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12},"couponList":{"fontSize":12,"fontWeight":500,"textAlign":"left","textColor":"#e2e8f0","backgroundColor":"#0f172a","borderColor":"#334155","borderRadius":12,"padding":12}});

export const DEFAULT_ADMIN_PANEL_VISUAL_DESIGN = Object.freeze({
  version: 1,
  theme: {
    accent: '#34d399',
    canvas: '#020617',
    panel: '#0f172a',
    surface: '#020617',
    text: '#f8fafc',
    muted: '#94a3b8',
    border: '#334155',
    navActiveBackground: '#34d399',
    navActiveText: '#020617',
    navInactiveBackground: '#020617',
    navInactiveText: '#94a3b8',
    headerBackground: '#0f172a',
    headerBorder: '#334155',
    tableHeaderBackground: '#020617',
    tableHeaderText: '#94a3b8',
    tableRowBackground: '#0f172a',
    tableRowHover: '#172554',
    filterBackground: '#020617',
    filterText: '#f8fafc',
    filterBorder: '#334155',
    primaryButtonBackground: '#059669',
    primaryButtonText: '#ffffff',
    primaryButtonBorder: '#10b981',
    inputBackground: '#020617',
    inputText: '#f8fafc',
    inputPlaceholder: '#94a3b8',
    inputBorder: '#334155',
    inputFocus: '#34d399',
    contentCardBackground: '#0f172a',
    contentCardBorder: '#334155',
    cardTitleText: '#f8fafc',
    cardMutedText: '#94a3b8',
    cardShadowColor: '#000000',
    cardHoverBorder: '#34d399',
    modalBackground: '#0d0d10',
    modalText: '#f8fafc',
    modalBorder: '#334155',
    modalOverlayBackground: '#020617',
    staffSectionBackground: '#0f172a',
    staffSectionBorder: '#334155',
    inventorySectionBackground: '#0f172a',
    inventorySectionBorder: '#334155',
    analyticsSectionBackground: '#0f172a',
    analyticsSectionBorder: '#334155',
    ordersSectionBackground: '#0f172a',
    ordersSectionBorder: '#334155',
    supportSectionBackground: '#0f172a',
    supportSectionBorder: '#334155',
    discountsSectionBackground: '#0f172a',
    discountsSectionBorder: '#334155',
    bannersSectionBackground: '#0f172a',
    bannersSectionBorder: '#334155',
    categoriesSectionBackground: '#0f172a',
    categoriesSectionBorder: '#334155',
    couponsSectionBackground: '#0f172a',
    couponsSectionBorder: '#334155'
  },
  layout: {
    fontSize: 13,
    titleFontSize: 18,
    bodyFontSize: 13,
    headingFontWeight: 700,
    bodyFontWeight: 400,
    buttonFontSize: 13,
    buttonFontWeight: 600,
    navItemFontSize: 13,
    navItemFontWeight: 600,
    fontFamily: 'system',
    cardRadius: 24,
    cardPadding: 20,
    sidebarWidth: 288,
    buttonRadius: 14,
    navItemRadius: 16,
    navItemPaddingY: 12,
    sectionGap: 24,
    headerRadius: 32,
    headerPadding: 24,
    tableCellPadding: 12,
    tableCellPaddingY: 12,
    tableHeaderFontSize: 12,
    tableHeaderFontWeight: 700,
    tableRowFontSize: 13,
    tableRowMinHeight: 48,
    filterControlHeight: 40,
    filterGap: 12,
    inputFontSize: 13,
    inputFontWeight: 400,
    inputRadius: 12,
    inputHeight: 44,
    inputFocusRingWidth: 2,
    cardBorderWidth: 1,
    cardShadowBlur: 24,
    modalRadius: 28,
    modalPadding: 24,
    modalOverlayOpacity: 82
  },
  components: {
  "staff": {
    "radius": 30,
    "padding": 24,
    "borderWidth": 1,
    "shadowBlur": 22,
    fontSize: 13, titleFontSize: 16, titleFontWeight: 700, bodyFontWeight: 400, textAlign: 'left', borderStyle: 'solid', textColor: '#e2e8f0', backgroundColor: '#0f172a', borderColor: '#334155'
  },
  "inventory": {
    "radius": 30,
    "padding": 24,
    "borderWidth": 1,
    "shadowBlur": 22,
    fontSize: 13, titleFontSize: 16, titleFontWeight: 700, bodyFontWeight: 400, textAlign: 'left', borderStyle: 'solid', textColor: '#e2e8f0', backgroundColor: '#0f172a', borderColor: '#334155'
  },
  "analytics": {
    "radius": 24,
    "padding": 20,
    "borderWidth": 1,
    "shadowBlur": 20,
    fontSize: 13, titleFontSize: 16, titleFontWeight: 700, bodyFontWeight: 400, textAlign: 'left', borderStyle: 'solid', textColor: '#e2e8f0', backgroundColor: '#0f172a', borderColor: '#334155'
  },
  "orders": {
    "radius": 32,
    "padding": 28,
    "borderWidth": 1,
    "shadowBlur": 24,
    fontSize: 13, titleFontSize: 16, titleFontWeight: 700, bodyFontWeight: 400, textAlign: 'left', borderStyle: 'solid', textColor: '#e2e8f0', backgroundColor: '#0f172a', borderColor: '#334155'
  },
  "support": {
    "radius": 32,
    "padding": 28,
    "borderWidth": 1,
    "shadowBlur": 24,
    fontSize: 13, titleFontSize: 16, titleFontWeight: 700, bodyFontWeight: 400, textAlign: 'left', borderStyle: 'solid', textColor: '#e2e8f0', backgroundColor: '#0f172a', borderColor: '#334155'
  },
  "discounts": {
    "radius": 32,
    "padding": 28,
    "borderWidth": 1,
    "shadowBlur": 24,
    fontSize: 13, titleFontSize: 16, titleFontWeight: 700, bodyFontWeight: 400, textAlign: 'left', borderStyle: 'solid', textColor: '#e2e8f0', backgroundColor: '#0f172a', borderColor: '#334155'
  },
  "banners": {
    "radius": 30,
    "padding": 28,
    "borderWidth": 1,
    "shadowBlur": 22,
    fontSize: 13, titleFontSize: 16, titleFontWeight: 700, bodyFontWeight: 400, textAlign: 'left', borderStyle: 'solid', textColor: '#e2e8f0', backgroundColor: '#0f172a', borderColor: '#334155'
  },
  "categories": {
    "radius": 30,
    "padding": 28,
    "borderWidth": 1,
    "shadowBlur": 22,
    fontSize: 13, titleFontSize: 16, titleFontWeight: 700, bodyFontWeight: 400, textAlign: 'left', borderStyle: 'solid', textColor: '#e2e8f0', backgroundColor: '#0f172a', borderColor: '#334155'
  },
  "coupons": {
    "radius": 30,
    "padding": 28,
    "borderWidth": 1,
    "shadowBlur": 22,
    fontSize: 13, titleFontSize: 16, titleFontWeight: 700, bodyFontWeight: 400, textAlign: 'left', borderStyle: 'solid', textColor: '#e2e8f0', backgroundColor: '#0f172a', borderColor: '#334155'
  }
},
  content: DEFAULT_ADMIN_PANEL_CONTENT,
  elementStyles: DEFAULT_ADMIN_PANEL_ELEMENT_STYLES,
  responsive: {
    tablet: { theme: {}, layout: {}, components: {}, elementStyles: {} },
    mobile: { theme: {}, layout: {}, components: {}, elementStyles: {} }
  }
});

const THEME_KEYS = Object.keys(DEFAULT_ADMIN_PANEL_VISUAL_DESIGN.theme);
const COMPONENT_DEFAULTS = {
  "staff": {
    "radius": 30,
    "padding": 24,
    "borderWidth": 1,
    "shadowBlur": 22,
    fontSize: 13, titleFontSize: 16, titleFontWeight: 700, bodyFontWeight: 400, textAlign: 'left', borderStyle: 'solid', textColor: '#e2e8f0', backgroundColor: '#0f172a', borderColor: '#334155'
  },
  "inventory": {
    "radius": 30,
    "padding": 24,
    "borderWidth": 1,
    "shadowBlur": 22,
    fontSize: 13, titleFontSize: 16, titleFontWeight: 700, bodyFontWeight: 400, textAlign: 'left', borderStyle: 'solid', textColor: '#e2e8f0', backgroundColor: '#0f172a', borderColor: '#334155'
  },
  "analytics": {
    "radius": 24,
    "padding": 20,
    "borderWidth": 1,
    "shadowBlur": 20,
    fontSize: 13, titleFontSize: 16, titleFontWeight: 700, bodyFontWeight: 400, textAlign: 'left', borderStyle: 'solid', textColor: '#e2e8f0', backgroundColor: '#0f172a', borderColor: '#334155'
  },
  "orders": {
    "radius": 32,
    "padding": 28,
    "borderWidth": 1,
    "shadowBlur": 24,
    fontSize: 13, titleFontSize: 16, titleFontWeight: 700, bodyFontWeight: 400, textAlign: 'left', borderStyle: 'solid', textColor: '#e2e8f0', backgroundColor: '#0f172a', borderColor: '#334155'
  },
  "support": {
    "radius": 32,
    "padding": 28,
    "borderWidth": 1,
    "shadowBlur": 24,
    fontSize: 13, titleFontSize: 16, titleFontWeight: 700, bodyFontWeight: 400, textAlign: 'left', borderStyle: 'solid', textColor: '#e2e8f0', backgroundColor: '#0f172a', borderColor: '#334155'
  },
  "discounts": {
    "radius": 32,
    "padding": 28,
    "borderWidth": 1,
    "shadowBlur": 24,
    fontSize: 13, titleFontSize: 16, titleFontWeight: 700, bodyFontWeight: 400, textAlign: 'left', borderStyle: 'solid', textColor: '#e2e8f0', backgroundColor: '#0f172a', borderColor: '#334155'
  },
  "banners": {
    "radius": 30,
    "padding": 28,
    "borderWidth": 1,
    "shadowBlur": 22,
    fontSize: 13, titleFontSize: 16, titleFontWeight: 700, bodyFontWeight: 400, textAlign: 'left', borderStyle: 'solid', textColor: '#e2e8f0', backgroundColor: '#0f172a', borderColor: '#334155'
  },
  "categories": {
    "radius": 30,
    "padding": 28,
    "borderWidth": 1,
    "shadowBlur": 22,
    fontSize: 13, titleFontSize: 16, titleFontWeight: 700, bodyFontWeight: 400, textAlign: 'left', borderStyle: 'solid', textColor: '#e2e8f0', backgroundColor: '#0f172a', borderColor: '#334155'
  },
  "coupons": {
    "radius": 30,
    "padding": 28,
    "borderWidth": 1,
    "shadowBlur": 22,
    fontSize: 13, titleFontSize: 16, titleFontWeight: 700, bodyFontWeight: 400, textAlign: 'left', borderStyle: 'solid', textColor: '#e2e8f0', backgroundColor: '#0f172a', borderColor: '#334155'
  }
};
const COMPONENT_LIMITS = {
  "radius": [
    0,
    48
  ],
  "padding": [
    4,
    48
  ],
  "borderWidth": [
    0,
    4
  ],
  "shadowBlur": [
    0,
    40
  ],
  fontSize: [10, 20],
  titleFontSize: [12, 28],
  titleFontWeight: [400, 900],
  bodyFontWeight: [300, 800]
};
const COMPONENT_COLOR_DEFAULTS = { textColor: "#e2e8f0", backgroundColor: "#0f172a", borderColor: "#334155" };
const COMPONENT_ENUM_DEFAULTS = { textAlign: ['left', 'center', 'right'], borderStyle: ['solid', 'dashed', 'dotted', 'none'] };

const normalizeComponents = (source, fallback, partial = false) => Object.fromEntries(
  Object.entries(COMPONENT_DEFAULTS).map(([component, defaults]) => {
    const values = isObject(source?.[component]) ? source[component] : {};
    const base = fallback?.[component] || defaults;
    const numeric = Object.fromEntries(Object.entries(COMPONENT_LIMITS)
      .filter(([key]) => !partial || (values[key] != null && values[key] !== ''))
      .map(([key, bounds]) => [key, clampNumber(values[key], bounds, partial ? base[key] : defaults[key])]));
    const enums = Object.fromEntries(Object.entries(COMPONENT_ENUM_DEFAULTS)
      .filter(([key]) => !partial || (values[key] != null && values[key] !== ''))
      .map(([key, allowed]) => [key, allowed.includes(values[key]) ? values[key] : (partial ? (base[key] || allowed[0]) : allowed[0])]));
    const colors = Object.fromEntries(Object.entries(COMPONENT_COLOR_DEFAULTS)
      .filter(([key]) => !partial || (values[key] != null && values[key] !== ''))
      .map(([key, fallback]) => [key, safeColor(values[key], partial ? (base[key] || fallback) : fallback)]));
    return [component, { ...numeric, ...enums, ...colors }];
  })
);


const ELEMENT_STYLE_LIMITS = { fontSize: [10, 24], fontWeight: [300, 900], borderRadius: [0, 32], padding: [0, 32] };
const ELEMENT_STYLE_COLORS = { textColor: '#e2e8f0', backgroundColor: '#0f172a', borderColor: '#334155' };
const ELEMENT_STYLE_ENUMS = { textAlign: ['left', 'center', 'right'] };

const normalizeElementStyles = (source, fallback = DEFAULT_ADMIN_PANEL_ELEMENT_STYLES, partial = false) => Object.fromEntries(
  Object.entries(ADMIN_PANEL_ELEMENT_DEFINITIONS).map(([key]) => {
    const values = isObject(source?.[key]) ? source[key] : {};
    const base = fallback?.[key] || DEFAULT_ADMIN_PANEL_ELEMENT_STYLES[key];
    const numeric = Object.fromEntries(Object.entries(ELEMENT_STYLE_LIMITS)
      .filter(([field]) => !partial || values[field] != null)
      .map(([field, bounds]) => [field, clampNumber(values[field], bounds, partial ? base[field] : DEFAULT_ADMIN_PANEL_ELEMENT_STYLES[key][field])]));
    const colors = Object.fromEntries(Object.entries(ELEMENT_STYLE_COLORS)
      .filter(([field]) => !partial || values[field] != null)
      .map(([field, defaultColor]) => [field, safeColor(values[field], partial ? base[field] : defaultColor)]));
    const enums = Object.fromEntries(Object.entries(ELEMENT_STYLE_ENUMS)
      .filter(([field]) => !partial || values[field] != null)
      .map(([field, allowed]) => [field, allowed.includes(values[field]) ? values[field] : (partial ? base[field] : allowed[0])]));
    return [key, { ...numeric, ...colors, ...enums }];
  })
);

const LAYOUT_LIMITS = {
  fontSize: [11, 16],
  titleFontSize: [14, 32],
  bodyFontSize: [11, 18],
  headingFontWeight: [500, 900],
  bodyFontWeight: [400, 700],
  buttonFontSize: [11, 18],
  buttonFontWeight: [400, 800],
  navItemFontSize: [11, 18],
  navItemFontWeight: [400, 800],
  cardRadius: [10, 36],
  cardPadding: [12, 32],
  sidebarWidth: [240, 360],
  buttonRadius: [0, 28],
  navItemRadius: [0, 28],
  navItemPaddingY: [6, 20],
  sectionGap: [12, 48],
  headerRadius: [10, 40],
  headerPadding: [12, 32],
  tableCellPadding: [6, 20],
  tableCellPaddingY: [4, 20],
  tableHeaderFontSize: [10, 16],
  tableHeaderFontWeight: [400, 900],
  tableRowFontSize: [10, 18],
  tableRowMinHeight: [32, 80],
  filterControlHeight: [32, 52],
  filterGap: [4, 24],
  inputFontSize: [11, 18],
  inputFontWeight: [300, 700],
  inputRadius: [0, 20],
  inputHeight: [36, 52],
  inputFocusRingWidth: [0, 4],
  cardBorderWidth: [0, 3],
  cardShadowBlur: [0, 36],
  modalRadius: [12, 40],
  modalPadding: [12, 36],
  modalOverlayOpacity: [40, 95]
};

const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const safeColor = (value, fallback) => {
  const color = String(value ?? '').trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
};

const clampNumber = (value, [min, max], fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

const normalizeTheme = (source, fallback) => Object.fromEntries(
  THEME_KEYS.map(key => [key, safeColor(source?.[key], fallback[key])])
);

const normalizeContent = source => Object.fromEntries(
  ADMIN_PANEL_CONTENT_FIELDS.map(({ key, maxLength }) => {
    const rawValue = typeof source?.[key] === 'string' ? source[key] : '';
    const cleaned = rawValue
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .trim()
      .slice(0, maxLength);
    return [key, cleaned || DEFAULT_ADMIN_PANEL_CONTENT[key]];
  })
);

const normalizeLayout = (source, fallback) => ({
  ...Object.fromEntries(Object.entries(LAYOUT_LIMITS).map(([key, limits]) => [
    key,
    clampNumber(source?.[key], limits, fallback[key])
  ])),
  fontFamily: normalizeFontFamily(source?.fontFamily, fallback.fontFamily)
});

export function normalizeAdminPanelVisualDesign(rawDesign) {
  const raw = isObject(rawDesign) ? rawDesign : {};
  const theme = normalizeTheme(raw.theme, DEFAULT_ADMIN_PANEL_VISUAL_DESIGN.theme);
  const layout = normalizeLayout(raw.layout, DEFAULT_ADMIN_PANEL_VISUAL_DESIGN.layout);
  const components = normalizeComponents(raw.components, DEFAULT_ADMIN_PANEL_VISUAL_DESIGN.components);
  const content = normalizeContent(raw.content);
  const elementStyles = normalizeElementStyles(raw.elementStyles);
  const responsive = {};

  for (const viewport of ['tablet', 'mobile']) {
    const source = isObject(raw.responsive?.[viewport]) ? raw.responsive[viewport] : {};
    const responsiveTheme = isObject(source.theme) ? source.theme : {};
    const responsiveLayout = isObject(source.layout) ? source.layout : {};
    responsive[viewport] = {
      theme: Object.fromEntries(THEME_KEYS
        .filter(key => responsiveTheme[key] != null && responsiveTheme[key] !== '')
        .map(key => [key, safeColor(responsiveTheme[key], theme[key])])),
      components: normalizeComponents(source.components, components, true),
      elementStyles: normalizeElementStyles(source.elementStyles, elementStyles, true),
      layout: {
        ...Object.fromEntries(Object.entries(LAYOUT_LIMITS)
          .filter(([key]) => responsiveLayout[key] != null && responsiveLayout[key] !== '')
          .map(([key, limits]) => [key, clampNumber(responsiveLayout[key], limits, layout[key])])),
        ...(Object.hasOwn(ADMIN_PANEL_FONT_FAMILIES, responsiveLayout.fontFamily)
          ? { fontFamily: normalizeFontFamily(responsiveLayout.fontFamily, layout.fontFamily) }
          : {})
      }
    };
  }

  return { version: 1, theme, layout, components, content, elementStyles, responsive };
}

export function resetAdminPanelVisualElement(rawDesign, viewport, elementKey) {
  const design = normalizeAdminPanelVisualDesign(rawDesign);
  if (!Object.prototype.hasOwnProperty.call(ADMIN_PANEL_ELEMENT_DEFINITIONS, elementKey)) return design;

  if (viewport === 'desktop') {
    return normalizeAdminPanelVisualDesign({
      ...design,
      elementStyles: {
        ...design.elementStyles,
        [elementKey]: DEFAULT_ADMIN_PANEL_VISUAL_DESIGN.elementStyles[elementKey]
      }
    });
  }

  if (viewport !== 'tablet' && viewport !== 'mobile') return design;
  const responsive = { ...design.responsive };
  const viewportSettings = { ...(responsive[viewport] || {}) };
  const elementStyles = { ...(viewportSettings.elementStyles || {}) };
  delete elementStyles[elementKey];

  if (Object.keys(elementStyles).length) viewportSettings.elementStyles = elementStyles;
  else delete viewportSettings.elementStyles;

  if (Object.keys(viewportSettings).length) responsive[viewport] = viewportSettings;
  else delete responsive[viewport];

  return normalizeAdminPanelVisualDesign({ ...design, responsive });
}

export function resetAdminPanelVisualViewport(rawDesign, viewport) {
  const design = normalizeAdminPanelVisualDesign(rawDesign);

  if (viewport === 'desktop') {
    return normalizeAdminPanelVisualDesign({
      ...design,
      theme: DEFAULT_ADMIN_PANEL_VISUAL_DESIGN.theme,
      layout: DEFAULT_ADMIN_PANEL_VISUAL_DESIGN.layout,
      components: DEFAULT_ADMIN_PANEL_VISUAL_DESIGN.components,
      elementStyles: DEFAULT_ADMIN_PANEL_VISUAL_DESIGN.elementStyles
    });
  }

  if (viewport !== 'tablet' && viewport !== 'mobile') return design;

  const responsive = { ...design.responsive };
  delete responsive[viewport];
  return normalizeAdminPanelVisualDesign({ ...design, responsive });
}

const effectiveViewport = (design, viewport) => ({
  theme: { ...design.theme, ...(design.responsive?.[viewport]?.theme || {}) },
  layout: { ...design.layout, ...(design.responsive?.[viewport]?.layout || {}) }
});

export function buildAdminPanelVisualStyle(rawDesign) {
  const design = normalizeAdminPanelVisualDesign(rawDesign);
  const desktop = effectiveViewport(design, 'desktop');
  const tablet = effectiveViewport(design, 'tablet');
  const mobile = effectiveViewport(design, 'mobile');
  const style = {};

  const responsiveComponents = {
    tablet: normalizeComponents(design.responsive?.tablet?.components, design.components, true),
    mobile: normalizeComponents(design.responsive?.mobile?.components, design.components, true)
  };
  const componentViewports = [
    ['', design.components],
    ['tablet-', Object.fromEntries(Object.entries(design.components).map(([name, base]) => [name, { ...base, ...(responsiveComponents.tablet[name] || {}) }]))],
    ['mobile-', Object.fromEntries(Object.entries(design.components).map(([name, base]) => [name, { ...base, ...(responsiveComponents.tablet[name] || {}), ...(responsiveComponents.mobile[name] || {}) }]))]
  ];

  for (const [prefix, values] of componentViewports) {
    for (const [component, settings] of Object.entries(values)) {
      for (const [key, value] of Object.entries(settings)) {
        style[`--admin-vd-${prefix}${component}-${key}`] = COMPONENT_COLOR_DEFAULTS[key] || COMPONENT_ENUM_DEFAULTS[key] ? value : key.endsWith('FontWeight') ? String(value) : `${value}px`;
      }
    }
  }


  const responsiveElementStyles = {
    tablet: normalizeElementStyles(design.responsive?.tablet?.elementStyles, design.elementStyles, true),
    mobile: normalizeElementStyles(design.responsive?.mobile?.elementStyles, design.elementStyles, true)
  };
  const elementViewports = [
    ['', design.elementStyles],
    ['tablet-', Object.fromEntries(Object.entries(design.elementStyles).map(([name, base]) => [name, { ...base, ...(responsiveElementStyles.tablet[name] || {}) }]))],
    ['mobile-', Object.fromEntries(Object.entries(design.elementStyles).map(([name, base]) => [name, { ...base, ...(responsiveElementStyles.tablet[name] || {}), ...(responsiveElementStyles.mobile[name] || {}) }]))]
  ];
  for (const [prefix, values] of elementViewports) {
    for (const [element, settings] of Object.entries(values)) {
      for (const [key, value] of Object.entries(settings)) {
        style[`--admin-vd-element-${prefix}${element}-${key}`] = ELEMENT_STYLE_COLORS[key] || ELEMENT_STYLE_ENUMS[key] ? value : key === 'fontWeight' ? String(value) : `${value}px`;
      }
    }
  }

  for (const [prefix, values] of [['', desktop], ['tablet-', tablet], ['mobile-', mobile]]) {
    for (const [key, value] of Object.entries(values.theme)) {
      style[`--admin-vd-${prefix}${key}`] = value;
    }
    for (const [key, value] of Object.entries(values.layout)) {
      style[`--admin-vd-${prefix}${key}`] = key === 'modalOverlayOpacity' ? `${value}%` : key === 'fontFamily' ? (ADMIN_PANEL_FONT_FAMILIES[value] || ADMIN_PANEL_FONT_FAMILIES.system) : key.endsWith('FontWeight') ? String(value) : `${value}px`;
    }
  }

  return style;
}

export function loadAdminPanelVisualDesign(storage) {
  try {
    const target = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    if (!target) return normalizeAdminPanelVisualDesign(DEFAULT_ADMIN_PANEL_VISUAL_DESIGN);
    const saved = target.getItem(ADMIN_PANEL_VISUAL_STORAGE_KEY);
    return normalizeAdminPanelVisualDesign(saved ? JSON.parse(saved) : DEFAULT_ADMIN_PANEL_VISUAL_DESIGN);
  } catch {
    return normalizeAdminPanelVisualDesign(DEFAULT_ADMIN_PANEL_VISUAL_DESIGN);
  }
}

export function saveAdminPanelVisualDesign(rawDesign, storage) {
  try {
    const target = storage || (typeof window !== 'undefined' ? window.localStorage : null);
    if (!target) return false;
    target.setItem(ADMIN_PANEL_VISUAL_STORAGE_KEY, JSON.stringify(normalizeAdminPanelVisualDesign(rawDesign)));
    return true;
  } catch {
    return false;
  }
}
