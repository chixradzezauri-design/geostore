import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ADMIN_PANEL_CONTENT_FIELDS,
  DEFAULT_ADMIN_PANEL_VISUAL_DESIGN,
  normalizeAdminPanelVisualDesign,
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

export default function AdminPanelVisualEditor({ design, onChange, onRetrySave, syncStatus = 'saved' }) {
  const [viewport, setViewport] = useState('desktop');
  const [elementSearch, setElementSearch] = useState('');
  const [elementCategory, setElementCategory] = useState('all');
  const [showCustomizedOnly, setShowCustomizedOnly] = useState(false);
  const [selectedElementKey, setSelectedElementKey] = useState('');
  const elementCardRefs = useRef({});
  const normalized = useMemo(() => normalizeAdminPanelVisualDesign(design), [design]);
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
          <p role="status" aria-live="polite" className={`mt-2 text-[11px] font-semibold ${syncStatus === 'error' ? 'text-rose-300' : syncStatus === 'saving' || syncStatus === 'loading' ? 'text-amber-200' : 'text-emerald-300'}`}>
            {syncStatus === 'loading' ? 'საერთო დიზაინი იტვირთება…' : syncStatus === 'saving' ? 'ცვლილებები ყველა მოწყობილობისთვის ინახება…' : syncStatus === 'error' ? 'საერთო შენახვა ვერ მოხერხდა — ცვლილებები ჯერ სხვა მოწყობილობაზე არ გამოჩნდება.' : 'შენახულია საერთო საცავში — ხელმისაწვდომია ყველა მოწყობილობიდან.'}
          </p>
          {syncStatus === 'error' && (
            <button type="button" onClick={onRetrySave} className="mt-2 rounded-lg border border-rose-400/40 px-3 py-1.5 text-[10px] font-bold text-rose-200 transition hover:bg-rose-400/10">
              შენახვის ხელახლა ცდა
            </button>
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
                  <h4 className="text-xs font-black text-emerald-200">{item.label}</h4>
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
