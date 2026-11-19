import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_PANEL_FONT_FAMILIES,
  ADMIN_PANEL_VISUAL_STORAGE_KEY,
  DEFAULT_ADMIN_PANEL_VISUAL_DESIGN,
  buildAdminPanelVisualStyle,
  loadAdminPanelVisualDesign,
  normalizeAdminPanelVisualDesign,
  saveAdminPanelVisualDesign
} from '../src/utils/adminPanelVisualDesign.js';

test('admin visual design rejects unsafe colors and clamps layout values', () => {
  const design = normalizeAdminPanelVisualDesign({
    theme: { accent: 'url(javascript:alert(1))', panel: '#123456' },
    layout: { fontSize: 99, cardRadius: -4, cardPadding: 100, sidebarWidth: 10, buttonRadius: 99, navItemRadius: -2, navItemPaddingY: 99, sectionGap: 2, headerRadius: 99, headerPadding: 2, tableCellPadding: 99, inputRadius: -2, inputHeight: 99, cardBorderWidth: 9, cardShadowBlur: -10, modalRadius: 99, modalPadding: 2, modalOverlayOpacity: 120 }
  });

  assert.equal(design.theme.accent, DEFAULT_ADMIN_PANEL_VISUAL_DESIGN.theme.accent);
  assert.equal(design.theme.panel, '#123456');
  assert.equal(design.theme.staffSectionBackground, '#0f172a');
  assert.equal(design.theme.ordersSectionBackground, '#0f172a');
  assert.equal(design.theme.supportSectionBorder, '#334155');
  assert.equal(design.theme.discountsSectionBackground, '#0f172a');
  assert.equal(design.theme.bannersSectionBorder, '#334155');
  assert.equal(design.theme.categoriesSectionBackground, '#0f172a');
  assert.equal(design.theme.couponsSectionBorder, '#334155');
  assert.equal(design.theme.cardTitleText, '#f8fafc');
  assert.equal(design.theme.cardMutedText, '#94a3b8');
  assert.equal(design.theme.cardShadowColor, '#000000');
  assert.equal(design.theme.cardHoverBorder, '#34d399');
  assert.equal(design.theme.tableRowBackground, '#0f172a');
  assert.equal(design.theme.tableRowHover, '#172554');
  assert.equal(design.theme.filterBackground, '#020617');
  assert.equal(design.theme.filterText, '#f8fafc');
  assert.equal(design.theme.filterBorder, '#334155');
  assert.equal(design.theme.primaryButtonBackground, '#059669');
  assert.equal(design.theme.primaryButtonText, '#ffffff');
  assert.equal(design.theme.primaryButtonBorder, '#10b981');
  assert.equal(design.layout.fontSize, 16);
  assert.equal(design.layout.cardRadius, 10);
  assert.equal(design.layout.cardPadding, 32);
  assert.equal(design.layout.sidebarWidth, 240);
  assert.equal(design.layout.buttonRadius, 28);
  assert.equal(design.layout.navItemRadius, 0);
  assert.equal(design.layout.navItemPaddingY, 20);
  assert.equal(design.layout.sectionGap, 12);
  assert.equal(design.layout.headerRadius, 40);
  assert.equal(design.layout.headerPadding, 12);
  assert.equal(design.layout.tableCellPadding, 20);
  assert.equal(design.layout.inputRadius, 0);
  assert.equal(design.layout.inputHeight, 52);
  assert.equal(design.layout.cardBorderWidth, 3);
  assert.equal(design.layout.cardShadowBlur, 0);
  assert.equal(design.layout.modalRadius, 40);
  assert.equal(design.layout.modalPadding, 12);
  assert.equal(design.layout.modalOverlayOpacity, 95);
});

test('tablet and mobile admin visual overrides inherit unset desktop values', () => {
  const design = normalizeAdminPanelVisualDesign({
    theme: { accent: '#112233', panel: '#223344', navActiveBackground: '#abcdef', headerBackground: '#aabbcc', tableHeaderText: '#112244', tableRowBackground: '#abcdef', tableRowHover: '#bcdefa', filterBackground: '#112233', filterText: '#ffffff', filterBorder: '#223344', primaryButtonBackground: '#334455', primaryButtonText: '#ffffff', primaryButtonBorder: '#445566', inputFocus: '#556677', contentCardBackground: '#a1b2c3', contentCardBorder: '#b2c3d4', cardTitleText: '#123456', cardMutedText: '#234567', cardShadowColor: '#345678', cardHoverBorder: '#456789', staffSectionBackground: '#aabbcc', inventorySectionBorder: '#bbccdd', analyticsSectionBackground: '#ccddee', ordersSectionBackground: '#ddeeff', supportSectionBorder: '#aabbcc', discountsSectionBackground: '#ddeeff', bannersSectionBorder: '#aabbcc', categoriesSectionBackground: '#ccddee', couponsSectionBorder: '#bbccdd', modalBackground: '#123abc', modalText: '#ffffff', modalBorder: '#345678', modalOverlayBackground: '#123456' },
    layout: { fontSize: 14, cardRadius: 20, sectionGap: 30, headerPadding: 28, tableCellPadding: 10, inputHeight: 48, cardBorderWidth: 2, cardShadowBlur: 30, modalRadius: 32, modalPadding: 30, modalOverlayOpacity: 90 },
    responsive: {
      tablet: { theme: { accent: '#123456', navActiveBackground: '#445566', headerBackground: '#667788', tableRowBackground: '#778899', filterBackground: '#8899aa', primaryButtonBackground: '#99aabb', inputFocus: '#778899', contentCardBackground: '#8899aa', cardTitleText: '#abcdef', cardShadowColor: '#123abc', modalBackground: '#7788aa', modalOverlayBackground: '#abcdef', staffSectionBackground: '#ddeeff' }, layout: { fontSize: 13, navItemRadius: 8, sectionGap: 18, headerPadding: 16, inputHeight: 42, cardBorderWidth: 1, cardShadowBlur: 12, modalRadius: 18, modalPadding: 16, modalOverlayOpacity: 70 } },
      mobile: { theme: { panel: '#334455' }, layout: { cardPadding: 14 } }
    }
  });
  const style = buildAdminPanelVisualStyle(design);

  assert.equal(style['--admin-vd-accent'], '#112233');
  assert.equal(style['--admin-vd-tablet-accent'], '#123456');
  assert.equal(style['--admin-vd-tablet-navActiveBackground'], '#445566');
  assert.equal(style['--admin-vd-tablet-navItemRadius'], '8px');
  assert.equal(style['--admin-vd-tablet-sectionGap'], '18px');
  assert.equal(style['--admin-vd-sectionGap'], '30px');
  assert.equal(style['--admin-vd-tablet-panel'], '#223344');
  assert.equal(style['--admin-vd-tablet-fontSize'], '13px');
  assert.equal(style['--admin-vd-mobile-accent'], '#112233');
  assert.equal(style['--admin-vd-mobile-panel'], '#334455');
  assert.equal(style['--admin-vd-mobile-cardPadding'], '14px');
  assert.equal(style['--admin-vd-mobile-navActiveBackground'], '#abcdef');
  assert.equal(style['--admin-vd-headerBackground'], '#aabbcc');
  assert.equal(style['--admin-vd-tableHeaderText'], '#112244');
  assert.equal(style['--admin-vd-tableRowBackground'], '#abcdef');
  assert.equal(style['--admin-vd-tableRowHover'], '#bcdefa');
  assert.equal(style['--admin-vd-filterBackground'], '#112233');
  assert.equal(style['--admin-vd-filterText'], '#ffffff');
  assert.equal(style['--admin-vd-filterBorder'], '#223344');
  assert.equal(style['--admin-vd-primaryButtonBackground'], '#334455');
  assert.equal(style['--admin-vd-primaryButtonText'], '#ffffff');
  assert.equal(style['--admin-vd-primaryButtonBorder'], '#445566');
  assert.equal(style['--admin-vd-inputFocus'], '#556677');
  assert.equal(style['--admin-vd-tablet-headerBackground'], '#667788');
  assert.equal(style['--admin-vd-tablet-tableRowBackground'], '#778899');
  assert.equal(style['--admin-vd-tablet-filterBackground'], '#8899aa');
  assert.equal(style['--admin-vd-tablet-primaryButtonBackground'], '#99aabb');
  assert.equal(style['--admin-vd-tablet-inputFocus'], '#778899');
  assert.equal(style['--admin-vd-tablet-headerPadding'], '16px');
  assert.equal(style['--admin-vd-tablet-inputHeight'], '42px');
  assert.equal(style['--admin-vd-headerPadding'], '28px');
  assert.equal(style['--admin-vd-tableCellPadding'], '10px');
  assert.equal(style['--admin-vd-inputHeight'], '48px');
  assert.equal(style['--admin-vd-contentCardBackground'], '#a1b2c3');
  assert.equal(style['--admin-vd-contentCardBorder'], '#b2c3d4');
  assert.equal(style['--admin-vd-cardTitleText'], '#123456');
  assert.equal(style['--admin-vd-cardMutedText'], '#234567');
  assert.equal(style['--admin-vd-cardShadowColor'], '#345678');
  assert.equal(style['--admin-vd-cardHoverBorder'], '#456789');
  assert.equal(style['--admin-vd-cardBorderWidth'], '2px');
  assert.equal(style['--admin-vd-cardShadowBlur'], '30px');
  assert.equal(style['--admin-vd-modalBackground'], '#123abc');
  assert.equal(style['--admin-vd-modalText'], '#ffffff');
  assert.equal(style['--admin-vd-modalBorder'], '#345678');
  assert.equal(style['--admin-vd-modalRadius'], '32px');
  assert.equal(style['--admin-vd-modalPadding'], '30px');
  assert.equal(style['--admin-vd-modalOverlayBackground'], '#123456');
  assert.equal(style['--admin-vd-modalOverlayOpacity'], '90%');
  assert.equal(style['--admin-vd-staffSectionBackground'], '#aabbcc');
  assert.equal(style['--admin-vd-inventorySectionBorder'], '#bbccdd');
  assert.equal(style['--admin-vd-analyticsSectionBackground'], '#ccddee');
  assert.equal(style['--admin-vd-ordersSectionBackground'], '#ddeeff');
  assert.equal(style['--admin-vd-supportSectionBorder'], '#aabbcc');
  assert.equal(style['--admin-vd-tablet-ordersSectionBackground'], '#ddeeff');
  assert.equal(style['--admin-vd-tablet-supportSectionBorder'], '#aabbcc');
  assert.equal(style['--admin-vd-discountsSectionBackground'], '#ddeeff');
  assert.equal(style['--admin-vd-bannersSectionBorder'], '#aabbcc');
  assert.equal(style['--admin-vd-categoriesSectionBackground'], '#ccddee');
  assert.equal(style['--admin-vd-couponsSectionBorder'], '#bbccdd');
  assert.equal(style['--admin-vd-tablet-staffSectionBackground'], '#ddeeff');
  assert.equal(style['--admin-vd-tablet-contentCardBackground'], '#8899aa');
  assert.equal(style['--admin-vd-tablet-cardTitleText'], '#abcdef');
  assert.equal(style['--admin-vd-tablet-cardShadowColor'], '#123abc');
  assert.equal(style['--admin-vd-tablet-cardBorderWidth'], '1px');
  assert.equal(style['--admin-vd-tablet-cardShadowBlur'], '12px');
  assert.equal(style['--admin-vd-tablet-modalBackground'], '#7788aa');
  assert.equal(style['--admin-vd-tablet-modalRadius'], '18px');
  assert.equal(style['--admin-vd-tablet-modalPadding'], '16px');
  assert.equal(style['--admin-vd-tablet-modalOverlayBackground'], '#abcdef');
  assert.equal(style['--admin-vd-tablet-modalOverlayOpacity'], '70%');
  assert.equal(style['--admin-vd-mobile-modalBackground'], '#123abc');
  assert.equal(style['--admin-vd-mobile-modalOverlayOpacity'], '90%');
});

test('admin visual design saves and loads only the normalized visual preferences', () => {
  const storage = {
    value: null,
    getItem(key) {
      assert.equal(key, ADMIN_PANEL_VISUAL_STORAGE_KEY);
      return this.value;
    },
    setItem(key, value) {
      assert.equal(key, ADMIN_PANEL_VISUAL_STORAGE_KEY);
      this.value = value;
    }
  };
  const source = {
    theme: { accent: '#445566' },
    layout: { sidebarWidth: 320 },
    responsive: { mobile: { theme: { accent: '#778899' } } }
  };

  assert.equal(saveAdminPanelVisualDesign(source, storage), true);
  const loaded = loadAdminPanelVisualDesign(storage);
  assert.equal(loaded.theme.accent, '#445566');
  assert.equal(loaded.layout.sidebarWidth, 320);
  assert.equal(loaded.responsive.mobile.theme.accent, '#778899');
  assert.equal(Object.hasOwn(loaded, 'customerData'), false);
});

test('admin visual design storage failures fall back safely without throwing', () => {
  const brokenStorage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); }
  };

  assert.equal(saveAdminPanelVisualDesign({}, brokenStorage), false);
  assert.deepEqual(loadAdminPanelVisualDesign(brokenStorage), normalizeAdminPanelVisualDesign(DEFAULT_ADMIN_PANEL_VISUAL_DESIGN));
});


test('admin font family is allowlisted and responsive overrides inherit safely', () => {
  const design = normalizeAdminPanelVisualDesign({
    layout: { fontFamily: 'serif' },
    responsive: {
      tablet: { layout: { fontFamily: 'georgian' } },
      mobile: { layout: { fontFamily: 'not-allowed' } }
    }
  });
  const style = buildAdminPanelVisualStyle(design);

  assert.equal(design.layout.fontFamily, 'serif');
  assert.equal(design.responsive.tablet.layout.fontFamily, 'georgian');
  assert.equal(Object.hasOwn(design.responsive.mobile.layout, 'fontFamily'), false);
  assert.equal(style['--admin-vd-fontFamily'], ADMIN_PANEL_FONT_FAMILIES.serif);
  assert.equal(style['--admin-vd-tablet-fontFamily'], ADMIN_PANEL_FONT_FAMILIES.georgian);
  assert.equal(style['--admin-vd-mobile-fontFamily'], ADMIN_PANEL_FONT_FAMILIES.serif);
});


test('admin typography sizes and weights are bounded and responsive', () => {
  const design = normalizeAdminPanelVisualDesign({
    layout: { titleFontSize: 99, bodyFontSize: 15, headingFontWeight: 850, bodyFontWeight: 650 },
    responsive: {
      tablet: { layout: { titleFontSize: 24, bodyFontSize: 14, headingFontWeight: 800 } },
      mobile: { layout: { titleFontSize: 20, bodyFontSize: 12, bodyFontWeight: 500 } }
    }
  });
  const style = buildAdminPanelVisualStyle(design);

  assert.equal(design.layout.titleFontSize, 32);
  assert.equal(design.layout.bodyFontSize, 15);
  assert.equal(design.layout.headingFontWeight, 850);
  assert.equal(design.layout.bodyFontWeight, 650);
  assert.equal(style['--admin-vd-titleFontSize'], '32px');
  assert.equal(style['--admin-vd-headingFontWeight'], '850');
  assert.equal(style['--admin-vd-tablet-titleFontSize'], '24px');
  assert.equal(style['--admin-vd-tablet-headingFontWeight'], '800');
  assert.equal(style['--admin-vd-mobile-titleFontSize'], '20px');
  assert.equal(style['--admin-vd-mobile-bodyFontWeight'], '500');
});


test('admin input placeholder color and focus ring width support responsive overrides', () => {
  const design = normalizeAdminPanelVisualDesign({
    theme: { inputPlaceholder: '#64748b' },
    layout: { inputFocusRingWidth: 3 },
    responsive: {
      tablet: {
        theme: { inputPlaceholder: '#94a3b8' },
        layout: { inputFocusRingWidth: 2 }
      },
      mobile: {
        layout: { inputFocusRingWidth: 0 }
      }
    }
  });
  const style = buildAdminPanelVisualStyle(design);

  assert.equal(design.theme.inputPlaceholder, '#64748b');
  assert.equal(design.layout.inputFocusRingWidth, 3);
  assert.equal(style['--admin-vd-inputPlaceholder'], '#64748b');
  assert.equal(style['--admin-vd-tablet-inputPlaceholder'], '#94a3b8');
  assert.equal(style['--admin-vd-mobile-inputPlaceholder'], '#64748b');
  assert.equal(style['--admin-vd-inputFocusRingWidth'], '3px');
  assert.equal(style['--admin-vd-tablet-inputFocusRingWidth'], '2px');
  assert.equal(style['--admin-vd-mobile-inputFocusRingWidth'], '0px');
});


test('button and navigation typography are bounded and responsive', () => {
  const design = normalizeAdminPanelVisualDesign({
    layout: { buttonFontSize: 17, buttonFontWeight: 750, navItemFontSize: 15, navItemFontWeight: 700 },
    responsive: {
      tablet: { layout: { buttonFontSize: 14, navItemFontSize: 13, navItemFontWeight: 600 } },
      mobile: { layout: { buttonFontWeight: 500, navItemFontSize: 12 } }
    }
  });
  const style = buildAdminPanelVisualStyle(design);

  assert.equal(style['--admin-vd-buttonFontSize'], '17px');
  assert.equal(style['--admin-vd-buttonFontWeight'], '750');
  assert.equal(style['--admin-vd-navItemFontSize'], '15px');
  assert.equal(style['--admin-vd-navItemFontWeight'], '700');
  assert.equal(style['--admin-vd-tablet-buttonFontSize'], '14px');
  assert.equal(style['--admin-vd-tablet-navItemFontSize'], '13px');
  assert.equal(style['--admin-vd-tablet-navItemFontWeight'], '600');
  assert.equal(style['--admin-vd-mobile-buttonFontSize'], '17px');
  assert.equal(style['--admin-vd-mobile-buttonFontWeight'], '500');
  assert.equal(style['--admin-vd-mobile-navItemFontSize'], '12px');
  assert.equal(style['--admin-vd-mobile-navItemFontWeight'], '700');
});


test('table, form and filter controls are bounded and inherit across viewports', () => {
  const design = normalizeAdminPanelVisualDesign({
    layout: {
      tableCellPaddingY: 18,
      tableHeaderFontSize: 15,
      tableHeaderFontWeight: 850,
      tableRowFontSize: 14,
      tableRowMinHeight: 70,
      filterControlHeight: 46,
      filterGap: 18,
      inputFontSize: 16,
      inputFontWeight: 600
    },
    responsive: {
      tablet: { layout: { tableCellPaddingY: 14, tableHeaderFontSize: 13, tableRowMinHeight: 60, filterGap: 12, inputFontSize: 14 } },
      mobile: { layout: { tableCellPaddingY: 10, tableRowFontSize: 12, filterControlHeight: 38, inputFontWeight: 500 } }
    }
  });
  const style = buildAdminPanelVisualStyle(design);

  assert.equal(style['--admin-vd-tableCellPaddingY'], '18px');
  assert.equal(style['--admin-vd-tableHeaderFontSize'], '15px');
  assert.equal(style['--admin-vd-tableHeaderFontWeight'], '850');
  assert.equal(style['--admin-vd-tableRowFontSize'], '14px');
  assert.equal(style['--admin-vd-tableRowMinHeight'], '70px');
  assert.equal(style['--admin-vd-filterControlHeight'], '46px');
  assert.equal(style['--admin-vd-filterGap'], '18px');
  assert.equal(style['--admin-vd-inputFontSize'], '16px');
  assert.equal(style['--admin-vd-inputFontWeight'], '600');
  assert.equal(style['--admin-vd-tablet-tableCellPaddingY'], '14px');
  assert.equal(style['--admin-vd-tablet-tableHeaderFontSize'], '13px');
  assert.equal(style['--admin-vd-tablet-tableRowMinHeight'], '60px');
  assert.equal(style['--admin-vd-tablet-filterGap'], '12px');
  assert.equal(style['--admin-vd-tablet-inputFontSize'], '14px');
  assert.equal(style['--admin-vd-mobile-tableCellPaddingY'], '10px');
  assert.equal(style['--admin-vd-mobile-tableHeaderFontSize'], '15px');
  assert.equal(style['--admin-vd-mobile-tableRowFontSize'], '12px');
  assert.equal(style['--admin-vd-mobile-filterControlHeight'], '38px');
  assert.equal(style['--admin-vd-mobile-inputFontWeight'], '500');
});
