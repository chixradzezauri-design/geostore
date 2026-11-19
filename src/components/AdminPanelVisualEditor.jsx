import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ADMIN_PANEL_CONTENT_FIELDS,
  DEFAULT_ADMIN_PANEL_VISUAL_DESIGN,
  normalizeAdminPanelVisualDesign,
  createAdminStylePresetBackup,
  restoreAdminStylePresetBackup,
  resetAdminPanelVisualViewport,
  resetAdminPanelVisualElement
} from '../utils/adminPanelVisualDesign.js';

const VIEWPORTS = [
  { id: 'desktop', label: 'Desktop' },
  { id: 'tablet', label: 'Tablet' },
  { id: 'mobile', label: 'Mobile' }
];

const ELEMENT_CATEGORIES = [
  { id: 'orders', label: 'შეკვეთები', keys: ['orderHeader', 'orderToolbar', 'orderCard', 'orderCardHeading', 'orderCustomer', 'orderActions', 'orderStatusBadge', 'orderPagination', 'orderDetailModal'] },
  { id: 'staff', label: 'თანამშრომლები', keys: ['staffList', 'staffCreateForm'] },
  { id: 'inventory', label: 'მარაგები', keys: ['inventoryPanel', 'inventoryMovementRow', 'inventoryMetric', 'inventoryHistoryRow', 'inventoryHistoryMetric'] },
  { id: 'analytics', label: 'ანალიტიკა', keys: ['analyticsToolbar', 'analyticsCard', 'analyticsGrid'] },
  { id: 'support', label: 'მხარდაჭერა', keys: ['supportTicket', 'supportTicketHeader', 'supportTicketMessage', 'supportReplyForm'] },
  { id: 'discounts', label: 'ფასდაკლებები', keys: ['discountForm', 'discountFields', 'discountActiveSummary'] },
  { id: 'banners', label: 'ბანერები', keys: ['bannerForm', 'bannerCard', 'bannerList'] },
  { id: 'categories', label: 'კატეგორიები', keys: ['categoryForm', 'categoryCard', 'subcategoryCard'] },
  { id: 'coupons', label: 'კუპონები', keys: ['couponForm', 'couponCard', 'couponList'] }
];

const COLOR_FIELDS = [
  { key: 'accent', label: 'აქცენტის ფერი' },
  { key: 'canvas', label: 'პანელის საერთო ფონი' },
  { key: 'panel', label: 'მთავარი ბლოკები' },
  { key: 'surface', label: 'შიდა ბარათები' },
  { key: 'text', label: 'ძირითადი ტექსტი' },
  { key: 'muted', label: 'მეორეული ტექსტი' },
  { key: 'border', label: 'ჩარჩოები და გამყოფები' },
  { key: 'navActiveBackground', label: 'აქტიური მენიუს ფონი' },
  { key: 'navActiveText', label: 'აქტიური მენიუს ტექსტი' },
  { key: 'navInactiveBackground', label: 'არააქტიური მენიუს ფონი' },
  { key: 'navInactiveText', label: 'არააქტიური მენიუს ტექსტი' },
  { key: 'headerBackground', label: 'ზედა პანელის ფონი' },
  { key: 'headerBorder', label: 'ზედა პანელის ჩარჩო' },
  { key: 'tableHeaderBackground', label: 'ცხრილის სათაურის ფონი' },
  { key: 'tableHeaderText', label: 'ცხრილის სათაურის ტექსტი' },
  { key: 'tableRowBackground', label: 'ცხრილის რიგების ფონი' },
  { key: 'tableRowHover', label: 'ცხრილის რიგის მონიშვნის ფონი' },
  { key: 'filterBackground', label: 'ფილტრების ფონი' },
  { key: 'filterText', label: 'ფილტრების ტექსტი' },
  { key: 'filterBorder', label: 'ფილტრების ჩარჩო' },
  { key: 'primaryButtonBackground', label: 'მთავარი მოქმედების ღილაკის ფონი' },
  { key: 'primaryButtonText', label: 'მთავარი მოქმედების ღილაკის ტექსტი' },
  { key: 'primaryButtonBorder', label: 'მთავარი მოქმედების ღილაკის ჩარჩო' },
  { key: 'inputBackground', label: 'ფორმის ველების ფონი' },
  { key: 'inputText', label: 'ფორმის ველების ტექსტი' },
  { key: 'inputPlaceholder', label: 'ფორმის მინიშნების ტექსტი' },
  { key: 'inputBorder', label: 'ფორმის ველების ჩარჩო' },
  { key: 'inputFocus', label: 'ველის აქტიური ჩარჩო' },
  { key: 'contentCardBackground', label: 'შიდა ბარათების ფონი' },
  { key: 'contentCardBorder', label: 'შიდა ბარათების ჩარჩო' },
  { key: 'cardTitleText', label: 'ბარათების სათაურის ტექსტი' },
  { key: 'cardMutedText', label: 'ბარათების მეორეული ტექსტი' },
  { key: 'cardShadowColor', label: 'ბარათების ჩრდილის ფერი' },
  { key: 'cardHoverBorder', label: 'ბარათის მონიშვნის ჩარჩო' },
  { key: 'modalBackground', label: 'მოდალის ფონი' },
  { key: 'modalText', label: 'მოდალის ტექსტი' },
  { key: 'modalBorder', label: 'მოდალის ჩარჩო' },
  { key: 'modalOverlayBackground', label: 'მოდალის გარე ფონი' },
  { key: 'staffSectionBackground', label: 'თანამშრომლების სექციის ფონი' },
  { key: 'staffSectionBorder', label: 'თანამშრომლების სექციის ჩარჩო' },
  { key: 'inventorySectionBackground', label: 'მარაგების სექციის ფონი' },
  { key: 'inventorySectionBorder', label: 'მარაგების სექციის ჩარჩო' },
  { key: 'analyticsSectionBackground', label: 'ანალიტიკის სექციის ფონი' },
  { key: 'analyticsSectionBorder', label: 'ანალიტიკის სექციის ჩარჩო' },
  { key: 'ordersSectionBackground', label: 'შეკვეთების სექციის ფონი' },
  { key: 'ordersSectionBorder', label: 'შეკვეთების სექციის ჩარჩო' },
  { key: 'supportSectionBackground', label: 'მხარდაჭერის სექციის ფონი' },
  { key: 'supportSectionBorder', label: 'მხარდაჭერის სექციის ჩარჩო' },
  { key: 'discountsSectionBackground', label: 'ფასდაკლებების სექციის ფონი' },
  { key: 'discountsSectionBorder', label: 'ფასდაკლებების სექციის ჩარჩო' },
  { key: 'bannersSectionBackground', label: 'ბანერების სექციის ფონი' },
  { key: 'bannersSectionBorder', label: 'ბანერების სექციის ჩარჩო' },
  { key: 'categoriesSectionBackground', label: 'კატეგორიების სექციის ფონი' },
  { key: 'categoriesSectionBorder', label: 'კატეგორიების სექციის ჩარჩო' },
  { key: 'couponsSectionBackground', label: 'კუპონების სექციის ფონი' },
  { key: 'couponsSectionBorder', label: 'კუპონების სექციის ჩარჩო' }
];

const RANGE_FIELDS = [
  { key: 'fontSize', label: 'საბაზისო ტექსტის ზომა', min: 11, max: 16, suffix: 'px' },
  { key: 'titleFontSize', label: 'სათაურების ზომა', min: 14, max: 32, suffix: 'px' },
  { key: 'bodyFontSize', label: 'ძირითადი ტექსტის ზომა', min: 11, max: 18, suffix: 'px' },
  { key: 'headingFontWeight', label: 'სათაურების სისქე', min: 500, max: 900, suffix: 'weight' },
  { key: 'bodyFontWeight', label: 'ტექსტის სისქე', min: 400, max: 700, suffix: 'weight' },
  { key: 'buttonFontSize', label: 'ღილაკების ტექსტის ზომა', min: 11, max: 18, suffix: 'px' },
  { key: 'buttonFontWeight', label: 'ღილაკების ტექსტის სისქე', min: 400, max: 800, suffix: 'weight' },
  { key: 'navItemFontSize', label: 'გვერდითი მენიუს ტექსტის ზომა', min: 11, max: 18, suffix: 'px' },
  { key: 'navItemFontWeight', label: 'გვერდითი მენიუს ტექსტის სისქე', min: 400, max: 800, suffix: 'weight' },
  { key: 'cardRadius', label: 'ბლოკების მომრგვალება', min: 10, max: 36, suffix: 'px' },
  { key: 'cardPadding', label: 'ბლოკების შიდა დაშორება', min: 12, max: 32, suffix: 'px' },
  { key: 'sidebarWidth', label: 'გვერდითი მენიუს სიგანე', min: 240, max: 360, suffix: 'px' },
  { key: 'buttonRadius', label: 'ღილაკების მომრგვალება', min: 0, max: 28, suffix: 'px' },
  { key: 'navItemRadius', label: 'მენიუს ელემენტების მომრგვალება', min: 0, max: 28, suffix: 'px' },
  { key: 'navItemPaddingY', label: 'მენიუს ელემენტის სიმაღლე', min: 6, max: 20, suffix: 'px' },
  { key: 'sectionGap', label: 'ძირითად ბლოკებს შორის დაშორება', min: 12, max: 48, suffix: 'px' },
  { key: 'headerRadius', label: 'ზედა პანელის მომრგვალება', min: 10, max: 40, suffix: 'px' },
  { key: 'headerPadding', label: 'ზედა პანელის შიდა დაშორება', min: 12, max: 32, suffix: 'px' },
  { key: 'tableCellPadding', label: 'ცხრილის უჯრების ჰორიზონტალური დაშორება', min: 6, max: 20, suffix: 'px' },
  { key: 'tableCellPaddingY', label: 'ცხრილის უჯრების ვერტიკალური დაშორება', min: 4, max: 20, suffix: 'px' },
  { key: 'tableHeaderFontSize', label: 'ცხრილის სათაურის ტექსტის ზომა', min: 10, max: 16, suffix: 'px' },
  { key: 'tableHeaderFontWeight', label: 'ცხრილის სათაურის ტექსტის სისქე', min: 400, max: 900, suffix: 'weight' },
  { key: 'tableRowFontSize', label: 'ცხრილის ჩანაწერის ტექსტის ზომა', min: 10, max: 18, suffix: 'px' },
  { key: 'tableRowMinHeight', label: 'ცხრილის რიგის მინიმალური სიმაღლე', min: 32, max: 80, suffix: 'px' },
  { key: 'filterControlHeight', label: 'ფილტრის ველების სიმაღლე', min: 32, max: 52, suffix: 'px' },
  { key: 'filterGap', label: 'ფილტრებს შორის დაშორება', min: 4, max: 24, suffix: 'px' },
  { key: 'inputFontSize', label: 'ფორმის ველების ტექსტის ზომა', min: 11, max: 18, suffix: 'px' },
  { key: 'inputFontWeight', label: 'ფორმის ველების ტექსტის სისქე', min: 300, max: 700, suffix: 'weight' },
  { key: 'inputRadius', label: 'ფორმის ველების მომრგვალება', min: 0, max: 20, suffix: 'px' },
  { key: 'inputHeight', label: 'ფორმის ველების სიმაღლე', min: 36, max: 52, suffix: 'px' },
  { key: 'inputFocusRingWidth', label: 'ველის ფოკუსის რგოლის სისქე', min: 0, max: 4, suffix: 'px' },
  { key: 'cardBorderWidth', label: 'ბარათის ჩარჩოს სისქე', min: 0, max: 3, suffix: 'px' },
  { key: 'cardShadowBlur', label: 'ბარათის ჩრდილის სიძლიერე', min: 0, max: 36, suffix: 'px' },
  { key: 'modalRadius', label: 'მოდალის კუთხეების მომრგვალება', min: 12, max: 40, suffix: 'px' },
  { key: 'modalPadding', label: 'მოდალის შიდა დაშორება', min: 12, max: 36, suffix: 'px' },
  { key: 'modalOverlayOpacity', label: 'გარე ფონის გამუქება', min: 40, max: 95, suffix: '%' }
];

const COMPONENT_FIELDS = [
  {
    "key": "staff",
    "label": "თანამშრომლები",
    "properties": [
      {
        "key": "radius",
        "label": "კუთხეების მომრგვალება",
        "min": 0,
        "max": 48,
        "suffix": "px"
      },
      {
        "key": "padding",
        "label": "შიდა დაშორება",
        "min": 4,
        "max": 48,
        "suffix": "px"
      },
      {
        "key": "borderWidth",
        "label": "ჩარჩოს სისქე",
        "min": 0,
        "max": 4,
        "suffix": "px"
      },
      {
        "key": "shadowBlur",
        "label": "ჩრდილის სიძლიერე",
        "min": 0,
        "max": 40,
        "suffix": "px"
      },
      { "key": "fontSize", "label": "ტექსტის ზომა", "min": 10, "max": 20, "suffix": "px" },
      { "key": "titleFontSize", "label": "სათაურის ზომა", "min": 12, "max": 28, "suffix": "px" },
      { "key": "titleFontWeight", "label": "სათაურის სისქე", "min": 400, "max": 900, "suffix": "weight" },
      { "key": "bodyFontWeight", "label": "ტექსტის სისქე", "min": 300, "max": 800, "suffix": "weight" }
    ]
  },
  {
    "key": "inventory",
    "label": "მარაგები",
    "properties": [
      {
        "key": "radius",
        "label": "კუთხეების მომრგვალება",
        "min": 0,
        "max": 48,
        "suffix": "px"
      },
      {
        "key": "padding",
        "label": "შიდა დაშორება",
        "min": 4,
        "max": 48,
        "suffix": "px"
      },
      {
        "key": "borderWidth",
        "label": "ჩარჩოს სისქე",
        "min": 0,
        "max": 4,
        "suffix": "px"
      },
      {
        "key": "shadowBlur",
        "label": "ჩრდილის სიძლიერე",
        "min": 0,
        "max": 40,
        "suffix": "px"
      },
      { "key": "fontSize", "label": "ტექსტის ზომა", "min": 10, "max": 20, "suffix": "px" },
      { "key": "titleFontSize", "label": "სათაურის ზომა", "min": 12, "max": 28, "suffix": "px" },
      { "key": "titleFontWeight", "label": "სათაურის სისქე", "min": 400, "max": 900, "suffix": "weight" },
      { "key": "bodyFontWeight", "label": "ტექსტის სისქე", "min": 300, "max": 800, "suffix": "weight" }
    ]
  },
  {
    "key": "analytics",
    "label": "ანალიტიკა",
    "properties": [
      {
        "key": "radius",
        "label": "კუთხეების მომრგვალება",
        "min": 0,
        "max": 48,
        "suffix": "px"
      },
      {
        "key": "padding",
        "label": "შიდა დაშორება",
        "min": 4,
        "max": 48,
        "suffix": "px"
      },
      {
        "key": "borderWidth",
        "label": "ჩარჩოს სისქე",
        "min": 0,
        "max": 4,
        "suffix": "px"
      },
      {
        "key": "shadowBlur",
        "label": "ჩრდილის სიძლიერე",
        "min": 0,
        "max": 40,
        "suffix": "px"
      },
      { "key": "fontSize", "label": "ტექსტის ზომა", "min": 10, "max": 20, "suffix": "px" },
      { "key": "titleFontSize", "label": "სათაურის ზომა", "min": 12, "max": 28, "suffix": "px" },
      { "key": "titleFontWeight", "label": "სათაურის სისქე", "min": 400, "max": 900, "suffix": "weight" },
      { "key": "bodyFontWeight", "label": "ტექსტის სისქე", "min": 300, "max": 800, "suffix": "weight" }
    ]
  },
  {
    "key": "orders",
    "label": "შეკვეთები",
    "properties": [
      {
        "key": "radius",
        "label": "კუთხეების მომრგვალება",
        "min": 0,
        "max": 48,
        "suffix": "px"
      },
      {
        "key": "padding",
        "label": "შიდა დაშორება",
        "min": 4,
        "max": 48,
        "suffix": "px"
      },
      {
        "key": "borderWidth",
        "label": "ჩარჩოს სისქე",
        "min": 0,
        "max": 4,
        "suffix": "px"
      },
      {
        "key": "shadowBlur",
        "label": "ჩრდილის სიძლიერე",
        "min": 0,
        "max": 40,
        "suffix": "px"
      },
      { "key": "fontSize", "label": "ტექსტის ზომა", "min": 10, "max": 20, "suffix": "px" },
      { "key": "titleFontSize", "label": "სათაურის ზომა", "min": 12, "max": 28, "suffix": "px" },
      { "key": "titleFontWeight", "label": "სათაურის სისქე", "min": 400, "max": 900, "suffix": "weight" },
      { "key": "bodyFontWeight", "label": "ტექსტის სისქე", "min": 300, "max": 800, "suffix": "weight" }
    ]
  },
  {
    "key": "support",
    "label": "მხარდაჭერა",
    "properties": [
      {
        "key": "radius",
        "label": "კუთხეების მომრგვალება",
        "min": 0,
        "max": 48,
        "suffix": "px"
      },
      {
        "key": "padding",
        "label": "შიდა დაშორება",
        "min": 4,
        "max": 48,
        "suffix": "px"
      },
      {
        "key": "borderWidth",
        "label": "ჩარჩოს სისქე",
        "min": 0,
        "max": 4,
        "suffix": "px"
      },
      {
        "key": "shadowBlur",
        "label": "ჩრდილის სიძლიერე",
        "min": 0,
        "max": 40,
        "suffix": "px"
      },
      { "key": "fontSize", "label": "ტექსტის ზომა", "min": 10, "max": 20, "suffix": "px" },
      { "key": "titleFontSize", "label": "სათაურის ზომა", "min": 12, "max": 28, "suffix": "px" },
      { "key": "titleFontWeight", "label": "სათაურის სისქე", "min": 400, "max": 900, "suffix": "weight" },
      { "key": "bodyFontWeight", "label": "ტექსტის სისქე", "min": 300, "max": 800, "suffix": "weight" }
    ]
  },
  {
    "key": "discounts",
    "label": "ფასდაკლებები",
    "properties": [
      {
        "key": "radius",
        "label": "კუთხეების მომრგვალება",
        "min": 0,
        "max": 48,
        "suffix": "px"
      },
      {
        "key": "padding",
        "label": "შიდა დაშორება",
        "min": 4,
        "max": 48,
        "suffix": "px"
      },
      {
        "key": "borderWidth",
        "label": "ჩარჩოს სისქე",
        "min": 0,
        "max": 4,
        "suffix": "px"
      },
      {
        "key": "shadowBlur",
        "label": "ჩრდილის სიძლიერე",
        "min": 0,
        "max": 40,
        "suffix": "px"
      },
      { "key": "fontSize", "label": "ტექსტის ზომა", "min": 10, "max": 20, "suffix": "px" },
      { "key": "titleFontSize", "label": "სათაურის ზომა", "min": 12, "max": 28, "suffix": "px" },
      { "key": "titleFontWeight", "label": "სათაურის სისქე", "min": 400, "max": 900, "suffix": "weight" },
      { "key": "bodyFontWeight", "label": "ტექსტის სისქე", "min": 300, "max": 800, "suffix": "weight" }
    ]
  },
  {
    "key": "banners",
    "label": "ბანერები",
    "properties": [
      {
        "key": "radius",
        "label": "კუთხეების მომრგვალება",
        "min": 0,
        "max": 48,
        "suffix": "px"
      },
      {
        "key": "padding",
        "label": "შიდა დაშორება",
        "min": 4,
        "max": 48,
        "suffix": "px"
      },
      {
        "key": "borderWidth",
        "label": "ჩარჩოს სისქე",
        "min": 0,
        "max": 4,
        "suffix": "px"
      },
      {
        "key": "shadowBlur",
        "label": "ჩრდილის სიძლიერე",
        "min": 0,
        "max": 40,
        "suffix": "px"
      },
      { "key": "fontSize", "label": "ტექსტის ზომა", "min": 10, "max": 20, "suffix": "px" },
      { "key": "titleFontSize", "label": "სათაურის ზომა", "min": 12, "max": 28, "suffix": "px" },
      { "key": "titleFontWeight", "label": "სათაურის სისქე", "min": 400, "max": 900, "suffix": "weight" },
      { "key": "bodyFontWeight", "label": "ტექსტის სისქე", "min": 300, "max": 800, "suffix": "weight" }
    ]
  },
  {
    "key": "categories",
    "label": "კატეგორიები",
    "properties": [
      {
        "key": "radius",
        "label": "კუთხეების მომრგვალება",
        "min": 0,
        "max": 48,
        "suffix": "px"
      },
      {
        "key": "padding",
        "label": "შიდა დაშორება",
        "min": 4,
        "max": 48,
        "suffix": "px"
      },
      {
        "key": "borderWidth",
        "label": "ჩარჩოს სისქე",
        "min": 0,
        "max": 4,
        "suffix": "px"
      },
      {
        "key": "shadowBlur",
        "label": "ჩრდილის სიძლიერე",
        "min": 0,
        "max": 40,
        "suffix": "px"
      },
      { "key": "fontSize", "label": "ტექსტის ზომა", "min": 10, "max": 20, "suffix": "px" },
      { "key": "titleFontSize", "label": "სათაურის ზომა", "min": 12, "max": 28, "suffix": "px" },
      { "key": "titleFontWeight", "label": "სათაურის სისქე", "min": 400, "max": 900, "suffix": "weight" },
      { "key": "bodyFontWeight", "label": "ტექსტის სისქე", "min": 300, "max": 800, "suffix": "weight" }
    ]
  },
  {
    "key": "coupons",
    "label": "კუპონები",
    "properties": [
      {
        "key": "radius",
        "label": "კუთხეების მომრგვალება",
        "min": 0,
        "max": 48,
        "suffix": "px"
      },
      {
        "key": "padding",
        "label": "შიდა დაშორება",
        "min": 4,
        "max": 48,
        "suffix": "px"
      },
      {
        "key": "borderWidth",
        "label": "ჩარჩოს სისქე",
        "min": 0,
        "max": 4,
        "suffix": "px"
      },
      {
        "key": "shadowBlur",
        "label": "ჩრდილის სიძლიერე",
        "min": 0,
        "max": 40,
        "suffix": "px"
      },
      { "key": "fontSize", "label": "ტექსტის ზომა", "min": 10, "max": 20, "suffix": "px" },
      { "key": "titleFontSize", "label": "სათაურის ზომა", "min": 12, "max": 28, "suffix": "px" },
      { "key": "titleFontWeight", "label": "სათაურის სისქე", "min": 400, "max": 900, "suffix": "weight" },
      { "key": "bodyFontWeight", "label": "ტექსტის სისქე", "min": 300, "max": 800, "suffix": "weight" }
    ]
  }
];

const PRESETS = {
  emerald: { accent: '#34d399', canvas: '#020617', panel: '#0f172a', surface: '#020617', text: '#f8fafc', muted: '#94a3b8', border: '#334155', navActiveBackground: '#34d399', navActiveText: '#020617', navInactiveBackground: '#020617', navInactiveText: '#94a3b8', headerBackground: '#0f172a', headerBorder: '#334155', tableHeaderBackground: '#020617', tableHeaderText: '#94a3b8', tableRowBackground: '#0f172a', tableRowHover: '#172554', filterBackground: '#020617', filterText: '#f8fafc', filterBorder: '#334155', primaryButtonBackground: '#059669', primaryButtonText: '#ffffff', primaryButtonBorder: '#10b981', inputBackground: '#020617', inputText: '#f8fafc', inputBorder: '#334155', inputFocus: '#34d399', contentCardBackground: '#0f172a', contentCardBorder: '#334155', cardTitleText: '#f8fafc', cardMutedText: '#94a3b8', cardShadowColor: '#000000', cardHoverBorder: '#34d399', modalBackground: '#0d0d10', modalText: '#f8fafc', modalBorder: '#334155', modalOverlayBackground: '#020617', staffSectionBackground: '#0f172a', staffSectionBorder: '#334155', inventorySectionBackground: '#0f172a', inventorySectionBorder: '#334155', analyticsSectionBackground: '#0f172a', analyticsSectionBorder: '#334155', supportSectionBorder: '#334155', supportSectionBackground: '#0f172a', ordersSectionBorder: '#334155', ordersSectionBackground: '#0f172a' , discountsSectionBackground: '#0f172a', discountsSectionBorder: '#334155', bannersSectionBackground: '#0f172a', bannersSectionBorder: '#334155', categoriesSectionBackground: '#0f172a', categoriesSectionBorder: '#334155', couponsSectionBackground: '#0f172a', couponsSectionBorder: '#334155'},
  blue: { accent: '#60a5fa', canvas: '#0b1220', panel: '#142033', surface: '#0b1728', text: '#f8fafc', muted: '#a8b7ca', border: '#34445c', navActiveBackground: '#60a5fa', navActiveText: '#0b1220', navInactiveBackground: '#0b1728', navInactiveText: '#a8b7ca', headerBackground: '#142033', headerBorder: '#34445c', tableHeaderBackground: '#0b1728', tableHeaderText: '#a8b7ca', tableRowBackground: '#142033', tableRowHover: '#1e3a5f', filterBackground: '#0b1728', filterText: '#f8fafc', filterBorder: '#34445c', primaryButtonBackground: '#2563eb', primaryButtonText: '#ffffff', primaryButtonBorder: '#60a5fa', inputBackground: '#0b1728', inputText: '#f8fafc', inputBorder: '#34445c', inputFocus: '#60a5fa', contentCardBackground: '#142033', contentCardBorder: '#34445c', cardTitleText: '#f8fafc', cardMutedText: '#a8b7ca', cardShadowColor: '#020617', cardHoverBorder: '#60a5fa', modalBackground: '#142033', modalText: '#f8fafc', modalBorder: '#34445c', modalOverlayBackground: '#020617', staffSectionBackground: '#142033', staffSectionBorder: '#34445c', inventorySectionBackground: '#142033', inventorySectionBorder: '#34445c', analyticsSectionBackground: '#142033', analyticsSectionBorder: '#34445c' , ordersSectionBackground: '#142033', ordersSectionBorder: '#34445c', supportSectionBackground: '#142033', supportSectionBorder: '#34445c', discountsSectionBackground: '#142033', discountsSectionBorder: '#34445c', bannersSectionBackground: '#142033', bannersSectionBorder: '#34445c', categoriesSectionBackground: '#142033', categoriesSectionBorder: '#34445c', couponsSectionBackground: '#142033', couponsSectionBorder: '#34445c'},
  violet: { accent: '#c4b5fd', canvas: '#100d1d', panel: '#211a33', surface: '#171326', text: '#faf8ff', muted: '#b8aecb', border: '#493d60', navActiveBackground: '#c4b5fd', navActiveText: '#100d1d', navInactiveBackground: '#171326', navInactiveText: '#b8aecb', headerBackground: '#211a33', headerBorder: '#493d60', tableHeaderBackground: '#171326', tableHeaderText: '#b8aecb', tableRowBackground: '#211a33', tableRowHover: '#33264f', filterBackground: '#171326', filterText: '#faf8ff', filterBorder: '#493d60', primaryButtonBackground: '#7c3aed', primaryButtonText: '#ffffff', primaryButtonBorder: '#c4b5fd', inputBackground: '#171326', inputText: '#faf8ff', inputBorder: '#493d60', inputFocus: '#c4b5fd', contentCardBackground: '#211a33', contentCardBorder: '#493d60', cardTitleText: '#faf8ff', cardMutedText: '#b8aecb', cardShadowColor: '#100d1d', cardHoverBorder: '#c4b5fd', modalBackground: '#211a33', modalText: '#faf8ff', modalBorder: '#493d60', modalOverlayBackground: '#100d1d', staffSectionBackground: '#211a33', staffSectionBorder: '#493d60', inventorySectionBackground: '#211a33', inventorySectionBorder: '#493d60', analyticsSectionBackground: '#211a33', analyticsSectionBorder: '#493d60' , ordersSectionBackground: '#211a33', ordersSectionBorder: '#493d60', supportSectionBackground: '#211a33', supportSectionBorder: '#493d60', discountsSectionBackground: '#211a33', discountsSectionBorder: '#493d60', bannersSectionBackground: '#211a33', bannersSectionBorder: '#493d60', categoriesSectionBackground: '#211a33', categoriesSectionBorder: '#493d60', couponsSectionBackground: '#211a33', couponsSectionBorder: '#493d60'},
  light: { accent: '#0f766e', canvas: '#eef2f7', panel: '#ffffff', surface: '#f8fafc', text: '#172033', muted: '#596579', border: '#cbd5e1', navActiveBackground: '#0f766e', navActiveText: '#ffffff', navInactiveBackground: '#f8fafc', navInactiveText: '#596579', headerBackground: '#ffffff', headerBorder: '#cbd5e1', tableHeaderBackground: '#f1f5f9', tableHeaderText: '#596579', tableRowBackground: '#ffffff', tableRowHover: '#e2e8f0', filterBackground: '#ffffff', filterText: '#172033', filterBorder: '#cbd5e1', primaryButtonBackground: '#0f766e', primaryButtonText: '#ffffff', primaryButtonBorder: '#0f766e', inputBackground: '#ffffff', inputText: '#172033', inputBorder: '#cbd5e1', inputFocus: '#0f766e', contentCardBackground: '#ffffff', contentCardBorder: '#cbd5e1', cardTitleText: '#172033', cardMutedText: '#596579', cardShadowColor: '#64748b', cardHoverBorder: '#0f766e', modalBackground: '#ffffff', modalText: '#172033', modalBorder: '#cbd5e1', modalOverlayBackground: '#64748b', staffSectionBackground: '#ffffff', staffSectionBorder: '#cbd5e1', inventorySectionBackground: '#ffffff', inventorySectionBorder: '#cbd5e1', analyticsSectionBackground: '#ffffff', analyticsSectionBorder: '#cbd5e1' , ordersSectionBackground: '#ffffff', ordersSectionBorder: '#cbd5e1', supportSectionBackground: '#ffffff', supportSectionBorder: '#cbd5e1', discountsSectionBackground: '#ffffff', discountsSectionBorder: '#cbd5e1', bannersSectionBackground: '#ffffff', bannersSectionBorder: '#cbd5e1', categoriesSectionBackground: '#ffffff', categoriesSectionBorder: '#cbd5e1', couponsSectionBackground: '#ffffff', couponsSectionBorder: '#cbd5e1'}
};

export default function AdminPanelVisualEditor({ design, onChange, onRetrySave, onReloadRemote, syncStatus = 'saved' }) {
  const [viewport, setViewport] = useState('desktop');
  const [elementSearch, setElementSearch] = useState('');
  const [elementCategory, setElementCategory] = useState('all');
  const [showCustomizedOnly, setShowCustomizedOnly] = useState(false);
  const [selectedElementKey, setSelectedElementKey] = useState('');
  const [selectedElementKeys, setSelectedElementKeys] = useState([]);
  const [selectedStylePresetIds, setSelectedStylePresetIds] = useState([]);
  const [stylePresetSearch, setStylePresetSearch] = useState('');
  const [stylePresetCategory, setStylePresetCategory] = useState('all');
  const [stylePresetSort, setStylePresetSort] = useState('newest');
  const [showFavoriteStylePresets, setShowFavoriteStylePresets] = useState(false);
  const [expandedStyleHistoryId, setExpandedStyleHistoryId] = useState(null);
  const [expandedStyleBackupId, setExpandedStyleBackupId] = useState(null);
  const [bulkStylePresetCategory, setBulkStylePresetCategory] = useState('საერთო');
  const elementCardRefs = useRef({});
  const stylePresetFileInputRef = useRef(null);
  const stylePresetImportModeRef = useRef('merge');
  const normalized = useMemo(() => normalizeAdminPanelVisualDesign(design), [design]);
  const expandedStyleBackup = useMemo(
    () => normalized.stylePresetBackups.find(backup => backup.id === expandedStyleBackupId) || null,
    [normalized.stylePresetBackups, expandedStyleBackupId]
  );
  const expandedStyleBackupDiff = useMemo(() => {
    if (!expandedStyleBackup) return { added: [], removed: [], changed: [] };
    const currentById = new Map(normalized.stylePresets.map(preset => [preset.id, preset]));
    const backupById = new Map(expandedStyleBackup.stylePresets.map(preset => [preset.id, preset]));
    const added = expandedStyleBackup.stylePresets.filter(preset => !currentById.has(preset.id));
    const removed = normalized.stylePresets.filter(preset => !backupById.has(preset.id));
    const changed = expandedStyleBackup.stylePresets.filter(preset => {
      const current = currentById.get(preset.id);
      return current && JSON.stringify(current) !== JSON.stringify(preset);
    });
    return { added, removed, changed };
  }, [expandedStyleBackup, normalized.stylePresets]);
  const historyRef = useRef({ past: [], future: [], present: normalized });
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });

  useEffect(() => {
    const current = historyRef.current;
    if (JSON.stringify(current.present) !== JSON.stringify(normalized)) {
      historyRef.current = { past: [], future: [], present: normalized };
      setHistoryState({ canUndo: false, canRedo: false });
    }
  }, [normalized]);

  const commitChange = nextDesign => {
    const current = historyRef.current;
    const next = normalizeAdminPanelVisualDesign(nextDesign);
    if (JSON.stringify(current.present) === JSON.stringify(next)) return;
    const past = [...current.past, current.present].slice(-50);
    historyRef.current = { past, future: [], present: next };
    setHistoryState({ canUndo: past.length > 0, canRedo: false });
    onChange(next);
  };

  const undoChange = () => {
    const current = historyRef.current;
    if (!current.past.length) return;
    const previous = current.past[current.past.length - 1];
    const past = current.past.slice(0, -1);
    const future = [current.present, ...current.future].slice(0, 50);
    historyRef.current = { past, future, present: previous };
    setHistoryState({ canUndo: past.length > 0, canRedo: future.length > 0 });
    onChange(previous);
  };

  const redoChange = () => {
    const current = historyRef.current;
    if (!current.future.length) return;
    const next = current.future[0];
    const future = current.future.slice(1);
    const past = [...current.past, current.present].slice(-50);
    historyRef.current = { past, future, present: next };
    setHistoryState({ canUndo: past.length > 0, canRedo: future.length > 0 });
    onChange(next);
  };

  useEffect(() => {
    const handleHistoryShortcut = event => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const target = event.target;
      if (target?.closest?.('input:not([type="range"]):not([type="color"]), textarea, select, [contenteditable="true"]')) return;

      const key = event.key.toLowerCase();
      if (key === 'z' && event.shiftKey) {
        event.preventDefault();
        redoChange();
      } else if (key === 'y') {
        event.preventDefault();
        redoChange();
      } else if (key === 'z') {
        event.preventDefault();
        undoChange();
      }
    };

    window.addEventListener('keydown', handleHistoryShortcut);
    return () => window.removeEventListener('keydown', handleHistoryShortcut);
  }, [undoChange, redoChange]);
  const active = viewport === 'desktop'
    ? { theme: normalized.theme, layout: normalized.layout, components: normalized.components, elementStyles: normalized.elementStyles }
    : {
        theme: { ...normalized.theme, ...(normalized.responsive?.[viewport]?.theme || {}) },
        layout: { ...normalized.layout, ...(normalized.responsive?.[viewport]?.layout || {}) },
        components: Object.fromEntries(Object.entries(normalized.components).map(([key, value]) => [
          key, { ...value, ...(normalized.responsive?.[viewport]?.components?.[key] || {}) }
        ])),
        elementStyles: Object.fromEntries(Object.entries(normalized.elementStyles).map(([key, value]) => [
          key, { ...value, ...(normalized.responsive?.[viewport]?.elementStyles?.[key] || {}) }
        ]))
      };

  const customizedElementKeys = useMemo(() => new Set(
    Object.keys(ADMIN_PANEL_ELEMENT_DEFINITIONS).filter(key => {
      if (viewport === 'desktop') {
        return JSON.stringify(normalized.elementStyles[key]) !== JSON.stringify(DEFAULT_ADMIN_PANEL_VISUAL_DESIGN.elementStyles[key]);
      }
      const viewportOverrides = normalized.responsive?.[viewport]?.elementStyles?.[key];
      return Boolean(viewportOverrides && Object.keys(viewportOverrides).length > 0);
    })
  ), [normalized, viewport]);

  const filteredElementEntries = useMemo(() => {
    const query = elementSearch.trim().toLocaleLowerCase();
    const category = ELEMENT_CATEGORIES.find(item => item.id === elementCategory);
    const allowedKeys = category ? new Set(category.keys) : null;
    return Object.entries(ADMIN_PANEL_ELEMENT_DEFINITIONS).filter(([key, item]) => {
      if (allowedKeys && !allowedKeys.has(key)) return false;
      if (showCustomizedOnly && !customizedElementKeys.has(key)) return false;
      if (!query) return true;
      return item.label.toLocaleLowerCase().includes(query) || key.toLocaleLowerCase().includes(query) || item.selector.toLocaleLowerCase().includes(query);
    });
  }, [elementSearch, elementCategory, showCustomizedOnly, customizedElementKeys]);

  const focusElementEditor = key => {
    setSelectedElementKey(key);
    elementCardRefs.current[key]?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  };

  const updateValue = (group, key, value) => {
    if (viewport === 'desktop') {
      commitChange(normalizeAdminPanelVisualDesign({
        ...normalized,
        [group]: { ...normalized[group], [key]: value }
      }));
      return;
    }

    commitChange(normalizeAdminPanelVisualDesign({
      ...normalized,
      responsive: {
        ...(normalized.responsive || {}),
        [viewport]: {
          ...(normalized.responsive?.[viewport] || {}),
          [group]: {
            ...(normalized.responsive?.[viewport]?.[group] || {}),
            [key]: value
          }
        }
      }
    }));
  };

  const updateContentValue = (key, value) => {
    commitChange(normalizeAdminPanelVisualDesign({
      ...normalized,
      content: { ...normalized.content, [key]: value }
    }));
  };

  const updateComponentValue = (component, property, value) => {
    if (viewport === 'desktop') {
      commitChange(normalizeAdminPanelVisualDesign({
        ...normalized,
        components: {
          ...normalized.components,
          [component]: { ...normalized.components[component], [property]: value }
        }
      }));
      return;
    }

    commitChange(normalizeAdminPanelVisualDesign({
      ...normalized,
      responsive: {
        ...(normalized.responsive || {}),
        [viewport]: {
          ...(normalized.responsive?.[viewport] || {}),
          components: {
            ...(normalized.responsive?.[viewport]?.components || {}),
            [component]: {
              ...(normalized.responsive?.[viewport]?.components?.[component] || {}),
              [property]: value
            }
          }
        }
      }
    }));
  };

  const updateElementValue = (element, property, value) => {
    if (viewport === 'desktop') {
      commitChange(normalizeAdminPanelVisualDesign({
        ...normalized,
        elementStyles: {
          ...normalized.elementStyles,
          [element]: { ...normalized.elementStyles[element], [property]: value }
        }
      }));
      return;
    }
    commitChange(normalizeAdminPanelVisualDesign({
      ...normalized,
      responsive: {
        ...(normalized.responsive || {}),
        [viewport]: {
          ...(normalized.responsive?.[viewport] || {}),
          elementStyles: {
            ...(normalized.responsive?.[viewport]?.elementStyles || {}),
            [element]: {
              ...(normalized.responsive?.[viewport]?.elementStyles?.[element] || {}),
              [property]: value
            }
          }
        }
      }
    }));
  };

  const saveSelectedElementStyle = () => {
    if (!selectedElementKey) return;
    const name = window.prompt('დაარქვით სახელი შენახულ სტილს:', ADMIN_PANEL_ELEMENT_DEFINITIONS[selectedElementKey]?.label || 'ჩემი სტილი');
    if (!name || !name.trim()) return;
    if (normalized.stylePresets.length >= 30) { window.alert('სტილების ბიბლიოთეკის მაქსიმალური რაოდენობაა 30.'); return; }
    const style = { ...(active.elementStyles[selectedElementKey] || {}) };
    const category = ELEMENT_CATEGORIES.find(item => item.keys.includes(selectedElementKey))?.label || 'საერთო';
    const id = `admin-style-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    commitChange(normalizeAdminPanelVisualDesign({ ...normalized, stylePresets: [...normalized.stylePresets, { id, name: name.trim().slice(0, 40), category, createdAt: new Date().toISOString(), style }] }));
  };
  const renameSavedElementStyle = id => {
    const preset = normalized.stylePresets.find(item => item.id === id);
    if (!preset) return;
    const name = window.prompt('შეცვალეთ შენახული სტილის სახელი:', preset.name);
    if (!name || !name.trim()) return;
    commitChange(normalizeAdminPanelVisualDesign({
      ...normalized,
      stylePresets: normalized.stylePresets.map(item => item.id === id ? { ...item, name: name.trim().slice(0, 40) } : item)
    }));
  };
  const updateSavedStyleFromSelectedElement = preset => {
    if (!preset || !selectedElementKey) return;
    const currentStyle = { ...(preset.style || {}) };
    const nextStyle = { ...(active.elementStyles[selectedElementKey] || {}) };
    if (JSON.stringify(currentStyle) === JSON.stringify(nextStyle)) {
      window.alert('არჩეული ელემენტის სტილი უკვე ემთხვევა შენახულ ვერსიას.');
      return;
    }
    const history = [...(preset.history || []), { savedAt: new Date().toISOString(), style: currentStyle }].slice(-10);
    commitChange(normalizeAdminPanelVisualDesign({
      ...normalized,
      stylePresets: normalized.stylePresets.map(item => item.id === preset.id ? { ...item, style: nextStyle, history } : item)
    }));
  };
  const restoreSavedStyleVersion = (preset, historyIndex) => {
    if (!preset || !Number.isInteger(historyIndex)) return;
    const previous = preset.history?.[historyIndex];
    if (!previous?.style) return;
    const history = [...(preset.history || []), { savedAt: new Date().toISOString(), style: { ...preset.style } }].slice(-10);
    commitChange(normalizeAdminPanelVisualDesign({
      ...normalized,
      stylePresets: normalized.stylePresets.map(item => item.id === preset.id ? { ...item, style: { ...previous.style }, history } : item)
    }));
  };
  const duplicateSavedElementStyle = preset => {
    if (!preset || normalized.stylePresets.length >= 30) return;
    const name = window.prompt('დაარქვით ასლს სახელი:', `${preset.name} — ასლი`);
    if (!name || !name.trim()) return;
    const id = `admin-style-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    commitChange(normalizeAdminPanelVisualDesign({
      ...normalized,
      stylePresets: [...normalized.stylePresets, { ...preset, id, name: name.trim().slice(0, 40), createdAt: new Date().toISOString(), style: { ...preset.style } }]
    }));
  };
  const applySavedElementStyleToTargets = (preset, targetKeys) => {
    const keys = [...new Set(targetKeys)].filter(key => ADMIN_PANEL_ELEMENT_DEFINITIONS[key]);
    if (!keys.length || !preset?.style) return;
    const next = { ...normalized };
    if (viewport === 'desktop') {
      next.elementStyles = { ...next.elementStyles };
      keys.forEach(key => {
        next.elementStyles[key] = { ...next.elementStyles[key], ...preset.style };
      });
    } else {
      const currentViewport = next.responsive?.[viewport] || {};
      const elementStyles = { ...(currentViewport.elementStyles || {}) };
      keys.forEach(key => {
        elementStyles[key] = { ...(elementStyles[key] || {}), ...preset.style };
      });
      next.responsive = { ...next.responsive, [viewport]: { ...currentViewport, elementStyles } };
    }
    commitChange(normalizeAdminPanelVisualDesign(next));
  };
  const applySavedElementStyle = preset => applySavedElementStyleToTargets(preset, selectedElementKey ? [selectedElementKey] : []);
  const applySavedElementStyleToSelected = preset => {
    if (!selectedElementKeys.length) return;
    applySavedElementStyleToTargets(preset, selectedElementKeys);
  };
  const toggleElementBatchSelection = key => setSelectedElementKeys(current => current.includes(key) ? current.filter(item => item !== key) : [...current, key]);
  const selectAllFilteredElements = () => setSelectedElementKeys(filteredElementEntries.map(([key]) => key));
  const removeSavedElementStyle = id => {
    const target = normalized.stylePresets.find(item => item.id === id);
    if (!target || !window.confirm(`წაიშალოს სტილი „${target.name}“? წაშლამდე ავტომატური ასლი შეინახება.`)) return;
    const protectedDesign = createAdminStylePresetBackup(normalized, `სტილის წაშლამდე: ${target.name}`);
    commitChange(normalizeAdminPanelVisualDesign({ ...protectedDesign, stylePresets: protectedDesign.stylePresets.filter(item => item.id !== id) }));
    setSelectedStylePresetIds(current => current.filter(selectedId => selectedId !== id));
  };
  const restoreSingleStyleFromBackup = (backup, preset) => {
    if (!backup || !preset?.id || !preset?.style) return;
    const current = normalized.stylePresets.find(item => item.id === preset.id);
    const getStyleKey = style => JSON.stringify(Object.entries(style || {}).sort(([left], [right]) => left.localeCompare(right)));
    const duplicate = normalized.stylePresets.find(item => item.id !== preset.id && getStyleKey(item.style) === getStyleKey(preset.style));
    if (duplicate) {
      window.alert(`ეს სტილი უკვე არსებობს ბიბლიოთეკაში სახელით „${duplicate.name}“. დუბლიკატი არ დაემატა.`);
      return;
    }
    if (!current && normalized.stylePresets.length >= 30) {
      window.alert('სტილების ბიბლიოთეკა სავსეა (30/30). ერთი სტილის აღსადგენად ჯერ წაშალეთ ან გააერთიანეთ რომელიმე სტილი.');
      return;
    }
    if (current && JSON.stringify(current) === JSON.stringify(preset)) {
      window.alert('ეს სტილი უკვე ემთხვევა სარეზერვო ასლში შენახულ ვერსიას.');
      return;
    }
    const action = current ? 'განახლდება არსებული სტილი' : 'დაემატება ახალი სტილი';
    const rotationWarning = normalized.stylePresetBackups.length >= 10 ? '\\nშენიშვნა: მიმდინარე მდგომარეობის დაცვისას ყველაზე ძველი სარეზერვო ასლი ჩანაცვლდება.' : '';
    if (!window.confirm(`აღდგეს მხოლოდ „${preset.name}“? ${action}. დანარჩენი სტილები უცვლელი დარჩება. მიმდინარე მდგომარეობა ავტომატურად შეინახება.${rotationWarning}`)) return;
    const protectedDesign = createAdminStylePresetBackup(normalized, `ერთი სტილის აღდგენამდე: ${preset.name}`);
    const restoredAt = new Date().toISOString();
    const restoredPreset = current ? {
      ...preset,
      history: [...(preset.history || []), ...(current.history || []), { savedAt: restoredAt, style: { ...current.style } }].slice(-10)
    } : { ...preset, history: (preset.history || []).slice(-10) };
    const stylePresets = current
      ? protectedDesign.stylePresets.map(item => item.id === preset.id ? restoredPreset : item)
      : [...protectedDesign.stylePresets, restoredPreset];
    commitChange(normalizeAdminPanelVisualDesign({ ...protectedDesign, stylePresets }));
    setSelectedStylePresetIds([preset.id]);
  };

  const restoreAutomaticStyleBackup = backup => {
    if (!backup) return;
    const comparison = backup.id === expandedStyleBackupId ? expandedStyleBackupDiff : (() => {
      const currentById = new Map(normalized.stylePresets.map(preset => [preset.id, preset]));
      const backupById = new Map(backup.stylePresets.map(preset => [preset.id, preset]));
      return {
        added: backup.stylePresets.filter(preset => !currentById.has(preset.id)),
        removed: normalized.stylePresets.filter(preset => !backupById.has(preset.id)),
        changed: backup.stylePresets.filter(preset => {
          const current = currentById.get(preset.id);
          return current && JSON.stringify(current) !== JSON.stringify(preset);
        })
      };
    })();
    const summary = `დაემატება: ${comparison.added.length}, შეიცვლება: ${comparison.changed.length}, მიმდინარე ბიბლიოთეკიდან გაქრება: ${comparison.removed.length}`;
    if (!window.confirm(`აღდგეს ${backup.stylePresets.length} სტილი ${new Date(backup.savedAt).toLocaleString('ka-GE')} მდგომარეობიდან?\n${summary}. მიმდინარე ბიბლიოთეკაც ავტომატურად შეინახება.`)) return;
    const restored = restoreAdminStylePresetBackup(normalized, backup.id);
    if (restored === normalized || restored.stylePresets === normalized.stylePresets) return;
    commitChange(restored);
    setSelectedStylePresetIds([]);
  };
  const createManualStyleBackup = () => {
    if (!normalized.stylePresets.length) {
      window.alert('სარეზერვო ასლის შესაქმნელად სტილების ბიბლიოთეკა ცარიელი არ უნდა იყოს.');
      return;
    }
    if (normalized.stylePresetBackups.length >= 10 && !window.confirm('შენახულია უკვე 10 ასლი. ახალი ასლის შექმნისას ყველაზე ძველი ასლი წაიშლება. გაგრძელდეს?')) return;
    const next = createAdminStylePresetBackup(normalized, 'ხელით შექმნილი სარეზერვო ასლი');
    if (next.stylePresetBackups.length === normalized.stylePresetBackups.length
      && next.stylePresetBackups.every((item, index) => item.id === normalized.stylePresetBackups[index]?.id)) return;
    commitChange(next);
  };
  const renameAutomaticStyleBackup = backup => {
    const nextName = window.prompt('შეიყვანეთ სარეზერვო ასლის ახალი სახელი (მაქსიმუმ 100 სიმბოლო):', backup?.reason || '');
    if (nextName == null) return;
    const reason = nextName.trim().slice(0, 100);
    if (!reason) {
      window.alert('სარეზერვო ასლის სახელი ცარიელი არ უნდა იყოს.');
      return;
    }
    commitChange(normalizeAdminPanelVisualDesign({
      ...normalized,
      stylePresetBackups: normalized.stylePresetBackups.map(item => item.id === backup.id ? { ...item, reason } : item)
    }));
  };
  const deleteAutomaticStyleBackup = backup => {
    if (!backup || !window.confirm(`წაიშალოს სარეზერვო ასლი „${backup.reason}“? ეს არ შეცვლის მიმდინარე სტილების ბიბლიოთეკას.`)) return;
    commitChange(normalizeAdminPanelVisualDesign({
      ...normalized,
      stylePresetBackups: normalized.stylePresetBackups.filter(item => item.id !== backup.id)
    }));
  };
  const updateStylePresetCategory = (id, category) => {
    commitChange(normalizeAdminPanelVisualDesign({
      ...normalized,
      stylePresets: normalized.stylePresets.map(item => item.id === id ? { ...item, category } : item)
    }));
  };
  const updateSelectedStylePresetCategory = () => {
    if (!selectedStylePresets.length) return;
    commitChange(normalizeAdminPanelVisualDesign({
      ...normalized,
      stylePresets: normalized.stylePresets.map(item => selectedStylePresetIds.includes(item.id) ? { ...item, category: bulkStylePresetCategory } : item)
    }));
  };
  const toggleSelectedStylePresetFavorites = () => {
    if (!selectedStylePresets.length) return;
    const shouldFavorite = !selectedStylePresets.every(item => item.favorite);
    commitChange(normalizeAdminPanelVisualDesign({
      ...normalized,
      stylePresets: normalized.stylePresets.map(item => selectedStylePresetIds.includes(item.id) ? { ...item, favorite: shouldFavorite } : item)
    }));
  };
  const toggleStylePresetFavorite = id => {
    commitChange(normalizeAdminPanelVisualDesign({
      ...normalized,
      stylePresets: normalized.stylePresets.map(item => item.id === id ? { ...item, favorite: !item.favorite } : item)
    }));
  };
  const groupedStylePresets = useMemo(() => {
    const query = stylePresetSearch.trim().toLocaleLowerCase();
    const categoryOrder = ['საერთო', ...ELEMENT_CATEGORIES.map(item => item.label)];
    const filtered = normalized.stylePresets.filter(preset => {
      const matchesCategory = stylePresetCategory === 'all' || preset.category === stylePresetCategory;
      const matchesSearch = !query || `${preset.name} ${preset.category}`.toLocaleLowerCase().includes(query);
      const matchesFavorite = !showFavoriteStylePresets || preset.favorite;
      return matchesCategory && matchesSearch && matchesFavorite;
    });
    const sorted = [...filtered].sort((a, b) => {
      if (stylePresetSort === 'name') return a.name.localeCompare(b.name, 'ka');
      if (stylePresetSort === 'category') return categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) || a.name.localeCompare(b.name, 'ka');
      return (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0) || a.name.localeCompare(b.name, 'ka');
    });
    return categoryOrder.map(category => ({ category, items: sorted.filter(preset => preset.category === category) })).filter(group => group.items.length);
  }, [normalized.stylePresets, stylePresetSearch, stylePresetCategory, stylePresetSort, showFavoriteStylePresets]);
  const filteredStylePresets = useMemo(() => groupedStylePresets.flatMap(group => group.items), [groupedStylePresets]);
  const toggleStylePresetSelection = id => setSelectedStylePresetIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id]);
  const selectedStylePresets = normalized.stylePresets.filter(item => selectedStylePresetIds.includes(item.id));
  const duplicateStyleGroups = useMemo(() => {
    const stableStyleKey = style => JSON.stringify(Object.fromEntries(Object.entries(style || {}).sort(([a], [b]) => a.localeCompare(b))));
    const groups = new Map();
    normalized.stylePresets.forEach(preset => {
      const key = stableStyleKey(preset.style);
      const group = groups.get(key) || [];
      group.push(preset);
      groups.set(key, group);
    });
    return [...groups.values()].filter(group => group.length > 1);
  }, [normalized.stylePresets]);
  const selectDuplicateStylePresets = () => {
    const duplicateIds = duplicateStyleGroups.flatMap(group => group.slice(1).map(item => item.id));
    setSelectedStylePresetIds(duplicateIds);
  };
  const comparableStylePresets = selectedStylePresets.slice(0, 4);
  const styleComparisonFields = [
    { key: 'fontSize', label: 'ტექსტის ზომა', suffix: ' px' },
    { key: 'fontWeight', label: 'ტექსტის სისქე', suffix: '' },
    { key: 'borderRadius', label: 'კუთხეების მომრგვალება', suffix: ' px' },
    { key: 'padding', label: 'შიდა დაშორება', suffix: ' px' },
    { key: 'textAlign', label: 'ტექსტის გასწორება', suffix: '' },
    { key: 'textColor', label: 'ტექსტის ფერი', suffix: '' },
    { key: 'backgroundColor', label: 'ფონის ფერი', suffix: '' },
    { key: 'borderColor', label: 'ჩარჩოს ფერი', suffix: '' }
  ];
  const selectAllStylePresets = () => setSelectedStylePresetIds(normalized.stylePresets.map(item => item.id));
  const removeSelectedStylePresets = () => {
    if (!selectedStylePresets.length) return;
    if (!window.confirm(`წაიშალოს მონიშნული ${selectedStylePresets.length} სტილი? ეს მოქმედება შეეხება მხოლოდ სტილების ბიბლიოთეკას.`)) return;
    const selectedIds = new Set(selectedStylePresets.map(item => item.id));
    const protectedDesign = createAdminStylePresetBackup(normalized, `მონიშნული სტილების წაშლამდე: ${selectedStylePresets.length}`);
    commitChange(normalizeAdminPanelVisualDesign({ ...protectedDesign, stylePresets: protectedDesign.stylePresets.filter(item => !selectedIds.has(item.id)) }));
    setSelectedStylePresetIds([]);
  };
  const exportSavedElementStyles = (presets = normalized.stylePresets, filename = 'geostore-admin-style-presets.json', backupMetadata = null) => {
    if (!presets.length) return;
    const payload = {
      format: 'geostore-admin-style-presets',
      version: 2,
      exportedAt: new Date().toISOString(),
      metadata: {
        includesCategories: true,
        includesFavorites: true,
        includesVersionHistory: true,
        ...(backupMetadata ? { automaticBackup: backupMetadata } : {})
      },
      stylePresets: presets
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importSavedElementStyles = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 100 * 1024) throw new Error('ფაილი 100 KB-ზე დიდი არ უნდა იყოს.');
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed) && (parsed?.format !== 'geostore-admin-style-presets' || ![1, 2].includes(parsed?.version))) {
        throw new Error('JSON ფაილის ფორმატი ან ვერსია მხარდაჭერილი არ არის.');
      }
      const sourcePresets = Array.isArray(parsed) ? parsed : parsed.stylePresets;
      if (!Array.isArray(sourcePresets)) throw new Error('ფაილში GEOSTORE-ის სტილების სია ვერ მოიძებნა.');
      const validated = normalizeAdminPanelVisualDesign({ stylePresets: sourcePresets });
      if (!validated.stylePresets.length) throw new Error('ფაილში დასამატებელი ვალიდური სტილი არ არის.');
      if (stylePresetImportModeRef.current === 'restore') {
        const allowedStyleKeys = new Set(['fontSize', 'fontWeight', 'borderRadius', 'padding', 'textColor', 'backgroundColor', 'borderColor', 'textAlign']);
        const allowedCategories = new Set(['საერთო', 'შეკვეთები', 'თანამშრომლები', 'მარაგები', 'ანალიტიკა', 'მხარდაჭერა', 'ფასდაკლებები', 'ბანერები', 'კატეგორიები', 'კუპონები']);
        const validStyle = style => style && typeof style === 'object' && !Array.isArray(style) && Object.keys(style).length > 0
          && Object.entries(style).every(([key, value]) => {
            if (!allowedStyleKeys.has(key)) return false;
            if (['textColor', 'backgroundColor', 'borderColor'].includes(key)) return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
            if (key === 'textAlign') return ['left', 'center', 'right'].includes(value);
            const limits = { fontSize: [10, 24], fontWeight: [300, 900], borderRadius: [0, 32], padding: [0, 32] }[key];
            return typeof value === 'number' && Number.isFinite(value) && value >= limits[0] && value <= limits[1];
          });
        const ids = new Set();
        const invalidIndex = sourcePresets.findIndex(preset => {
          if (!preset || typeof preset !== 'object' || Array.isArray(preset)
            || typeof preset.id !== 'string' || !preset.id.trim() || preset.id.trim().length > 80
            || typeof preset.name !== 'string' || !preset.name.trim() || preset.name.trim().length > 40
            || !validStyle(preset.style) || (preset.category != null && !allowedCategories.has(preset.category))
            || (preset.favorite != null && typeof preset.favorite !== 'boolean')
            || (preset.createdAt != null && (typeof preset.createdAt !== 'string' || !Number.isFinite(Date.parse(preset.createdAt))))
            || (preset.history != null && (!Array.isArray(preset.history) || preset.history.length > 10
              || preset.history.some(entry => !entry || typeof entry.savedAt !== 'string' || !Number.isFinite(Date.parse(entry.savedAt)) || !validStyle(entry.style))))) return true;
          const id = typeof preset.id === 'string' ? preset.id.trim() : '';
          if (id && ids.has(id)) return true;
          if (id) ids.add(id);
          return false;
        });
        if (sourcePresets.length > 30) throw new Error('სარეზერვო ფაილში 30-ზე მეტი სტილია. აღდგენა შეჩერდა მონაცემების დაკარგვის თავიდან ასაცილებლად.');
        if (invalidIndex !== -1 || validated.stylePresets.length !== sourcePresets.length) {
          throw new Error(`სარეზერვო ფაილი დაზიანებულია ან არასრულია (სტილი №${invalidIndex + 1}). არსებული ბიბლიოთეკა უცვლელი დარჩა.`);
        }
        if (!window.confirm(`სრული აღდგენა ჩაანაცვლებს ამჟამინდელ ${normalized.stylePresets.length} სტილს სარეზერვო ფაილში არსებული ${validated.stylePresets.length} სტილით. მიმდინარე ბიბლიოთეკა ავტომატურად შეინახება. გაგრძელდეს?`)) return;
        const protectedDesign = createAdminStylePresetBackup(normalized, 'სრული JSON აღდგენის წინ');
        commitChange(normalizeAdminPanelVisualDesign({ ...protectedDesign, stylePresets: validated.stylePresets }));
        window.alert(`სარეზერვო ასლიდან აღდგა ${validated.stylePresets.length} სტილი.`);
        return;
      }
      const existingNames = new Set(normalized.stylePresets.map(item => item.name.toLocaleLowerCase()));
      const styleKey = style => JSON.stringify(Object.fromEntries(Object.entries(style || {}).sort(([a], [b]) => a.localeCompare(b))));
      const knownStyleKeys = new Set(normalized.stylePresets.map(item => styleKey(item.style)));
      let duplicateCount = 0;
      const uniqueImportedPresets = validated.stylePresets.filter(preset => {
        const key = styleKey(preset.style);
        if (knownStyleKeys.has(key)) { duplicateCount += 1; return false; }
        knownStyleKeys.add(key);
        return true;
      });
      const available = Math.max(0, 30 - normalized.stylePresets.length);
      const additions = uniqueImportedPresets.slice(0, available).map((preset, index) => {
        const baseName = preset.name.slice(0, 32);
        let name = baseName;
        let suffix = 2;
        while (existingNames.has(name.toLocaleLowerCase())) {
          const ending = ` (${suffix++})`;
          name = `${baseName.slice(0, 40 - ending.length)}${ending}`;
        }
        existingNames.add(name.toLocaleLowerCase());
        return {
          ...preset,
          id: `admin-style-import-${Date.now().toString(36)}-${index}-${Math.random().toString(36).slice(2, 6)}`,
          name
        };
      });
      if (!additions.length) throw new Error('ბიბლიოთეკა უკვე სავსეა (მაქსიმუმ 30 სტილი).');
      commitChange(normalizeAdminPanelVisualDesign({
        ...normalized,
        stylePresets: [...normalized.stylePresets, ...additions]
      }));
      const limitSkipped = Math.max(0, uniqueImportedPresets.length - additions.length);
      window.alert(`დაემატა ${additions.length} სტილი.${duplicateCount ? ` დუბლიკატი გამოტოვებულია: ${duplicateCount}.` : ''}${limitSkipped ? ` ლიმიტის გამო გამოტოვებულია: ${limitSkipped}.` : ''}`);
    } catch (error) {
      window.alert(error?.message || 'სტილების ფაილის იმპორტი ვერ შესრულდა.');
    } finally {
      stylePresetImportModeRef.current = 'merge';
      event.target.value = '';
    }
  };


  const applyPreset = preset => {
    if (!PRESETS[preset]) return;
    if (viewport === 'desktop') {
      commitChange(normalizeAdminPanelVisualDesign({ ...normalized, theme: PRESETS[preset] }));
      return;
    }
    commitChange(normalizeAdminPanelVisualDesign({
      ...normalized,
      responsive: {
        ...(normalized.responsive || {}),
        [viewport]: {
          ...(normalized.responsive?.[viewport] || {}),
          theme: PRESETS[preset]
        }
      }
    }));
  };

  const resetViewport = () => {
    commitChange(resetAdminPanelVisualViewport(normalized, viewport));
  };

  const resetElement = element => {
    commitChange(resetAdminPanelVisualElement(normalized, viewport, element));
  };

  return (
    <section className="admin-visual-editor-panel space-y-5 rounded-3xl border border-emerald-400/25 bg-slate-900/90 p-4 sm:p-6" aria-labelledby="admin-visual-editor-title">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-300">GEOSTORE / ADMIN STUDIO</p>
          <h2 id="admin-visual-editor-title" className="mt-1 text-lg font-black text-white">ადმინ პანელის დიზაინის რედაქტორი</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">ცვლილებები მყისიერად აისახება პანელზე და ინახება საერთო საცავში, რათა იმავე ადმინ-ანგარიშით ყველა მოწყობილობაზე გამოჩნდეს. მაღაზიის მომხმარებლის მხარეს არ ცვლის.</p>
          <p role="status" aria-live="polite" className={`mt-2 text-[11px] font-semibold ${syncStatus === 'error' || syncStatus === 'conflict' ? 'text-rose-300' : syncStatus === 'saving' || syncStatus === 'loading' ? 'text-amber-200' : 'text-emerald-300'}`}>
            {syncStatus === 'loading' ? 'საერთო დიზაინი იტვირთება…' : syncStatus === 'saving' ? 'ცვლილებები ყველა მოწყობილობისთვის ინახება…' : syncStatus === 'error' ? 'საერთო შენახვა ვერ მოხერხდა — ცვლილებები ჯერ სხვა მოწყობილობაზე არ გამოჩნდება.' : syncStatus === 'conflict' ? 'კონფლიქტი: სხვა მოწყობილობის უფრო ახალი ვერსია არსებობს.' : 'შენახულია საერთო საცავში — ხელმისაწვდომია ყველა მოწყობილობიდან.'}
          </p>
          {syncStatus === 'error' && (
            <button type="button" onClick={onRetrySave} className="mt-2 rounded-lg border border-rose-400/40 px-3 py-1.5 text-[10px] font-bold text-rose-200 transition hover:bg-rose-400/10">
              შენახვის ხელახლა ცდა
            </button>
          )}
          {syncStatus === 'conflict' && (
            <div role="alert" className="mt-2 max-w-xl rounded-xl border border-amber-400/30 bg-amber-400/5 p-3">
              <p className="text-[11px] leading-5 text-amber-100">სხვა მოწყობილობაზე დიზაინი უკვე შეიცვალა. თქვენი მიმდინარე ცვლილებები დაცულია და ავტომატურად არ გადაიწერება.</p>
              <button type="button" onClick={onReloadRemote} className="mt-2 rounded-lg border border-amber-300/40 px-3 py-1.5 text-[10px] font-bold text-amber-100 transition hover:bg-amber-300/10">
                საერთო ვერსიის ჩატვირთვა (ჩემი მიმდინარე ცვლილებების გაუქმებით)
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={undoChange} disabled={!historyState.canUndo} className="rounded-xl border border-slate-500/50 px-3 py-2 text-xs font-bold text-slate-200 transition disabled:cursor-not-allowed disabled:opacity-35" aria-label="ბოლო ცვლილების გაუქმება" title="Undo (Ctrl/Cmd+Z)">↶ Undo</button>
          <button type="button" onClick={redoChange} disabled={!historyState.canRedo} className="rounded-xl border border-slate-500/50 px-3 py-2 text-xs font-bold text-slate-200 transition disabled:cursor-not-allowed disabled:opacity-35" aria-label="გაუქმებული ცვლილების დაბრუნება" title="Redo (Ctrl/Cmd+Y or Shift+Z)">↷ Redo</button>
          <button type="button" onClick={resetViewport} className="rounded-xl border border-rose-400/40 px-3 py-2 text-xs font-bold text-rose-200">მიმდინარე ხედის Reset</button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2" role="group" aria-label="მოწყობილობის დიზაინის არჩევა">
        {VIEWPORTS.map(item => (
          <button
            key={item.id}
            type="button"
            aria-pressed={viewport === item.id}
            onClick={() => setViewport(item.id)}
            className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${viewport === item.id ? 'border-emerald-300 bg-emerald-400 text-slate-950' : 'border-slate-700 bg-slate-950 text-slate-300'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {viewport !== 'desktop' && (
        <p className="rounded-xl border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-[11px] leading-5 text-sky-100">
          {viewport === 'tablet' ? 'Tablet' : 'Mobile'} პარამეტრები დამოუკიდებლად ინახება. შეუცვლელი ველები Desktop-ის მნიშვნელობას მემკვიდრეობით იღებს.
        </p>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-black text-white">ფერების პალიტრა</h3>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => applyPreset('emerald')} className="rounded-lg border border-emerald-400/30 px-2.5 py-1.5 text-[10px] font-bold text-emerald-200">Emerald</button>
            <button type="button" onClick={() => applyPreset('blue')} className="rounded-lg border border-blue-400/30 px-2.5 py-1.5 text-[10px] font-bold text-blue-200">Blue</button>
            <button type="button" onClick={() => applyPreset('violet')} className="rounded-lg border border-violet-400/30 px-2.5 py-1.5 text-[10px] font-bold text-violet-200">Violet</button>
            <button type="button" onClick={() => applyPreset('light')} className="rounded-lg border border-slate-400/40 px-2.5 py-1.5 text-[10px] font-bold text-slate-200">Light</button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {COLOR_FIELDS.map(field => (
            <label key={field.key} className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/80 bg-slate-950/60 p-3 text-xs text-slate-200">
              <span>{field.label}</span>
              <input
                type="color"
                value={active.theme[field.key]}
                onChange={event => updateValue('theme', field.key, event.target.value)}
                aria-label={field.label}
                className="h-9 w-14 cursor-pointer rounded-lg border border-slate-600 bg-slate-900 p-1"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-black text-white">ტიპოგრაფია</h3>
        <label className="block max-w-xl space-y-2 rounded-xl border border-slate-700/80 bg-slate-950/60 p-3 text-xs text-slate-200">
          <span>ადმინ პანელის შრიფტი</span>
          <select
            value={active.layout.fontFamily}
            onChange={event => updateValue('layout', 'fontFamily', event.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-white"
            aria-label="ადმინ პანელის შრიფტი"
          >
            <option value="system">სისტემური — უნივერსალური</option>
            <option value="georgian">ქართული — Noto Sans Georgian</option>
            <option value="modern">თანამედროვე — Inter</option>
            <option value="serif">კლასიკური — Serif</option>
            <option value="mono">ტექნიკური — Monospace</option>
          </select>
          <span className="block text-[11px] leading-5 text-slate-400">შრიფტი იცვლება მხოლოდ ადმინ პანელის ამ ხედში; Tablet და Mobile პარამეტრები დამოუკიდებლად შეგიძლიათ დააყენოთ.</span>
        </label>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-black text-white">განლაგება და ზომები</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {RANGE_FIELDS.map(field => (
            <label key={field.key} className="block space-y-1.5 rounded-xl border border-slate-700/80 bg-slate-950/60 p-3 text-xs text-slate-200">
              <span className="flex items-center justify-between gap-2">
                <span>{field.label}</span>
                <b className="tabular-nums text-emerald-300">{active.layout[field.key]} {field.suffix}</b>
              </span>
              <input
                type="range"
                min={field.min}
                max={field.max}
                step="1"
                value={active.layout[field.key]}
                onChange={event => updateValue('layout', field.key, Number(event.target.value))}
                className="w-full accent-emerald-400"
                aria-label={field.label}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-black text-white">ტექსტების რედაქტირება</h3>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">შეცვალეთ ადმინპანელის მოდულების სათაურები, განმარტებები და ღილაკების წარწერები. ფუნქციები და მოქმედებები უცვლელი რჩება.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {ADMIN_PANEL_CONTENT_FIELDS.map(field => (
            <label key={field.key} className="block space-y-2 rounded-xl border border-slate-700/80 bg-slate-950/60 p-3 text-xs text-slate-200">
              <span className="font-semibold">{field.label}</span>
              {field.multiline ? (
                <textarea value={normalized.content[field.key]} onChange={event => updateContentValue(field.key, event.target.value)} maxLength={field.maxLength} rows={3} className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-white" />
              ) : (
                <input type="text" value={normalized.content[field.key]} onChange={event => updateContentValue(field.key, event.target.value)} maxLength={field.maxLength} className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-white" />
              )}
              <span className="block text-right text-[10px] text-slate-500">{normalized.content[field.key].length}/{field.maxLength}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-black text-white">მოდულების ინდივიდუალური დიზაინი</h3>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">თითოეული ბლოკის ზომა ცალკე იმართება. შეუცვლელი Tablet/Mobile მნიშვნელობები Desktop-ის პარამეტრებს მემკვიდრეობით იღებს.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {COMPONENT_FIELDS.map(component => (
            <section key={component.key} className="rounded-2xl border border-slate-700/80 bg-slate-950/60 p-3 sm:p-4" aria-label={component.label}>
              <h4 className="mb-3 text-xs font-black text-emerald-200">{component.label}</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {component.properties.map(property => (
                  <label key={property.key} className="block min-w-0 space-y-1.5 text-[11px] text-slate-300">
                    <span className="flex items-center justify-between gap-2">
                      <span>{property.label}</span>
                      <b className="shrink-0 tabular-nums text-emerald-300">{active.components[component.key][property.key]} {property.suffix}</b>
                    </span>
                    <input
                      type="range"
                      min={property.min}
                      max={property.max}
                      step="1"
                      value={active.components[component.key][property.key]}
                      onChange={event => updateComponentValue(component.key, property.key, Number(event.target.value))}
                      className="w-full accent-emerald-400"
                      aria-label={component.label + ' — ' + property.label}
                    />
                  </label>
                ))}
              </div>
              <label className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-slate-700/70 bg-slate-900/70 p-2 text-[11px] text-slate-300">
                <span>ტექსტის გასწორება</span>
                <select value={active.components[component.key].textAlign} onChange={event => updateComponentValue(component.key, 'textAlign', event.target.value)} className="rounded-md border border-slate-600 bg-slate-950 px-2 py-1.5 text-white" aria-label={component.label + ' — ტექსტის გასწორება'}>
                  <option value="left">მარცხნივ</option>
                  <option value="center">ცენტრში</option>
                  <option value="right">მარჯვნივ</option>
                </select>
              </label>
              <label className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-slate-700/70 bg-slate-900/70 p-2 text-[11px] text-slate-300">
                <span>ჩარჩოს სტილი</span>
                <select value={active.components[component.key].borderStyle} onChange={event => updateComponentValue(component.key, 'borderStyle', event.target.value)} className="rounded-md border border-slate-600 bg-slate-950 px-2 py-1.5 text-white" aria-label={component.label + ' — ჩარჩოს სტილი'}>
                  <option value="solid">მთლიანი</option>
                  <option value="dashed">წყვეტილი</option>
                  <option value="dotted">წერტილოვანი</option>
                  <option value="none">ჩარჩოს გარეშე</option>
                </select>
              </label>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {[
                  { key: 'textColor', label: 'ტექსტის ფერი' },
                  { key: 'backgroundColor', label: 'ბლოკის ფონი' },
                  { key: 'borderColor', label: 'ჩარჩოს ფერი' }
                ].map(field => (
                  <label key={field.key} className="flex items-center justify-between gap-2 rounded-lg border border-slate-700/70 bg-slate-900/70 p-2 text-[10px] text-slate-300">
                    <span>{field.label}</span>
                    <input type="color" value={active.components[component.key][field.key]} onChange={event => updateComponentValue(component.key, field.key, event.target.value)} aria-label={component.label + ' — ' + field.label} className="h-8 w-11 cursor-pointer rounded border border-slate-600 bg-slate-900 p-1" />
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>


      <div className="space-y-4 rounded-2xl border border-emerald-400/20 bg-slate-950/50 p-3 sm:p-4">
        <div>
          <h3 className="text-sm font-black text-white">შიდა ელემენტების ინდივიდუალური რედაქტირება</h3>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">შეკვეთების მოდულში ცალკე შეცვალეთ სათაური, ფილტრები, ბარათები, მომხმარებლის ინფორმაცია, მოქმედებები, სტატუსი და გვერდების ნავიგაცია. პარამეტრები მოწყობილობის ხედის მიხედვით ინახება.</p>
        </div>
        <div className="grid grid-cols-1 gap-2 rounded-xl border border-slate-700/80 bg-slate-900/60 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.65fr)_auto] sm:items-end">
          <label className="block min-w-0 space-y-1 text-[11px] text-slate-300">
            <span>ელემენტის სწრაფი ძებნა</span>
            <input
              type="search"
              value={elementSearch}
              onChange={event => setElementSearch(event.target.value)}
              placeholder="მაგ. შეკვეთის ბარათი, მარაგი…"
              aria-label="ვიზუალური ელემენტის ძებნა"
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500"
            />
          </label>
          <label className="block min-w-0 space-y-1 text-[11px] text-slate-300">
            <span>კატეგორია</span>
            <select
              value={elementCategory}
              onChange={event => setElementCategory(event.target.value)}
              aria-label="ვიზუალური ელემენტების კატეგორია"
              className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-white"
            >
              <option value="all">ყველა კატეგორია</option>
              {ELEMENT_CATEGORIES.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}
            </select>
          </label>
          <label className="flex min-h-10 items-center gap-2 text-[11px] font-semibold text-slate-200 sm:col-span-2">
            <input
              type="checkbox"
              checked={showCustomizedOnly}
              onChange={event => setShowCustomizedOnly(event.target.checked)}
              className="h-4 w-4 accent-emerald-400"
              aria-label="მხოლოდ შეცვლილი ელემენტების ჩვენება"
            />
            მხოლოდ ამ მოწყობილობის ხედში შეცვლილი ელემენტები
            <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-emerald-300">{customizedElementKeys.size}</span>
          </label>
          <div className="text-[11px] font-semibold tabular-nums text-emerald-300 sm:pb-2" role="status" aria-live="polite">
            {filteredElementEntries.length} / {Object.keys(ADMIN_PANEL_ELEMENT_DEFINITIONS).length} ელემენტი
          </div>
        </div>
        {duplicateStyleGroups.length > 0 && (
          <section className="space-y-2 rounded-xl border border-amber-400/30 bg-amber-950/10 p-3 sm:col-span-2" aria-label="დუბლირებული სტილების აღმოჩენა">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><h4 className="text-xs font-black text-amber-200">ერთნაირი სტილები აღმოჩენილია</h4><p className="mt-1 text-[10px] text-slate-400">ნაპოვნია {duplicateStyleGroups.length} ჯგუფი. თითოეულ ჯგუფში პირველი სტილი რჩება მთავარ ასლად; დანარჩენები მხოლოდ მოსანიშნად გამოიყოფა.</p></div>
              <button type="button" onClick={selectDuplicateStylePresets} className="rounded-md border border-amber-400/40 px-3 py-2 text-[10px] font-bold text-amber-200">დუბლირებული ასლების მონიშვნა ({duplicateStyleGroups.reduce((sum, group) => sum + group.length - 1, 0)})</button>
            </div>
            <div className="space-y-1">{duplicateStyleGroups.map((group, index) => <p key={group.map(item => item.id).join(':')} className="text-[10px] text-slate-300"><span className="font-bold text-amber-200">ჯგუფი {index + 1}:</span> {group.map(item => item.name).join(' · ')} <span className="text-slate-500">({group.length} ერთნაირი სტილი)</span></p>)}</div>
            <p className="text-[10px] text-slate-500">წაშლა ავტომატურად არ ხდება — მონიშნული ასლები გადაამოწმეთ და სურვილის შემთხვევაში გამოიყენეთ არსებული „მონიშნულის წაშლა“.</p>
          </section>
        )}
        {selectedStylePresets.length >= 2 && (
          <section className="space-y-3 rounded-xl border border-sky-400/30 bg-sky-950/15 p-3" aria-label="შერჩეული სტილების შედარება">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><h4 className="text-xs font-black text-sky-200">სტილების შედარება</h4><p className="mt-1 text-[10px] text-slate-400">შეადარე მონიშნული სტილების პარამეტრები გამოყენებამდე. შედარება ცვლილებებს არ ახორციელებს.</p></div>
              <span className="rounded-full border border-sky-400/30 px-2 py-1 text-[10px] tabular-nums text-sky-200">{selectedStylePresets.length} მონიშნულია</span>
            </div>
            {selectedStylePresets.length > 4 && <p className="text-[10px] text-amber-200">შედარებაში ნაჩვენებია პირველი 4 მონიშნული სტილი. დანარჩენი მონიშნულები შენარჩუნებულია.</p>}
            <div className="overflow-x-auto rounded-lg border border-slate-700">
              <table className="w-full min-w-[560px] border-collapse text-left text-[10px]">
                <thead className="bg-slate-900"><tr><th scope="col" className="sticky left-0 z-10 min-w-32 border-b border-r border-slate-700 bg-slate-900 p-2 text-slate-300">პარამეტრი</th>{comparableStylePresets.map(preset => <th key={preset.id} scope="col" className="min-w-32 border-b border-slate-700 p-2 font-bold text-sky-200">{preset.name}</th>)}</tr></thead>
                <tbody>{styleComparisonFields.map(field => <tr key={field.key} className="border-b border-slate-800 last:border-0"><th scope="row" className="sticky left-0 z-10 border-r border-slate-700 bg-slate-950 p-2 font-semibold text-slate-300">{field.label}</th>{comparableStylePresets.map(preset => { const value = preset.style[field.key]; return <td key={preset.id} className="p-2 text-slate-200">{value == null || value === '' ? '—' : field.key.endsWith('Color') ? <span className="inline-flex items-center gap-2"><i className="h-4 w-4 rounded border border-white/30" style={{ backgroundColor: value }} /><code>{value}</code></span> : `${value}${field.suffix}`}</td>; })}</tr>)}</tbody>
              </table>
            </div>
            <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => setSelectedStylePresetIds([])} className="rounded-md border border-slate-600 px-2.5 py-1.5 text-[10px] font-bold text-slate-200">შედარების გასუფთავება</button><button type="button" onClick={() => exportSavedElementStyles(comparableStylePresets, 'geostore-admin-compared-style-presets.json')} className="rounded-md border border-sky-400/30 px-2.5 py-1.5 text-[10px] font-bold text-sky-200">შედარებული სტილების ექსპორტი</button></div>
          </section>
        )}
        <section className="space-y-3 rounded-xl border border-emerald-400/25 bg-slate-950/60 p-3 sm:col-span-2" aria-label="შენახული სტილების ბიბლიოთეკა">
          <div className="flex flex-col gap-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-black text-white">შენახული სტილების ბიბლიოთეკა</h3><p className="text-[11px] text-slate-400">შეინახეთ ელემენტის სტილი და გამოიყენეთ სხვა ელემენტზე.</p></div><span className="text-[10px] font-bold text-slate-400">{normalized.stylePresets.length} / 30</span></div><div className="flex flex-wrap gap-2"><button type="button" onClick={saveSelectedElementStyle} disabled={!selectedElementKey || normalized.stylePresets.length >= 30} className="rounded-lg bg-emerald-400 px-3 py-2 text-[11px] font-black text-slate-950 disabled:opacity-40">არჩეული ელემენტის სტილის შენახვა</button><button type="button" onClick={exportSavedElementStyles} disabled={!normalized.stylePresets.length} className="rounded-lg border border-sky-400/40 px-3 py-2 text-[11px] font-bold text-sky-200 disabled:opacity-40">ყველას JSON ექსპორტი</button><button type="button" onClick={() => exportSavedElementStyles(selectedStylePresets, 'geostore-admin-selected-style-presets.json')} disabled={!selectedStylePresets.length} className="rounded-lg border border-sky-400/40 px-3 py-2 text-[11px] font-bold text-sky-200 disabled:opacity-40">მონიშნულის ექსპორტი ({selectedStylePresets.length})</button><button type="button" onClick={removeSelectedStylePresets} disabled={!selectedStylePresets.length} className="rounded-lg border border-rose-400/40 px-3 py-2 text-[11px] font-bold text-rose-200 disabled:opacity-40">მონიშნულის წაშლა ({selectedStylePresets.length})</button><label className="flex items-center gap-2 rounded-lg border border-slate-700 px-2 py-1 text-[10px] text-slate-300">კატეგორია<select value={bulkStylePresetCategory} onChange={event => setBulkStylePresetCategory(event.target.value)} aria-label="მონიშნული სტილების ახალი კატეგორია" className="max-w-36 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-white"><option value="საერთო">საერთო</option>{ELEMENT_CATEGORIES.map(category => <option key={category.id} value={category.label}>{category.label}</option>)}</select></label><button type="button" onClick={updateSelectedStylePresetCategory} disabled={!selectedStylePresets.length} className="rounded-lg border border-violet-400/40 px-3 py-2 text-[11px] font-bold text-violet-200 disabled:opacity-40">კატეგორიის შეცვლა ({selectedStylePresets.length})</button><button type="button" onClick={toggleSelectedStylePresetFavorites} disabled={!selectedStylePresets.length} className="rounded-lg border border-amber-400/40 px-3 py-2 text-[11px] font-bold text-amber-200 disabled:opacity-40">{selectedStylePresets.length && selectedStylePresets.every(item => item.favorite) ? 'რჩეულებიდან ამოღება' : 'რჩეულებში დამატება'}</button><button type="button" onClick={selectAllStylePresets} disabled={!normalized.stylePresets.length || selectedStylePresets.length === normalized.stylePresets.length} className="rounded-lg border border-slate-600 px-3 py-2 text-[11px] font-bold text-slate-200 disabled:opacity-40">ყველას მონიშვნა</button><button type="button" onClick={() => setSelectedStylePresetIds([])} disabled={!selectedStylePresets.length} className="rounded-lg border border-slate-600 px-3 py-2 text-[11px] font-bold text-slate-200 disabled:opacity-40">მონიშვნის მოხსნა</button><button type="button" onClick={() => { stylePresetImportModeRef.current = 'merge'; stylePresetFileInputRef.current?.click(); }} disabled={normalized.stylePresets.length >= 30} className="rounded-lg border border-violet-400/40 px-3 py-2 text-[11px] font-bold text-violet-200 disabled:opacity-40">JSON დამატება</button><button type="button" onClick={() => { stylePresetImportModeRef.current = 'restore'; stylePresetFileInputRef.current?.click(); }} className="rounded-lg border border-amber-400/40 px-3 py-2 text-[11px] font-bold text-amber-200">სრული აღდგენა</button><input ref={stylePresetFileInputRef} type="file" accept="application/json,.json" onChange={importSavedElementStyles} className="hidden" aria-label="GEOSTORE სტილების JSON ფაილის არჩევა" /></div></div>
          {(
            <section className="space-y-2 rounded-xl border border-amber-400/25 bg-amber-950/10 p-3" aria-label="სტილების სარეზერვო ასლები">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><h4 className="text-xs font-black text-amber-200">ავტომატური სარეზერვო ასლები</h4><p className="text-[10px] text-slate-400">წაშლამდე და აღდგენამდე შენახული ბოლო 10 მდგომარეობა. აღდგენისას მიმდინარე ვერსიაც დაცული იქნება.</p></div>
                <div className="flex items-center gap-2"><span className="text-[10px] font-bold text-amber-200">{normalized.stylePresetBackups.length} / 10</span><button type="button" onClick={createManualStyleBackup} disabled={!normalized.stylePresets.length} className="rounded-md border border-amber-400/40 px-2.5 py-1.5 text-[10px] font-bold text-amber-200 disabled:opacity-40">ასლის შექმნა</button></div>
              </div>
              <div className="space-y-2">
                {normalized.stylePresetBackups.length === 0 && <p className="rounded-lg border border-dashed border-slate-700 p-3 text-center text-[10px] text-slate-400">სარეზერვო ასლები ჯერ არ შექმნილა. შეგიძლიათ ხელით შექმნათ პირველი ასლი.</p>}
                {normalized.stylePresetBackups.slice().reverse().map(backup => (
                  <div key={backup.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900/70 p-2">
                    <div className="min-w-0"><p className="truncate text-[11px] font-bold text-slate-200">{backup.reason}</p><p className="text-[10px] text-slate-400">{new Date(backup.savedAt).toLocaleString('ka-GE')} · {backup.stylePresets.length} სტილი</p></div>
                    <div className="flex flex-wrap gap-1"><button type="button" onClick={() => setExpandedStyleBackupId(current => current === backup.id ? null : backup.id)} aria-expanded={expandedStyleBackupId === backup.id} className="rounded-md border border-violet-400/40 px-2.5 py-1.5 text-[10px] font-bold text-violet-200">{expandedStyleBackupId === backup.id ? 'შიგთავსის დამალვა' : 'შიგთავსის ნახვა'}</button><button type="button" onClick={() => exportSavedElementStyles(backup.stylePresets, `geostore-admin-style-backup-${backup.id}.json`, { id: backup.id, savedAt: backup.savedAt, reason: backup.reason })} className="rounded-md border border-sky-400/40 px-2.5 py-1.5 text-[10px] font-bold text-sky-200">JSON ექსპორტი</button><button type="button" onClick={() => renameAutomaticStyleBackup(backup)} className="rounded-md border border-slate-600 px-2.5 py-1.5 text-[10px] font-bold text-slate-200">სახელის შეცვლა</button><button type="button" onClick={() => restoreAutomaticStyleBackup(backup)} className="rounded-md border border-amber-400/40 px-2.5 py-1.5 text-[10px] font-bold text-amber-200">აღდგენა</button><button type="button" onClick={() => deleteAutomaticStyleBackup(backup)} className="rounded-md border border-rose-400/40 px-2.5 py-1.5 text-[10px] font-bold text-rose-200">წაშლა</button></div>
                    {expandedStyleBackupId === backup.id && <div className="mt-2 w-full space-y-2 rounded-lg border border-violet-400/20 bg-slate-950/70 p-3">
                      <div className="flex flex-wrap gap-2 text-[10px]"><span className="rounded bg-slate-800 px-2 py-1 text-emerald-200">ასლში: {backup.stylePresets.length}</span><span className="rounded bg-slate-800 px-2 py-1 text-sky-200">ახალი: {backup.id === expandedStyleBackupId ? expandedStyleBackupDiff.added.length : 0}</span><span className="rounded bg-slate-800 px-2 py-1 text-amber-200">შეცვლილი: {backup.id === expandedStyleBackupId ? expandedStyleBackupDiff.changed.length : 0}</span><span className="rounded bg-slate-800 px-2 py-1 text-rose-200">აღდგენისას მოცილდება: {backup.id === expandedStyleBackupId ? expandedStyleBackupDiff.removed.length : 0}</span></div>
                      <p className="text-[10px] text-slate-400">ქვემოთ ნაჩვენებია ამ ასლში შენახული სტილები. აღდგენა შეცვლის მიმდინარე სტილების ბიბლიოთეკას, მაგრამ მის ასლს წინასწარ შეინახავს.</p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{backup.stylePresets.map(preset => <div key={preset.id} className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-slate-800 p-2"><div className="flex min-w-0 items-center gap-2"><span className="h-8 w-8 shrink-0 rounded-md border border-white/20" style={{ backgroundColor: preset.style.backgroundColor || '#0f172a', color: preset.style.textColor || '#e2e8f0', borderColor: preset.style.borderColor || '#475569' }} /><span className="min-w-0"><span className="block truncate text-[10px] font-bold text-slate-200">{preset.name}</span><span className="block truncate text-[9px] text-slate-500">{preset.category} · {Object.keys(preset.style).length} პარამეტრი</span></span></div><button type="button" onClick={() => restoreSingleStyleFromBackup(backup, preset)} className="shrink-0 rounded-md border border-emerald-400/40 px-2 py-1.5 text-[9px] font-bold text-emerald-200">ამ სტილის აღდგენა</button></div>)}</div>
                      {backup.stylePresets.length === 0 && <p className="text-[10px] text-slate-500">ამ ასლში სტილები არ არის.</p>}
                    </div>}
                  </div>
                ))}
              </div>
            </section>
          )}
          {!selectedElementKey && <p className="text-xs text-amber-200">ჯერ აირჩიეთ ელემენტი ქვემოთ მოცემული სიიდან.</p>}
          {normalized.stylePresets.length === 0 ? <p className="text-xs text-slate-500">ბიბლიოთეკა ჯერ ცარიელია.</p> : <>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
              <input type="search" value={stylePresetSearch} onChange={event => setStylePresetSearch(event.target.value)} placeholder="სტილის სახელით ან კატეგორიით ძებნა..." aria-label="სტილების ბიბლიოთეკის ძებნა" className="min-w-0 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-slate-500" />
              <select value={stylePresetCategory} onChange={event => setStylePresetCategory(event.target.value)} aria-label="სტილის კატეგორიის ფილტრი" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white">
                <option value="all">ყველა კატეგორია</option><option value="საერთო">საერთო</option>
                {ELEMENT_CATEGORIES.map(category => <option key={category.id} value={category.label}>{category.label}</option>)}
              </select>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-[11px] text-slate-400">დალაგება
                <select value={stylePresetSort} onChange={event => setStylePresetSort(event.target.value)} aria-label="სტილების დალაგება" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white">
                  <option value="newest">ბოლოს დამატებული</option><option value="name">სახელით (ა-ჰ)</option><option value="category">კატეგორიით</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-[11px] text-slate-300"><input type="checkbox" checked={showFavoriteStylePresets} onChange={event => setShowFavoriteStylePresets(event.target.checked)} className="h-4 w-4 accent-amber-400" aria-label="მხოლოდ რჩეული სტილების ჩვენება" />მხოლოდ რჩეულები</label>
            </div>
            <p className="text-[10px] text-slate-400" role="status" aria-live="polite">{filteredStylePresets.length} / {normalized.stylePresets.length} სტილი ნაჩვენებია</p>
            {filteredStylePresets.length === 0 ? <p className="rounded-lg border border-dashed border-slate-700 p-4 text-center text-xs text-slate-500">ამ ძიებით სტილი ვერ მოიძებნა.</p> : <div className="space-y-4">{groupedStylePresets.map(group => <section key={group.category} className="space-y-2" aria-label={group.category + ' სტილები'}><div className="flex items-center justify-between border-b border-slate-800 pb-1"><h4 className="text-[11px] font-black text-emerald-200">{group.category}</h4><span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] tabular-nums text-slate-400">{group.items.length}</span></div><div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">{group.items.map(preset => <div key={preset.id} className={`flex min-w-0 flex-col gap-2 rounded-lg border bg-slate-900 p-2 ${selectedStylePresetIds.includes(preset.id) ? 'border-emerald-400 ring-1 ring-emerald-400/30' : 'border-slate-700'}`}><div className="flex min-w-0 items-center gap-2"><label className="flex min-w-0 flex-1 items-center gap-2"><input type="checkbox" checked={selectedStylePresetIds.includes(preset.id)} onChange={() => toggleStylePresetSelection(preset.id)} aria-label={preset.name + ' სტილის მონიშვნა'} className="h-4 w-4 shrink-0 accent-emerald-400" /><span className="truncate text-xs font-bold text-slate-200">{preset.name}</span></label><button type="button" onClick={() => toggleStylePresetFavorite(preset.id)} aria-pressed={preset.favorite === true} aria-label={preset.name + (preset.favorite ? ' რჩეულებიდან ამოღება' : ' რჩეულებში დამატება')} title={preset.favorite ? 'რჩეულებიდან ამოღება' : 'რჩეულებში დამატება'} className={`rounded-md border px-2 py-1 text-sm leading-none transition ${preset.favorite ? 'border-amber-300/50 bg-amber-300/10 text-amber-300' : 'border-slate-700 text-slate-500 hover:text-amber-300'}`}>{preset.favorite ? '★' : '☆'}</button></div><select value={preset.category} onChange={event => updateStylePresetCategory(preset.id, event.target.value)} aria-label={preset.name + ' სტილის კატეგორია'} className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] text-slate-300"><option value="საერთო">საერთო</option>{ELEMENT_CATEGORIES.map(category => <option key={category.id} value={category.label}>{category.label}</option>)}</select><div className="flex min-h-14 items-center justify-between gap-2 rounded-lg border p-2" style={{ backgroundColor: preset.style.backgroundColor || '#0f172a', color: preset.style.textColor || '#e2e8f0', borderColor: preset.style.borderColor || '#334155', borderRadius: `${preset.style.borderRadius ?? 8}px`, padding: `${Math.min(preset.style.padding ?? 8, 16)}px` }} aria-label={preset.name + ' სტილის ვიზუალური ნიმუში'}><span className="min-w-0 truncate font-bold" style={{ fontSize: `${preset.style.fontSize ?? 13}px`, fontWeight: preset.style.fontWeight ?? 700, textAlign: preset.style.textAlign || 'left' }}>Aa · GEOSTORE</span><span className="flex shrink-0 gap-1" aria-hidden="true"><i className="h-3 w-3 rounded-full border border-white/20" style={{ backgroundColor: preset.style.textColor || '#e2e8f0' }} /><i className="h-3 w-3 rounded-full border border-white/20" style={{ backgroundColor: preset.style.backgroundColor || '#0f172a' }} /><i className="h-3 w-3 rounded-full border border-white/20" style={{ backgroundColor: preset.style.borderColor || '#334155' }} /></span></div><div className="flex flex-wrap gap-1"><button type="button" onClick={() => applySavedElementStyle(preset)} disabled={!selectedElementKey} className="rounded-md border border-emerald-400/40 px-2 py-1 text-[10px] font-bold text-emerald-200 disabled:opacity-40">არჩეულზე</button><button type="button" onClick={() => applySavedElementStyleToSelected(preset)} disabled={!selectedElementKeys.length} className="rounded-md border border-sky-400/40 px-2 py-1 text-[10px] font-bold text-sky-200 disabled:opacity-40">მონიშნულ {selectedElementKeys.length}-ზე</button><button type="button" onClick={() => updateSavedStyleFromSelectedElement(preset)} disabled={!selectedElementKey} title="არჩეული ელემენტის მიმდინარე სტილი შეინახოს ახალ ვერსიად" className="rounded-md border border-violet-400/30 px-2 py-1 text-[10px] font-bold text-violet-200 disabled:opacity-40">მიმდინარე სტილით განახლება</button><button type="button" onClick={() => setExpandedStyleHistoryId(current => current === preset.id ? null : preset.id)} aria-expanded={expandedStyleHistoryId === preset.id} className="rounded-md border border-amber-400/30 px-2 py-1 text-[10px] font-bold text-amber-200">ვერსიების ისტორია ({preset.history?.length || 0})</button><button type="button" onClick={() => renameSavedElementStyle(preset.id)} className="rounded-md border border-slate-600 px-2 py-1 text-[10px] font-bold text-slate-200">სახელის შეცვლა</button><button type="button" onClick={() => duplicateSavedElementStyle(preset)} disabled={normalized.stylePresets.length >= 30} className="rounded-md border border-sky-400/30 px-2 py-1 text-[10px] font-bold text-sky-200 disabled:opacity-40">დუბლირება</button><button type="button" onClick={() => removeSavedElementStyle(preset.id)} className="rounded-md border border-rose-400/30 px-2 py-1 text-[10px] font-bold text-rose-200">წაშლა</button></div>{expandedStyleHistoryId === preset.id && <div className="space-y-2 rounded-lg border border-amber-400/20 bg-slate-950 p-2"><p className="text-[10px] font-bold text-amber-200">შენახული ვერსიები — მაქსიმუმ 10</p>{(preset.history || []).length ? [...preset.history].map((entry, historyIndex) => <div key={entry.savedAt + historyIndex} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-800 p-2"><div className="min-w-0"><p className="text-[10px] text-slate-200">ვერსია {historyIndex + 1}</p><p className="text-[9px] text-slate-500">{new Date(entry.savedAt).toLocaleString('ka-GE')}</p></div><button type="button" onClick={() => restoreSavedStyleVersion(preset, historyIndex)} className="rounded-md border border-amber-400/30 px-2 py-1 text-[10px] font-bold text-amber-200">ამ ვერსიის აღდგენა</button></div>) : <p className="text-[10px] text-slate-500">ისტორია ჯერ ცარიელია. განაახლეთ სტილი მიმდინარე ელემენტიდან ახალი ვერსიის შესანახად.</p>}</div>}</div>)}</div></section>)}</div>}
          </>}
        </section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-950/70 p-2">
          <span className="text-[11px] text-slate-300">რამდენიმე ელემენტის მონიშვნა: {selectedElementKeys.length}</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={selectAllFilteredElements} disabled={!filteredElementEntries.length} className="rounded-md border border-slate-600 px-2 py-1 text-[10px] font-bold text-slate-200 disabled:opacity-40">ნაჩვენების მონიშვნა</button>
            <button type="button" onClick={() => setSelectedElementKeys([])} disabled={!selectedElementKeys.length} className="rounded-md border border-slate-600 px-2 py-1 text-[10px] font-bold text-slate-200 disabled:opacity-40">მონიშვნის მოხსნა</button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filteredElementEntries.map(([key, item]) => (
            <section
              key={key}
              ref={node => {
                if (node) elementCardRefs.current[key] = node;
                else delete elementCardRefs.current[key];
              }}
              className={`space-y-3 rounded-xl border p-3 transition-colors ${selectedElementKey === key ? 'border-emerald-300 bg-emerald-950/30 ring-1 ring-emerald-400/30' : 'border-slate-700/80 bg-slate-900/70'}`}
              aria-label={item.label}
              aria-current={selectedElementKey === key ? 'true' : undefined}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <label className="flex min-w-0 items-center gap-2"><input type="checkbox" checked={selectedElementKeys.includes(key)} onChange={() => toggleElementBatchSelection(key)} aria-label={item.label + ' მრავალჯერადი გამოყენებისთვის მონიშვნა'} className="h-4 w-4 shrink-0 accent-sky-400" /><h4 className="text-xs font-black text-emerald-200">{item.label}</h4></label>
                  {customizedElementKeys.has(key) && (
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold text-emerald-300">შეცვლილია</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => focusElementEditor(key)}
                  className="rounded-lg border border-emerald-400/30 px-2.5 py-1.5 text-[10px] font-bold text-emerald-200 hover:bg-emerald-400/10"
                  aria-label={item.label + ' ელემენტის არჩევა და რედაქტირება'}
                >
                  {selectedElementKey === key ? 'არჩეულია' : 'რედაქტირება'}
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => resetElement(key)}
                  disabled={!customizedElementKeys.has(key)}
                  className="rounded-lg border border-rose-400/25 px-2.5 py-1.5 text-[10px] font-semibold text-rose-200 transition hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label={item.label + ' დიზაინის საწყის მდგომარეობაში აღდგენა'}
                >
                  ამ ელემენტის აღდგენა
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'fontSize', label: 'ტექსტის ზომა', min: 10, max: 24, suffix: 'px' },
                  { key: 'fontWeight', label: 'ტექსტის სისქე', min: 300, max: 900, suffix: '' },
                  { key: 'borderRadius', label: 'მომრგვალება', min: 0, max: 32, suffix: 'px' },
                  { key: 'padding', label: 'შიდა დაშორება', min: 0, max: 32, suffix: 'px' }
                ].map(field => (
                  <label key={field.key} className="min-w-0 space-y-1 text-[10px] text-slate-300">
                    <span className="flex items-center justify-between gap-1"><span>{field.label}</span><b className="tabular-nums text-emerald-300">{active.elementStyles[key][field.key]}{field.suffix}</b></span>
                    <input type="range" min={field.min} max={field.max} step="1" value={active.elementStyles[key][field.key]} onChange={event => updateElementValue(key, field.key, Number(event.target.value))} className="w-full accent-emerald-400" aria-label={item.label + ' — ' + field.label} />
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'textColor', label: 'ტექსტის ფერი' },
                  { key: 'backgroundColor', label: 'ფონის ფერი' },
                  { key: 'borderColor', label: 'ჩარჩოს ფერი' }
                ].map(field => (
                  <label key={field.key} className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-950 p-2 text-[10px] text-slate-300">
                    <span>{field.label}</span>
                    <input type="color" value={active.elementStyles[key][field.key]} onChange={event => updateElementValue(key, field.key, event.target.value)} aria-label={item.label + ' — ' + field.label} className="h-8 w-10 rounded border border-slate-600 bg-slate-900 p-1" />
                  </label>
                ))}
              </div>
              <label className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-950 p-2 text-[10px] text-slate-300">
                <span>ტექსტის გასწორება</span>
                <select value={active.elementStyles[key].textAlign} onChange={event => updateElementValue(key, 'textAlign', event.target.value)} className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1.5 text-white" aria-label={item.label + ' — ტექსტის გასწორება'}>
                  <option value="left">მარცხნივ</option><option value="center">ცენტრში</option><option value="right">მარჯვნივ</option>
                </select>
              </label>
            </section>
          ))}
          {filteredElementEntries.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-600 bg-slate-950/50 p-5 text-center text-xs text-slate-400 md:col-span-2" role="status">
              ამ ძიებით ელემენტი ვერ მოიძებნა. შეცვალეთ საძიებო სიტყვა ან აირჩიეთ სხვა კატეგორია.
              <button type="button" onClick={() => { setElementSearch(''); setElementCategory('all'); }} className="ml-2 font-bold text-emerald-300 underline underline-offset-2">ფილტრების გასუფთავება</button>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3 text-[11px] leading-5 text-slate-300">
        პარამეტრები მოქმედებს მხოლოდ მთავარ ადმინისტრატორზე და იტვირთება მისი ანგარიშით ნებისმიერ მოწყობილობაზე. სხვა თანამშრომლების ხედს და მაღაზიის საჯარო დიზაინს არ ცვლის.
      </div>
    </section>
  );
}
