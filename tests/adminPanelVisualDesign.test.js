import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ADMIN_PANEL_FONT_FAMILIES,
  ADMIN_PANEL_VISUAL_STORAGE_KEY,
  DEFAULT_ADMIN_PANEL_VISUAL_DESIGN,
  buildAdminPanelVisualStyle,
  createAdminStylePresetBackup,
  restoreAdminStylePresetBackup,
  createAdminPanelModuleBackup,
  restoreAdminPanelModuleBackup,
  deleteAdminPanelModuleBackup,
  compareAdminPanelModuleBackup,
  loadAdminPanelVisualDesign,
  normalizeAdminPanelVisualDesign,
  resetAdminPanelVisualViewport,
  resetAdminPanelVisualElement,
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

test('saved admin style presets survive normalized local storage round trips', () => {
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
    stylePresets: [{
      id: 'admin-style-roundtrip',
      name: 'სუფთა ბარათი',
      style: {
        fontSize: 18,
        fontWeight: 700,
        textAlign: 'center',
        textColor: '#ffffff',
        backgroundColor: '#123456',
        borderColor: '#abcdef',
        borderRadius: 20,
        padding: 24
      }
    }]
  };

  assert.equal(saveAdminPanelVisualDesign(source, storage), true);
  const loaded = loadAdminPanelVisualDesign(storage);
  assert.equal(loaded.stylePresets.length, 1);
  assert.equal(loaded.stylePresets[0].id, 'admin-style-roundtrip');
  assert.equal(loaded.stylePresets[0].name, 'სუფთა ბარათი');
  assert.deepEqual(loaded.stylePresets[0].style, {
    fontSize: 18,
    fontWeight: 700,
    borderRadius: 20,
    padding: 24,
    textColor: '#ffffff',
    backgroundColor: '#123456',
    borderColor: '#abcdef',
    textAlign: 'center'
  });
});

test('admin visual design cloud API includes normalized saved style presets', () => {
  const api = readFileSync(new URL('../src/utils/adminPanelVisualDesignApi.js', import.meta.url), 'utf8');
  assert.match(api, /normalizeAdminPanelVisualDesign\(rawDesign\)/);
  assert.match(api, /p_design: design/);
  assert.match(api, /get_admin_panel_visual_design_state/);
  assert.match(api, /save_admin_panel_visual_design_state/);
});

test('admin style library exposes safe rename, duplicate, apply and delete actions', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /const renameSavedElementStyle = id =>/);
  assert.match(editor, /const duplicateSavedElementStyle = preset =>/);
  assert.match(editor, /const applySavedElementStyle = preset =>/);
  assert.match(editor, /const removeSavedElementStyle = id =>/);
  assert.match(editor, /stylePresets: \[\.\.\.normalized\.stylePresets, \{ \.\.\.preset, id/);
  assert.match(editor, /normalized\.responsive\?\.\[viewport\]\?\.elementStyles/);
  assert.match(editor, /disabled=\{normalized\.stylePresets\.length >= 30\}/);
});

test('admin style library supports bounded JSON import and export actions', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /const exportSavedElementStyles = \(presets = normalized\.stylePresets, filename =/);
  assert.match(editor, /format: 'geostore-admin-style-presets'/);
  assert.match(editor, /const importSavedElementStyles = async event =>/);
  assert.match(editor, /file\.size > 100 \* 1024/);
  assert.match(editor, /normalizeAdminPanelVisualDesign\(\{ stylePresets: sourcePresets \}\)/);
  assert.match(editor, /30 - normalized\.stylePresets\.length/);
  assert.match(editor, /JSON ექსპორტი/);
  assert.match(editor, /JSON იმპორტი/);
  assert.match(editor, /parsed\?\.format !== 'geostore-admin-style-presets'/);
  assert.match(editor, /!\[1, 2\]\.includes\(parsed\?\.version\)/);
  assert.match(editor, /Aa · GEOSTORE/);
  assert.match(editor, /preset\.style\.backgroundColor \|\| '#0f172a'/);
  assert.match(editor, /preset\.style\.textColor \|\| '#e2e8f0'/);
  assert.match(editor, /preset\.style\.borderColor \|\| '#334155'/);
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


test('native checkbox, radio and range controls stay scoped to the admin visual editor theme', () => {
  const css = readFileSync(new URL('../src/adminPanelVisualDesign.css', import.meta.url), 'utf8');
  assert.match(css, /\.admin-dashboard-pro\[data-admin-visual-design="enabled"\] :is\(input\[type="checkbox"\], input\[type="radio"\]\)/);
  assert.match(css, /accent-color: var\(--admin-vd-accent-active\)/);
  assert.match(css, /\.admin-dashboard-pro\[data-admin-visual-design="enabled"\] input\[type="range"\]/);
  assert.match(css, /\.admin-dashboard-pro\[data-admin-visual-design="enabled"\] select option/);
});


test('admin modules have independent bounded geometry and responsive inheritance', () => {
  const design = normalizeAdminPanelVisualDesign({
    components: {
      orders: { radius: 44, padding: 36, borderWidth: 3, shadowBlur: 30 },
      support: { radius: 99, padding: 2, borderWidth: 8, shadowBlur: -4 }
    },
    responsive: {
      tablet: { components: { orders: { radius: 20, padding: 18 } } },
      mobile: { components: { support: { radius: 12, shadowBlur: 0 } } }
    }
  });
  const style = buildAdminPanelVisualStyle(design);

  assert.deepEqual(Object.fromEntries(['radius', 'padding', 'borderWidth', 'shadowBlur'].map(key => [key, design.components.orders[key]])), { radius: 44, padding: 36, borderWidth: 3, shadowBlur: 30 });
  assert.deepEqual(Object.fromEntries(['radius', 'padding', 'borderWidth', 'shadowBlur'].map(key => [key, design.components.support[key]])), { radius: 48, padding: 4, borderWidth: 4, shadowBlur: 0 });
  assert.deepEqual(design.responsive.tablet.components.orders, { radius: 20, padding: 18 });
  assert.deepEqual(design.responsive.mobile.components.support, { radius: 12, shadowBlur: 0 });
  assert.equal(style['--admin-vd-orders-radius'], '44px');
  assert.equal(style['--admin-vd-orders-padding'], '36px');
  assert.equal(style['--admin-vd-tablet-orders-radius'], '20px');
  assert.equal(style['--admin-vd-tablet-orders-padding'], '18px');
  assert.equal(style['--admin-vd-tablet-orders-borderWidth'], '3px');
  assert.equal(style['--admin-vd-mobile-support-radius'], '12px');
  assert.equal(style['--admin-vd-mobile-support-shadowBlur'], '0px');
  assert.equal(style['--admin-vd-mobile-support-padding'], '4px');
});

test('module geometry remains scoped to the admin visual design and supports all editor viewports', () => {
  const css = readFileSync(new URL('../src/adminPanelVisualDesign.css', import.meta.url), 'utf8');
  for (const moduleName of ['staff', 'inventory', 'analytics', 'orders', 'support', 'discounts', 'banners', 'categories', 'coupons']) {
    assert.match(css, new RegExp('--admin-vd-' + moduleName + '-radius-active'));
    assert.match(css, new RegExp('--admin-vd-' + moduleName + '-padding-active'));
    assert.match(css, new RegExp('--admin-vd-' + moduleName + '-borderWidth-active'));
    assert.match(css, new RegExp('--admin-vd-' + moduleName + '-shadowBlur-active'));
  }
  assert.match(css, /--admin-vd-orders-radius-active: var\(--admin-vd-mobile-orders-radius, var\(--admin-vd-tablet-orders-radius, var\(--admin-vd-orders-radius\)\)\)/);
  assert.match(css, /--admin-vd-support-radius-active: var\(--admin-vd-mobile-support-radius, var\(--admin-vd-tablet-support-radius, var\(--admin-vd-support-radius\)\)\)/);
});

test('admin visual editor exposes independent module geometry controls for desktop, tablet and mobile', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /მოდულების ინდივიდუალური დიზაინი/);
  assert.match(editor, /updateComponentValue/);
  assert.match(editor, /active\.components\[component\.key\]\[property\.key\]/);
  for (const moduleName of ['staff', 'inventory', 'analytics', 'orders', 'support', 'discounts', 'banners', 'categories', 'coupons']) {
    assert.match(editor, new RegExp('"key": "' + moduleName + '"'));
  }
});


test('admin modules expose independent typography and surface colors with responsive overrides', () => {
  const design = normalizeAdminPanelVisualDesign({ components: { orders: { fontSize: 16, titleFontSize: 24, textColor: '#123456', backgroundColor: '#223344', borderColor: '#334455' } }, responsive: { tablet: { components: { orders: { fontSize: 14, textColor: '#abcdef' } } }, mobile: { components: { orders: { titleFontSize: 18, backgroundColor: '#445566' } } } } });
  const style = buildAdminPanelVisualStyle(design);
  assert.equal(style['--admin-vd-orders-fontSize'], '16px');
  assert.equal(style['--admin-vd-orders-titleFontSize'], '24px');
  assert.equal(style['--admin-vd-orders-textColor'], '#123456');
  assert.equal(style['--admin-vd-orders-backgroundColor'], '#223344');
  assert.equal(style['--admin-vd-orders-borderColor'], '#334455');
  assert.equal(style['--admin-vd-tablet-orders-fontSize'], '14px');
  assert.equal(style['--admin-vd-tablet-orders-textColor'], '#abcdef');
  assert.equal(style['--admin-vd-mobile-orders-fontSize'], '14px');
  assert.equal(style['--admin-vd-mobile-orders-titleFontSize'], '18px');
  assert.equal(style['--admin-vd-mobile-orders-backgroundColor'], '#445566');
  assert.equal(normalizeAdminPanelVisualDesign({ components: { orders: { textColor: 'url(javascript:alert(1))' } } }).components.orders.textColor, '#e2e8f0');
});

test('admin visual editor exposes module typography and individual color controls', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /titleFontSize/);
  assert.match(editor, /ტექსტის ფერი/);
  assert.match(editor, /ბლოკის ფონი/);
  assert.match(editor, /ჩარჩოს ფერი/);
});


test('admin visual preferences use owner-checked shared Supabase RPCs instead of browser-only persistence', () => {
  const api = readFileSync(new URL('../src/utils/adminPanelVisualDesignApi.js', import.meta.url), 'utf8');
  const dashboard = readFileSync(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
  const migration = readFileSync(new URL('../supabase/migrations/20261119150000_admin_panel_visual_design_sync.sql', import.meta.url), 'utf8');
  const policyMigration = readFileSync(new URL('../supabase/migrations/20261119151000_admin_panel_visual_settings_owner_policy.sql', import.meta.url), 'utf8');
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');

  assert.match(api, /rpc\('get_admin_panel_visual_design_state'\)/);
  assert.match(api, /rpc\('save_admin_panel_visual_design_state'/);
  assert.match(dashboard, /fetchAdminPanelVisualDesign\(\)/);
  assert.match(dashboard, /saveAdminPanelVisualDesignToCloud\(adminVisualDesign, adminVisualUpdatedAtRef\.current\)/);
  assert.match(dashboard, /adminVisualDesignReady/);
  assert.match(dashboard, /ადმინპანელის საერთო დიზაინი იტვირთება/);
  assert.match(dashboard, /setAdminVisualReloadKey\(value => value \+ 1\)/);
  assert.match(migration, /private\.admin_panel_visual_settings/);
  assert.match(migration, /auth\.uid\(\) IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid/);
  assert.match(migration, /auth\.jwt\(\)->'app_metadata'->>'role'/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(policyMigration, /CREATE POLICY admin_panel_visual_settings_owner_only/);
  assert.match(migration, /REVOKE ALL ON TABLE private\.admin_panel_visual_settings FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.save_admin_panel_visual_design\(jsonb\) TO authenticated/);
  assert.match(editor, /ყველა მოწყობილობაზე გამოჩნდეს/);
  assert.match(editor, /შენახულია საერთო საცავში/);
});

test('open admin sessions refresh shared visual settings without overwriting unsaved local drafts', () => {
  const dashboard = readFileSync(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
  assert.match(dashboard, /visibleAdminTab !== 'admin_visual_editor'/);
  assert.match(dashboard, /void refreshSharedDesign\(\)/);
  assert.match(dashboard, /window\.setInterval\(refreshSharedDesign, 30000\)/);
  assert.match(dashboard, /window\.addEventListener\('focus', refreshSharedDesign\)/);
  assert.match(dashboard, /document\.addEventListener\('visibilitychange', handleVisibilityChange\)/);
  assert.match(dashboard, /adminVisualHasLocalChangesRef\.current/);
  assert.match(dashboard, /requestVersion !== adminVisualSaveVersionRef\.current/);
  assert.match(dashboard, /onChange=\{handleAdminVisualDesignChange\}/);
  assert.match(dashboard, /adminVisualHasLocalChangesRef\.current = false/);
});


test('every admin visual module selector is present on a real AdminDashboardPro element', () => {
  const dashboard = readFileSync(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
  const visualCss = readFileSync(new URL('../src/adminPanelVisualDesign.css', import.meta.url), 'utf8');
  const moduleTargets = {
    staff: ['admin-staff-panel', 'admin-staff-list-panel'],
    inventory: ['admin-inventory-panel'],
    analytics: ['admin-analytics-card', 'admin-analytics-toolbar'],
    orders: ['admin-orders-panel'],
    support: ['admin-support-panel'],
    discounts: ['admin-discounts-panel'],
    banners: ['admin-banners'],
    categories: ['admin-category-manager'],
    coupons: ['admin-coupons-panel']
  };

  for (const [moduleName, classNames] of Object.entries(moduleTargets)) {
    for (const className of classNames) {
      assert.match(dashboard, new RegExp('className="[^"]*' + className + '(?:\\s|")'));
    }
    assert.match(visualCss, new RegExp('--admin-vd-' + moduleName + '-backgroundColor-active'));
  }
});


test('admin visual content overrides are normalized, bounded and available across all modules', () => {
  const design = normalizeAdminPanelVisualDesign({
    content: {
      ordersTitle: 'ჩემი შეკვეთები',
      ordersDescription: 'ახალი განმარტება',
      categoriesCreateTitle: 'კატეგორიის სათაური'.repeat(40),
      couponsSubmitLabel: 123
    }
  });
  assert.equal(design.content.ordersTitle, 'ჩემი შეკვეთები');
  assert.equal(design.content.ordersDescription, 'ახალი განმარტება');
  assert.equal(design.content.categoriesCreateTitle.length, 260);
  assert.equal(design.content.couponsSubmitLabel, 'კუპონის დამატება');
  assert.equal(design.content.inventoryTitle, 'მარაგის მოძრაობების ისტორია');
});

test('admin visual editor exposes text editing and live admin modules consume the overrides', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  const dashboard = readFileSync(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
  assert.match(editor, /ტექსტების რედაქტირება/);
  assert.match(editor, /ADMIN_PANEL_CONTENT_FIELDS\.map/);
  for (const key of ['staffExistingUsersTitle','staffInviteTitle','staffListTitle']) {
    assert.match(dashboard, new RegExp('visualContent\\.' + key));
  }
  for (const key of ['inventoryTitle','analyticsPeriodTitle','ordersTitle','supportTitle','discountsTitle','bannersCreateTitle','categoriesCreateTitle','couponsCreateTitle']) {
    assert.match(dashboard, new RegExp('adminVisualDesign\\.content\\.' + key));
  }
  assert.match(dashboard, /visualContent=\{adminVisualDesign\.content\}/);
});


test('per-module typography alignment and font weights are normalized and emitted safely', () => {
  const design = normalizeAdminPanelVisualDesign({
    components: {
      orders: { titleFontWeight: 900, bodyFontWeight: 300, textAlign: 'center' },
      staff: { titleFontWeight: 9999, bodyFontWeight: 'invalid', textAlign: 'justify' }
    }
  });
  assert.equal(design.components.orders.titleFontWeight, 900);
  assert.equal(design.components.orders.bodyFontWeight, 300);
  assert.equal(design.components.orders.textAlign, 'center');
  assert.equal(design.components.staff.titleFontWeight, 900);
  assert.equal(design.components.staff.bodyFontWeight, 400);
  assert.equal(design.components.staff.textAlign, 'left');
  const style = buildAdminPanelVisualStyle(design);
  assert.equal(style['--admin-vd-orders-titleFontWeight'], '900');
  assert.equal(style['--admin-vd-orders-textAlign'], 'center');
});


test('per-module border styles accept only supported CSS values and remain responsive', () => {
  const design = normalizeAdminPanelVisualDesign({
    components: { orders: { borderStyle: 'dashed' }, staff: { borderStyle: 'expression(alert(1))' } },
    responsive: { tablet: { components: { orders: { borderStyle: 'dotted' } } }, mobile: { components: { orders: { borderStyle: 'none' } } } }
  });
  assert.equal(design.components.orders.borderStyle, 'dashed');
  assert.equal(design.components.staff.borderStyle, 'solid');
  const style = buildAdminPanelVisualStyle(design);
  assert.equal(style['--admin-vd-orders-borderStyle'], 'dashed');
  assert.equal(style['--admin-vd-tablet-orders-borderStyle'], 'dotted');
  assert.equal(style['--admin-vd-mobile-orders-borderStyle'], 'none');
});


test('order sub-element styles normalize safely and inherit independently by viewport', () => {
  const design = normalizeAdminPanelVisualDesign({
    elementStyles: { orderCard: { fontSize: 18, fontWeight: 800, textAlign: 'center', backgroundColor: '#123456', borderRadius: 20, padding: 24 } },
    responsive: {
      tablet: { elementStyles: { orderCard: { fontSize: 16, textAlign: 'right' } } },
      mobile: { elementStyles: { orderCard: { padding: 8 } } }
    }
  });
  assert.equal(design.elementStyles.orderCard.fontSize, 18);
  assert.equal(design.elementStyles.orderCard.fontWeight, 800);
  assert.equal(design.elementStyles.orderCard.backgroundColor, '#123456');
  assert.equal(design.responsive.tablet.elementStyles.orderCard.fontSize, 16);
  assert.equal(design.responsive.tablet.elementStyles.orderCard.textAlign, 'right');
  assert.equal(design.responsive.mobile.elementStyles.orderCard.padding, 8);
  const style = buildAdminPanelVisualStyle(design);
  assert.equal(style['--admin-vd-element-orderCard-fontSize'], '18px');
  assert.equal(style['--admin-vd-element-tablet-orderCard-fontSize'], '16px');
  assert.equal(style['--admin-vd-element-mobile-orderCard-padding'], '8px');
});


test('fine-grained order editor selectors exist in the real admin dashboard markup', () => {
  const dashboard = readFileSync(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
  const stylesheet = readFileSync(new URL('../src/adminPanelVisualDesign.css', import.meta.url), 'utf8');
  const selectors = [
    'admin-orders-header',
    'admin-orders-toolbar',
    'admin-order-card',
    'admin-order-card-heading',
    'admin-order-card-customer',
    'admin-order-actions',
    'admin-order-status-badge',
    'admin-orders-pagination',
    'admin-order-detail-modal'
  ];
  for (const selector of selectors) {
    assert.ok(dashboard.includes(selector), `Missing real dashboard selector: ${selector}`);
    assert.ok(stylesheet.includes(`.${selector}`), `Missing visual editor CSS selector: ${selector}`);
  }
});


test('desktop order sub-element CSS uses concrete design keys and never leaves template placeholders', () => {
  const css = readFileSync(new URL('../src/adminPanelVisualDesign.css', import.meta.url), 'utf8');
  const selectors = {
    '.admin-orders-header': 'orderHeader',
    '.admin-orders-toolbar': 'orderToolbar',
    '.admin-order-card': 'orderCard',
    '.admin-order-card-heading': 'orderCardHeading',
    '.admin-order-card-customer': 'orderCustomer',
    '.admin-order-actions': 'orderActions',
    '.admin-order-status-badge': 'orderStatusBadge',
    '.admin-orders-pagination': 'orderPagination',
    '.admin-order-detail-modal': 'orderDetailModal'
  };
  for (const [selector, key] of Object.entries(selectors)) {
    const start = css.indexOf(selector + ' {');
    assert.ok(start >= 0, `Missing desktop style rule for ${selector}`);
    const end = css.indexOf('\n}', start);
    assert.ok(end > start, `Unclosed desktop style rule for ${selector}`);
    const rule = css.slice(start, end);
    assert.ok(rule.includes('--admin-vd-element-' + key + '-fontSize'), `Missing design key for ${selector}`);
    assert.ok(!rule.includes('${key}'), `Unresolved template placeholder for ${selector}`);
  }
});


test('all eight admin modules expose real fine-grained visual editor targets with responsive styles', () => {
  const dashboard = readFileSync(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
  const utility = readFileSync(new URL('../src/utils/adminPanelVisualDesign.js', import.meta.url), 'utf8');
  const stylesheet = readFileSync(new URL('../src/adminPanelVisualDesign.css', import.meta.url), 'utf8');
  const targets = [{"key":"staffList","selector":".admin-staff-list-panel"},{"key":"staffCreateForm","selector":".admin-staff-create-form"},{"key":"inventoryPanel","selector":".admin-inventory-panel"},{"key":"inventoryHistoryRow","selector":".admin-inventory-movement-row"},{"key":"inventoryHistoryMetric","selector":".admin-inventory-history-metric"},{"key":"inventoryMovementRow","selector":".admin-replenishment-row"},{"key":"inventoryMetric","selector":".admin-replenishment-metric"},{"key":"analyticsToolbar","selector":".admin-analytics-toolbar"},{"key":"analyticsCard","selector":".admin-analytics-card"},{"key":"analyticsGrid","selector":".admin-analytics-kpis"},{"key":"supportTicket","selector":".admin-support-ticket"},{"key":"supportTicketHeader","selector":".admin-support-ticket-header"},{"key":"supportTicketMessage","selector":".admin-support-ticket-message"},{"key":"supportReplyForm","selector":".admin-support-reply-form"},{"key":"discountForm","selector":".admin-flash-sale-form"},{"key":"discountFields","selector":".admin-flash-sale-fields"},{"key":"discountActiveSummary","selector":".gs-admin-flash-sale-active"},{"key":"bannerForm","selector":".admin-banner-form"},{"key":"bannerCard","selector":".admin-banner-card"},{"key":"bannerList","selector":".admin-banner-list"},{"key":"categoryForm","selector":".admin-category-form"},{"key":"categoryCard","selector":".admin-category-card"},{"key":"subcategoryCard","selector":".admin-subcategory-card"},{"key":"couponForm","selector":".admin-coupon-form"},{"key":"couponCard","selector":".admin-coupon-card"},{"key":"couponList","selector":".admin-coupon-list"}];
  for (const { key, selector } of targets) {
    assert.match(dashboard, new RegExp(`className="[^"]*${selector.slice(1)}(?:\\s|")`), `Missing JSX className target: ${selector}`);
    assert.ok(utility.includes(key), `Missing normalized visual design key: ${key}`);
    assert.ok(stylesheet.includes(selector + ' {'), `Missing desktop visual rule: ${selector}`);
    assert.ok(stylesheet.includes('--admin-vd-element-tablet-' + key + '-fontSize'), `Missing tablet style token: ${key}`);
    assert.ok(stylesheet.includes('--admin-vd-element-mobile-' + key + '-fontSize'), `Missing mobile style token: ${key}`);
  }
});

test('responsive element styles inherit desktop values and preserve device-specific overrides', () => {
  const design = normalizeAdminPanelVisualDesign({
    elementStyles: { staffList: { fontSize: 15, textColor: '#123456' } },
    responsive: {
      tablet: { elementStyles: { staffList: { fontSize: 14 } } },
      mobile: { elementStyles: { staffList: { fontSize: 12 } } }
    }
  });
  const style = buildAdminPanelVisualStyle(design);
  assert.equal(style['--admin-vd-element-staffList-fontSize'], '15px');
  assert.equal(style['--admin-vd-element-tablet-staffList-fontSize'], '14px');
  assert.equal(style['--admin-vd-element-mobile-staffList-fontSize'], '12px');
  assert.equal(style['--admin-vd-element-mobile-staffList-textColor'], '#123456');
});

test('inventory history visual controls emit valid CSS properties for all responsive viewports', () => {
  const design = normalizeAdminPanelVisualDesign({
    elementStyles: {
      inventoryHistoryRow: { fontSize: 17, fontWeight: 800, textAlign: 'center', backgroundColor: '#123456' },
      inventoryHistoryMetric: { padding: 18, borderRadius: 16 }
    },
    responsive: {
      tablet: { elementStyles: { inventoryHistoryRow: { fontSize: 15 } } },
      mobile: { elementStyles: { inventoryHistoryRow: { fontSize: 13 }, inventoryHistoryMetric: { padding: 8 } } }
    }
  });
  const style = buildAdminPanelVisualStyle(design);
  assert.equal(style['--admin-vd-element-inventoryHistoryRow-fontSize'], '17px');
  assert.equal(style['--admin-vd-element-tablet-inventoryHistoryRow-fontSize'], '15px');
  assert.equal(style['--admin-vd-element-mobile-inventoryHistoryRow-fontSize'], '13px');
  assert.equal(style['--admin-vd-element-mobile-inventoryHistoryMetric-padding'], '8px');

  const stylesheet = readFileSync(new URL('../src/adminPanelVisualDesign.css', import.meta.url), 'utf8');
  const historyCss = stylesheet.slice(stylesheet.lastIndexOf('/* Inventory history controls are styled independently'));
  for (const property of ['font-size:', 'font-weight:', 'text-align:', 'color:', 'background-color:', 'border-color:', 'border-radius:', 'padding:']) {
    assert.ok(historyCss.includes(property), `Missing valid CSS property: ${property}`);
  }
  assert.doesNotMatch(historyCss, /  (?:fontSize|fontWeight|textAlign):/);
});


test('every admin visual editor target is wired to real JSX and all eight desktop/tablet/mobile style properties', () => {
  const dashboard = readFileSync(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
  const utility = readFileSync(new URL('../src/utils/adminPanelVisualDesign.js', import.meta.url), 'utf8');
  const stylesheet = readFileSync(new URL('../src/adminPanelVisualDesign.css', import.meta.url), 'utf8');
  const definitionsMatch = utility.match(/const ADMIN_PANEL_ELEMENT_DEFINITIONS = Object\.freeze\((\{.*?\})\);/s);
  assert.ok(definitionsMatch, 'Could not read the canonical admin visual target definitions');
  const definitions = JSON.parse(definitionsMatch[1]);
  const properties = ['fontSize', 'fontWeight', 'textAlign', 'textColor', 'backgroundColor', 'borderColor', 'borderRadius', 'padding'];
  const testStyles = Object.fromEntries(Object.keys(definitions).map(key => [key, {
    fontSize: 17,
    fontWeight: 800,
    textAlign: 'center',
    textColor: '#123456',
    backgroundColor: '#234567',
    borderColor: '#345678',
    borderRadius: 19,
    padding: 21
  }]));
  const tabletStyles = Object.fromEntries(Object.keys(definitions).map(key => [key, { fontSize: 15, textColor: '#456789' }]));
  const mobileStyles = Object.fromEntries(Object.keys(definitions).map(key => [key, { fontSize: 13, padding: 8 }]));
  const generated = buildAdminPanelVisualStyle(normalizeAdminPanelVisualDesign({
    elementStyles: testStyles,
    responsive: {
      tablet: { elementStyles: tabletStyles },
      mobile: { elementStyles: mobileStyles }
    }
  }));
  const cssRules = [...stylesheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)];

  assert.equal(Object.keys(definitions).length, 35, 'Update this regression test when adding/removing canonical visual targets');
  for (const [key, definition] of Object.entries(definitions)) {
    const className = definition.selector.slice(1);
    assert.ok(dashboard.includes(className), `Missing real JSX class target: ${definition.selector}`);

    const targetRules = cssRules.filter(([, selectors]) => selectors.includes(definition.selector));
    assert.ok(targetRules.length > 0, `Missing CSS rule for ${definition.selector}`);
    for (const property of properties) {
      const desktopVariable = `--admin-vd-element-${key}-${property}`;
      assert.ok(targetRules.some(([, , declarations]) => declarations.includes(desktopVariable)), `CSS does not apply ${desktopVariable} to ${definition.selector}`);
      assert.ok(stylesheet.includes(`--admin-vd-element-tablet-${key}-${property}`), `Missing Tablet CSS variable for ${key}.${property}`);
      assert.ok(stylesheet.includes(`--admin-vd-element-mobile-${key}-${property}`), `Missing Mobile CSS variable for ${key}.${property}`);
    }

    assert.equal(generated[`--admin-vd-element-${key}-fontSize`], '17px');
    assert.equal(generated[`--admin-vd-element-${key}-fontWeight`], '800');
    assert.equal(generated[`--admin-vd-element-${key}-textAlign`], 'center');
    assert.equal(generated[`--admin-vd-element-${key}-textColor`], '#123456');
    assert.equal(generated[`--admin-vd-element-${key}-backgroundColor`], '#234567');
    assert.equal(generated[`--admin-vd-element-${key}-borderColor`], '#345678');
    assert.equal(generated[`--admin-vd-element-${key}-borderRadius`], '19px');
    assert.equal(generated[`--admin-vd-element-${key}-padding`], '21px');
    assert.equal(generated[`--admin-vd-element-tablet-${key}-fontSize`], '15px');
    assert.equal(generated[`--admin-vd-element-tablet-${key}-textColor`], '#456789');
    assert.equal(generated[`--admin-vd-element-mobile-${key}-fontSize`], '13px');
    assert.equal(generated[`--admin-vd-element-mobile-${key}-padding`], '8px');
  }
});


test('desktop reset restores desktop styles but preserves content and tablet/mobile overrides', () => {
  const source = normalizeAdminPanelVisualDesign({
    theme: { accent: '#123456' },
    layout: { fontSize: 15 },
    components: { orders: { titleFontSize: 21 } },
    elementStyles: { orderCard: { fontSize: 19 } },
    content: { ordersTitle: 'ჩემი სათაური' },
    responsive: {
      tablet: { theme: { accent: '#234567' }, layout: { fontSize: 14 } },
      mobile: { theme: { accent: '#345678' }, layout: { fontSize: 12 } }
    }
  });

  const reset = resetAdminPanelVisualViewport(source, 'desktop');

  assert.deepEqual(reset.theme, DEFAULT_ADMIN_PANEL_VISUAL_DESIGN.theme);
  assert.deepEqual(reset.layout, DEFAULT_ADMIN_PANEL_VISUAL_DESIGN.layout);
  assert.deepEqual(reset.components, DEFAULT_ADMIN_PANEL_VISUAL_DESIGN.components);
  assert.deepEqual(reset.elementStyles, DEFAULT_ADMIN_PANEL_VISUAL_DESIGN.elementStyles);
  assert.deepEqual(reset.content, source.content);
  assert.deepEqual(reset.responsive.tablet, source.responsive.tablet);
  assert.deepEqual(reset.responsive.mobile, source.responsive.mobile);
});

test('tablet reset removes only tablet overrides and preserves desktop, mobile and content', () => {
  const source = normalizeAdminPanelVisualDesign({
    theme: { accent: '#123456' },
    layout: { fontSize: 15 },
    content: { ordersTitle: 'ჩემი სათაური' },
    responsive: {
      tablet: { theme: { accent: '#234567' }, layout: { fontSize: 14 } },
      mobile: { theme: { accent: '#345678' }, layout: { fontSize: 12 } }
    }
  });

  const reset = resetAdminPanelVisualViewport(source, 'tablet');

  assert.deepEqual(reset.theme, source.theme);
  assert.deepEqual(reset.layout, source.layout);
  assert.deepEqual(reset.content, source.content);
  assert.deepEqual(reset.responsive.tablet.theme, {});
  assert.deepEqual(reset.responsive.tablet.layout, {});
  assert.ok(Object.values(reset.responsive.tablet.components).every(value => Object.keys(value).length === 0));
  assert.ok(Object.values(reset.responsive.tablet.elementStyles).every(value => Object.keys(value).length === 0));
  assert.deepEqual(reset.responsive.mobile, source.responsive.mobile);
});

test('mobile reset removes only mobile overrides and preserves desktop, tablet and content', () => {
  const source = normalizeAdminPanelVisualDesign({
    theme: { accent: '#123456' },
    layout: { fontSize: 15 },
    content: { ordersTitle: 'ჩემი სათაური' },
    responsive: {
      tablet: { theme: { accent: '#234567' }, layout: { fontSize: 14 } },
      mobile: { theme: { accent: '#345678' }, layout: { fontSize: 12 } }
    }
  });

  const reset = resetAdminPanelVisualViewport(source, 'mobile');

  assert.deepEqual(reset.theme, source.theme);
  assert.deepEqual(reset.layout, source.layout);
  assert.deepEqual(reset.content, source.content);
  assert.deepEqual(reset.responsive.mobile.theme, {});
  assert.deepEqual(reset.responsive.mobile.layout, {});
  assert.ok(Object.values(reset.responsive.mobile.components).every(value => Object.keys(value).length === 0));
  assert.ok(Object.values(reset.responsive.mobile.elementStyles).every(value => Object.keys(value).length === 0));
  assert.deepEqual(reset.responsive.tablet, source.responsive.tablet);
});


test('visual editor exposes bounded undo/redo history and routes editor mutations through history', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /const historyRef = useRef\(\{ past: \[\], future: \[\], present: normalized \}\)/);
  assert.match(editor, /\.slice\(-50\)/);
  assert.match(editor, /const undoChange = \(\) =>/);
  assert.match(editor, /const redoChange = \(\) =>/);
  assert.match(editor, /onClick=\{undoChange\} disabled=\{!historyState\.canUndo\}/);
  assert.match(editor, /onClick=\{redoChange\} disabled=\{!historyState\.canRedo\}/);
  assert.match(editor, /commitChange\(normalizeAdminPanelVisualDesign\(/);
  assert.match(editor, /historyRef\.current = \{ past: \[\], future: \[\], present: normalized \}/);
  assert.doesNotMatch(editor.slice(editor.indexOf('const updateValue'), editor.indexOf('  return (\n    <section')), /onChange\(normalizeAdminPanelVisualDesign\(/);
});


test('admin visual editor provides searchable, category-filtered quick access to all 35 element editors', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  const utility = readFileSync(new URL('../src/utils/adminPanelVisualDesign.js', import.meta.url), 'utf8');
  const definitionsMatch = utility.match(/const ADMIN_PANEL_ELEMENT_DEFINITIONS = Object\.freeze\((\{.*?\})\);/s);
  assert.ok(definitionsMatch, 'Could not read canonical element definitions');
  const definitions = JSON.parse(definitionsMatch[1]);
  const categoryMatch = editor.match(/const ELEMENT_CATEGORIES = \[([\s\S]*?)\n\];/);
  assert.ok(categoryMatch, 'Missing element category definitions');
  const categoryKeys = [...categoryMatch[1].matchAll(/keys: \[([^\]]+)\]/g)]
    .flatMap(match => [...match[1].matchAll(/'([^']+)'/g)].map(item => item[1]));
  assert.equal(categoryKeys.length, 35, 'Every element must belong to one category');
  assert.equal(new Set(categoryKeys).size, 35, 'Element categories must not contain duplicates');
  assert.deepEqual([...categoryKeys].sort(), Object.keys(definitions).sort(), 'Category groups must cover every canonical visual target');
  assert.match(editor, /value=\{elementSearch\}/);
  assert.match(editor, /value=\{elementCategory\}/);
  assert.match(editor, /filteredElementEntries\.map/);
  assert.match(editor, /focusElementEditor\(key\)/);
  assert.match(editor, /scrollIntoView/);
  assert.match(editor, /ამ ძიებით ელემენტი ვერ მოიძებნა/);
});


test('visual editor keyboard shortcuts support undo/redo without hijacking text editing', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  for (const snippet of [
    'const handleHistoryShortcut = event =>',
    'event.ctrlKey || event.metaKey',
    'event.key.toLowerCase()',
    "key === 'z' && event.shiftKey",
    "key === 'y'",
    'redoChange()',
    'undoChange()',
    'input:not([type="range"]):not([type="color"]), textarea, select, [contenteditable="true"]',
    "window.addEventListener('keydown', handleHistoryShortcut)",
    "window.removeEventListener('keydown', handleHistoryShortcut)",
    'title="Undo (Ctrl/Cmd+Z)"',
    'title="Redo (Ctrl/Cmd+Y or Shift+Z)"'
  ]) {
    assert.ok(editor.includes(snippet), `Missing keyboard shortcut behavior: ${snippet}`);
  }
});


test('visual editor can isolate element styles customized for the active viewport', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /const customizedElementKeys = useMemo\(\(\) => new Set\(/);
  assert.match(editor, /normalized\.elementStyles\[key\]/);
  assert.match(editor, /DEFAULT_ADMIN_PANEL_VISUAL_DESIGN\.elementStyles\[key\]/);
  assert.match(editor, /normalized\.responsive\?\.\[viewport\]\?\.elementStyles\?\.\[key\]/);
  assert.match(editor, /showCustomizedOnly && !customizedElementKeys\.has\(key\)/);
  assert.match(editor, /მხოლოდ ამ მოწყობილობის ხედში შეცვლილი ელემენტები/);
  assert.match(editor, /customizedElementKeys\.has\(key\) &&/);
  assert.match(editor, /შეცვლილია/);
});


test('resetAdminPanelVisualElement resets only the selected element in the active viewport', () => {
  const source = normalizeAdminPanelVisualDesign({
    ...DEFAULT_ADMIN_PANEL_VISUAL_DESIGN,
    elementStyles: {
      ...DEFAULT_ADMIN_PANEL_VISUAL_DESIGN.elementStyles,
      orderCard: { ...DEFAULT_ADMIN_PANEL_VISUAL_DESIGN.elementStyles.orderCard, fontSize: 22, textColor: '#123456' },
      orderHeader: { ...DEFAULT_ADMIN_PANEL_VISUAL_DESIGN.elementStyles.orderHeader, fontSize: 20 }
    },
    responsive: {
      tablet: {
        elementStyles: {
          orderCard: { fontSize: 21, textColor: '#abcdef' },
          orderHeader: { fontSize: 19 }
        },
        theme: { accent: '#123456' }
      },
      mobile: {
        elementStyles: {
          orderCard: { fontSize: 18 },
          orderHeader: { fontSize: 17 }
        }
      }
    }
  });

  const desktop = resetAdminPanelVisualElement(source, 'desktop', 'orderCard');
  assert.deepEqual(desktop.elementStyles.orderCard, DEFAULT_ADMIN_PANEL_VISUAL_DESIGN.elementStyles.orderCard);
  assert.equal(desktop.elementStyles.orderHeader.fontSize, 20);
  assert.deepEqual(desktop.responsive, source.responsive);

  const tablet = resetAdminPanelVisualElement(source, 'tablet', 'orderCard');
  assert.deepEqual(tablet.responsive.tablet.elementStyles.orderCard, {});
  assert.deepEqual(tablet.responsive.tablet.elementStyles.orderHeader, source.responsive.tablet.elementStyles.orderHeader);
  assert.deepEqual(tablet.responsive.tablet.theme, source.responsive.tablet.theme);
  assert.deepEqual(tablet.responsive.mobile, source.responsive.mobile);
  assert.equal(tablet.elementStyles.orderCard.fontSize, 22);

  const mobile = resetAdminPanelVisualElement(source, 'mobile', 'orderCard');
  assert.deepEqual(mobile.responsive.mobile.elementStyles.orderCard, {});
  assert.deepEqual(mobile.responsive.mobile.elementStyles.orderHeader, source.responsive.mobile.elementStyles.orderHeader);
  assert.deepEqual(mobile.responsive.tablet, source.responsive.tablet);
  assert.equal(mobile.elementStyles.orderCard.fontSize, 22);

  const unknown = resetAdminPanelVisualElement(source, 'desktop', 'notARealElement');
  assert.deepEqual(unknown, source);
});

test('visual editor exposes a per-element reset without resetting sibling styles', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /resetAdminPanelVisualElement\(normalized, viewport, element\)/);
  assert.match(editor, /onClick=\{\(\) => resetElement\(key\)\}/);
  assert.match(editor, /ამ ელემენტის აღდგენა/);
  assert.match(editor, /disabled=\{!customizedElementKeys\.has\(key\)\}/);
});

test('visual editor offers an explicit retry when shared saving fails', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  const dashboard = readFileSync(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
  assert.match(editor, /syncStatus === 'error'/);
  assert.match(editor, /onClick=\{onRetrySave\}/);
  assert.match(editor, /შენახვის ხელახლა ცდა/);
  assert.match(dashboard, /const retryAdminVisualSave = \(\) =>/);
  assert.match(dashboard, /onRetrySave=\{retryAdminVisualSave\}/);
  assert.match(dashboard, /handleAdminVisualDesignChange\(\{ \.\.\.adminVisualDesign \}\)/);
});

test('visual design API uses optimistic concurrency tokens and exposes conflict handling', () => {
  const api = readFileSync(new URL('../src/utils/adminPanelVisualDesignApi.js', import.meta.url), 'utf8');
  const dashboard = readFileSync(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  const migration = readFileSync(new URL('../supabase/migrations/20261119152000_admin_panel_visual_design_concurrency.sql', import.meta.url), 'utf8');
  assert.match(api, /get_admin_panel_visual_design_state/);
  assert.match(api, /p_expected_updated_at: expectedUpdatedAt/);
  assert.match(dashboard, /adminVisualUpdatedAtRef/);
  assert.match(dashboard, /error\?\.code === '40001' \? 'conflict' : 'error'/);
  assert.match(editor, /syncStatus === 'conflict'/);
  assert.match(editor, /სხვა მოწყობილობაზე დიზაინი უკვე შეიცვალა/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /GREATEST\(clock_timestamp\(\), v_current_updated_at \+ interval '1 microsecond'\)/);
  assert.match(migration, /ERRCODE = '40001'/);
  assert.match(migration, /auth\.uid\(\) IS DISTINCT FROM/);
});


test('admin style library supports safe bulk selection, export and deletion', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /const \[selectedStylePresetIds, setSelectedStylePresetIds\] = useState\(\[\]\)/);
  assert.match(editor, /const toggleStylePresetSelection = id =>/);
  assert.match(editor, /const selectedStylePresets = normalized\.stylePresets\.filter/);
  assert.match(editor, /const selectAllStylePresets = \(\) =>/);
  assert.match(editor, /const removeSelectedStylePresets = \(\) =>/);
  assert.match(editor, /window\.confirm\(/);
  assert.match(editor, /selectedIds\.has\(item\.id\)/);
  assert.match(editor, /geostore-admin-selected-style-presets\.json/);
  assert.match(editor, /მონიშნულის ექსპორტი/);
  assert.match(editor, /მონიშნულის წაშლა/);
  assert.match(editor, /ყველას მონიშვნა/);
  assert.match(editor, /მონიშვნის მოხსნა/);
  assert.match(editor, /სტილის მონიშვნა/);
});

test('saved admin style presets are bounded, uniquely identified and safely normalized', () => {
  const sourcePresets = [{ id: 'empty-first', name: '   ', style: { fontSize: 14 } }, ...Array.from({ length: 31 }, (_, index) => ({
    id: index < 2 ? 'duplicate-preset-id' : `preset-${index}`,
    name: `Preset ${index}`,
    style: {
      fontSize: 99,
      fontWeight: 100,
      borderRadius: -10,
      padding: 99,
      textColor: 'url(javascript:alert(1))',
      backgroundColor: '#123456',
      borderColor: '#abcdef',
      textAlign: 'not-a-valid-alignment',
      unsupportedProperty: 'position:fixed'
    }
  }))];

  const design = normalizeAdminPanelVisualDesign({ stylePresets: sourcePresets });
  assert.equal(design.stylePresets.length, 30);
  assert.equal(new Set(design.stylePresets.map(preset => preset.id)).size, 30);
  assert.equal(design.stylePresets[0].style.fontSize, 24);
  assert.equal(design.stylePresets[0].style.fontWeight, 300);
  assert.equal(design.stylePresets[0].style.borderRadius, 0);
  assert.equal(design.stylePresets[0].style.padding, 32);
  assert.notEqual(design.stylePresets[0].style.textColor, 'url(javascript:alert(1))');
  assert.equal(design.stylePresets[0].style.backgroundColor, '#123456');
  assert.equal(Object.hasOwn(design.stylePresets[0].style, 'unsupportedProperty'), false);
});


test('saved admin style presets normalize categories and preserve backward compatibility', () => {
  const design = normalizeAdminPanelVisualDesign({ stylePresets: [
    { id: 'legacy', name: 'Legacy style', style: { fontSize: 14 } },
    { id: 'orders', name: 'Orders style', category: 'შეკვეთები', style: { fontSize: 15 } },
    { id: 'invalid', name: 'Invalid category', category: 'unknown-category', style: { fontSize: 16 } }
  ] });
  assert.equal(design.stylePresets[0].category, 'საერთო');
  assert.equal(design.stylePresets[1].category, 'შეკვეთები');
  assert.equal(design.stylePresets[2].category, 'საერთო');
});

test('admin style library supports category assignment, search and filtering', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /const \[stylePresetSearch, setStylePresetSearch\] = useState\(''\)/);
  assert.match(editor, /const \[stylePresetCategory, setStylePresetCategory\] = useState\('all'\)/);
  assert.match(editor, /const updateStylePresetCategory = \(id, category\) =>/);
  assert.match(editor, /const filteredStylePresets = useMemo\(\(\) =>/);
  assert.match(editor, /value=\{stylePresetSearch\}/);
  assert.match(editor, /value=\{stylePresetCategory\}/);
  assert.match(editor, /value=\{preset\.category\}/);
  assert.match(editor, /groupedStylePresets\.map\(group/);
  assert.match(editor, /ამ ძიებით სტილი ვერ მოიძებნა/);
});


test('admin style presets retain valid creation dates and safely normalize legacy dates', () => {
  const design = normalizeAdminPanelVisualDesign({ stylePresets: [
    { id: 'dated', name: 'Dated', category: 'შეკვეთები', createdAt: '2026-11-19T10:00:00.000Z', style: { fontSize: 14 } },
    { id: 'legacy-date', name: 'Legacy date', createdAt: 'not-a-date', style: { fontSize: 15 } }
  ] });
  assert.equal(design.stylePresets[0].createdAt, '2026-11-19T10:00:00.000Z');
  assert.equal(design.stylePresets[1].createdAt, null);
});

test('admin style library groups categories and supports deterministic sort modes', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /const \[stylePresetSort, setStylePresetSort\] = useState\('newest'\)/);
  assert.match(editor, /const groupedStylePresets = useMemo\(\(\) =>/);
  assert.match(editor, /groupedStylePresets\.map\(group/);
  assert.match(editor, /group\.items\.map\(preset/);
  assert.match(editor, /value="newest"/);
  assert.match(editor, /value="name"/);
  assert.match(editor, /value="category"/);
  assert.match(editor, /createdAt: new Date\(\)\.toISOString\(\)/);
});


test('saved admin style presets preserve favorites and default legacy entries to not favorite', () => {
  const design = normalizeAdminPanelVisualDesign({ stylePresets: [
    { id: 'favorite', name: 'Favorite style', favorite: true, style: { fontSize: 14 } },
    { id: 'legacy', name: 'Legacy style', style: { fontSize: 15 } },
    { id: 'invalid', name: 'Invalid favorite', favorite: 'yes', style: { fontSize: 16 } }
  ] });
  assert.equal(design.stylePresets[0].favorite, true);
  assert.equal(design.stylePresets[1].favorite, false);
  assert.equal(design.stylePresets[2].favorite, false);
});

test('admin style library supports favorite toggling and favorite-only filtering', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  const utility = readFileSync(new URL('../src/utils/adminPanelVisualDesign.js', import.meta.url), 'utf8');
  assert.match(utility, /const favorite = preset\?\.favorite === true/);
  assert.match(editor, /const \[showFavoriteStylePresets, setShowFavoriteStylePresets\] = useState\(false\)/);
  assert.match(editor, /const toggleStylePresetFavorite = id =>/);
  assert.match(editor, /!showFavoriteStylePresets \|\| preset\.favorite/);
  assert.match(editor, /მხოლოდ რჩეულები/);
  assert.match(editor, /რჩეულებში დამატება/);
  assert.match(editor, /რჩეულებიდან ამოღება/);
});


test('admin style library can apply a saved style to multiple selected elements', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /const \[selectedElementKeys, setSelectedElementKeys\] = useState\(\[\]\)/);
  assert.match(editor, /const applySavedElementStyleToTargets = \(preset, targetKeys\) =>/);
  assert.match(editor, /const applySavedElementStyleToSelected = preset =>/);
  assert.match(editor, /next\.elementStyles\[key\] = \{ \.\.\.next\.elementStyles\[key\], \.\.\.selectedStyle \}/);
  assert.match(editor, /elementStyles\[key\] = \{ \.\.\.\(elementStyles\[key\] \|\| \{\}\), \.\.\.selectedStyle \}/);
  assert.match(editor, /მონიშნულ \{selectedElementKeys\.length\}-ზე/);
  assert.match(editor, /მონიშვნის მოხსნა/);
});


test('admin style library compares selected presets without mutating them', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /const comparableStylePresets = selectedStylePresets\.slice\(0, 4\)/);
  assert.match(editor, /შერჩეული სტილების შედარება/);
  assert.match(editor, /styleComparisonFields =/);
  assert.match(editor, /შედარების გასუფთავება/);
  assert.match(editor, /geostore-admin-compared-style-presets\.json/);
  assert.match(editor, /შედარება ცვლილებებს არ ახორციელებს/);
});


test('saved admin style preset history is validated and limited to the latest ten versions', () => {
  const history = Array.from({ length: 12 }, (_, index) => ({ savedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(), style: { fontSize: 12 + index, textColor: '#123456' } }));
  const design = normalizeAdminPanelVisualDesign({ stylePresets: [{ id: 'history-test', name: 'ისტორია', style: { fontSize: 18 }, history: [...history, { savedAt: 'invalid-date', style: { fontSize: 20 } }] }] });
  assert.equal(design.stylePresets[0].history.length, 10);
  assert.equal(design.stylePresets[0].history[0].style.fontSize, 14);
  assert.equal(design.stylePresets[0].history.at(-1).style.fontSize, 23);
  assert.equal(design.stylePresets[0].history.every(entry => Number.isFinite(Date.parse(entry.savedAt))), true);
});

test('admin style editor can save a new preset version and restore a prior version', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /updateSavedStyleFromSelectedElement/);
  assert.match(editor, /restoreSavedStyleVersion/);
  assert.match(editor, /ვერსიების ისტორია/);
  assert.match(editor, /ამ ვერსიის აღდგენა/);
  assert.match(editor, /slice\(-10\)/);
});


test('admin style library supports bulk category and favorite management', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /updateSelectedStylePresetCategory/);
  assert.match(editor, /toggleSelectedStylePresetFavorites/);
  assert.match(editor, /მონიშნული სტილების ახალი კატეგორია/);
  assert.match(editor, /კატეგორიის შეცვლა \(/);
  assert.match(editor, /რჩეულებში დამატება/);
});

test('admin style library detects identical style presets without auto-deleting them', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /duplicateStyleGroups = useMemo/);
  assert.match(editor, /selectDuplicateStylePresets/);
  assert.match(editor, /დუბლირებული ასლების მონიშვნა/);
  assert.match(editor, /წაშლა ავტომატურად არ ხდება/);
});

test('admin style JSON import skips duplicate style values already in the library and within the file', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /const styleKey = style => JSON\.stringify/);
  assert.match(editor, /const knownStyleKeys = new Set\(normalized\.stylePresets\.map/);
  assert.match(editor, /const uniqueImportedPresets = validated\.stylePresets\.filter/);
  assert.match(editor, /duplicateCount \+= 1/);
  assert.match(editor, /დუბლიკატი გამოტოვებულია/);
});


test('admin style export v2 preserves library metadata and keeps v1 imports compatible', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /version: 2/);
  assert.match(editor, /includesCategories: true,\s*includesFavorites: true,\s*includesVersionHistory: true/);
  assert.match(editor, /!\[1, 2\]\.includes\(parsed\?\.version\)/);
  assert.doesNotMatch(editor, /\\\\n\s+window\.alert/);
});


test('admin style backup restore explicitly confirms replacement and guards oversized backups', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /stylePresetImportModeRef\.current === 'restore'/);
  assert.match(editor, /sourcePresets\.length > 30/);
  assert.match(editor, /window\.confirm\(`სრული აღდგენა ჩაანაცვლებს/);
  assert.match(editor, /stylePresets: validated\.stylePresets/);
  assert.match(editor, /stylePresetImportModeRef\.current = 'merge'/);
  assert.match(editor, /სრული აღდგენა/);
});


test('admin style backup restore rejects malformed or lossy preset data before replacing current styles', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /const allowedStyleKeys = new Set/);
  assert.match(editor, /const validStyle = style =>/);
  assert.match(editor, /invalidIndex !== -1 \|\| validated\.stylePresets\.length !== sourcePresets\.length/);
  assert.match(editor, /სარეზერვო ფაილი დაზიანებულია ან არასრულია/);
  assert.match(editor, /existing library|არსებული ბიბლიოთეკა უცვლელი დარჩა/);
  assert.match(editor, /preset\.history\.length > 10/);
  assert.match(editor, /ids\.has\(id\)/);
  assert.match(editor, /typeof preset\.id !== 'string'/);
  assert.match(editor, /preset\.id\.trim\(\)\.length > 80/);
  assert.match(editor, /preset\.name\.trim\(\)\.length > 40/);
});


test('admin style library automatically backs up before destructive changes and restores safely', () => {
  const initial = normalizeAdminPanelVisualDesign({
    stylePresets: [
      { id: 'one', name: 'ძველი სტილი', category: 'შეკვეთები', favorite: true, style: { fontSize: 18 } }
    ]
  });
  const backedUp = createAdminStylePresetBackup(initial, 'მონიშნული სტილების წაშლამდე: 1');
  assert.equal(backedUp.stylePresetBackups.length, 1);
  assert.equal(backedUp.stylePresetBackups[0].stylePresets[0].name, 'ძველი სტილი');
  assert.equal(backedUp.stylePresetBackups[0].stylePresets[0].favorite, true);

  const afterDelete = normalizeAdminPanelVisualDesign({ ...backedUp, stylePresets: [] });
  const restored = restoreAdminStylePresetBackup(afterDelete, backedUp.stylePresetBackups[0].id);
  assert.equal(restored.stylePresets.length, 1);
  assert.equal(restored.stylePresets[0].id, 'one');
  assert.equal(restored.stylePresets[0].style.fontSize, 18);
  assert.equal(restored.stylePresetBackups.length, 2);
  assert.equal(restored.stylePresetBackups.at(-1).reason, 'ავტომატური ასლი აღდგენამდე');
});

test('admin style automatic backups are normalized and limited to the latest ten', () => {
  const backups = Array.from({ length: 12 }, (_, index) => ({
    id: `backup-${index}`,
    savedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    reason: `backup reason ${index}`,
    stylePresets: [{ id: `preset-${index}`, name: `Style ${index}`, style: { fontSize: 12 + index } }]
  }));
  const design = normalizeAdminPanelVisualDesign({ stylePresetBackups: backups });
  assert.equal(design.stylePresetBackups.length, 10);
  assert.equal(design.stylePresetBackups[0].id, 'backup-2');
  assert.equal(design.stylePresetBackups.at(-1).id, 'backup-11');
  assert.equal(normalizeAdminPanelVisualDesign({ stylePresetBackups: [{ id: 'bad', savedAt: 'invalid', stylePresets: [] }] }).stylePresetBackups.length, 0);
});

test('admin style editor protects single, bulk and full-restore deletion paths with automatic backups', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /createAdminStylePresetBackup\(normalized, `სტილის წაშლამდე:/);
  assert.match(editor, /createAdminStylePresetBackup\(normalized, `მონიშნული სტილების წაშლამდე:/);
  assert.match(editor, /createAdminStylePresetBackup\(normalized, 'სრული JSON აღდგენის წინ'/);
  assert.match(editor, /restoreAdminStylePresetBackup\(normalized, backup\.id\)/);
  assert.match(editor, /ავტომატური სარეზერვო ასლები/);
  assert.match(editor, /ასლის აღდგენა/);
});


test('admin style backups support safe single-style restore without replacing the library', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /const restoreSingleStyleFromBackup = \(backup, preset\) =>/);
  assert.match(editor, /ერთი სტილის აღდგენამდე:/);
  assert.match(editor, /დანარჩენი სტილები უცვლელი დარჩება/);
  assert.match(editor, /დუბლიკატი არ დაემატა/);
  assert.match(editor, /normalized\.stylePresets\.length >= 30/);
  assert.match(editor, /history: \[\.\.\.\(preset\.history \|\| \[\]\), \.\.\.\(current\.history \|\| \[\]\)/);
  assert.match(editor, /ამ სტილის აღდგენა/);
  assert.match(editor, /protectedDesign\.stylePresets\.map\(item => item\.id === preset\.id \? restoredPreset : item\)/);
});


test('admin style library searches style values and filters by colors, typography and spacing', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /stylePresetPropertyFilter, setStylePresetPropertyFilter/);
  assert.match(editor, /JSON\.stringify\(preset\.style\)/);
  assert.match(editor, /stylePresetPropertyFilter === 'colors'/);
  assert.match(editor, /stylePresetPropertyFilter === 'typography'/);
  assert.match(editor, /stylePresetPropertyFilter === 'spacing'/);
  assert.match(editor, /value="oldest"/);
  assert.match(editor, /სტილის პარამეტრების ტიპის ფილტრი/);
  assert.match(editor, /პირველად დამატებული/);
});


test('admin style backup preview supports safe selective multi-style restoration', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /selectedBackupStyleIds, setSelectedBackupStyleIds/);
  assert.match(editor, /const restoreSelectedStylesFromBackup = backup =>/);
  assert.match(editor, /სარეზერვო ასლიდან ნაწილობრივი აღდგენა/);
  assert.match(editor, /მონიშნულის აღდგენა/);
  assert.match(editor, /ყველას მონიშვნა/);
  assert.match(editor, /მონიშვნის მოხსნა/);
  assert.match(editor, /stylePresets\.length \+ additions\.length > 30/);
  assert.match(editor, /selectedKeys\.has\(key\)/);
  assert.match(editor, /დუბლირების თავიდან ასაცილებლად აღდგენა შეჩერდა/);
  assert.match(editor, /history: \[\.\.\.\(preset\.history \|\| \[\]\), \.\.\.\(current\.history \|\| \[\]\)/);
  assert.match(editor, /setSelectedStylePresetIds\(selected\.map\(preset => preset\.id\)\)/);
});


test('admin style presets can apply only selected style properties', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /selectedStylePropertyKeys, setSelectedStylePropertyKeys/);
  assert.match(editor, /const selectedStyle = Object\.fromEntries\(Object\.entries\(preset\?\.style \|\| \{\}\)\.filter\(\(\[key\]\) => selectedStylePropertyKeys\.includes\(key\)\)\)/);
  assert.match(editor, /რომელი პარამეტრები გადავიტანოთ\?/);
  assert.match(editor, /დანარჩენი სამიზნე ელემენტზე უცვლელი დარჩება/);
  assert.match(editor, /setSelectedStylePropertyKeys\(\[\]\)/);
  assert.match(editor, /selectedStylePropertyKeys\.length/);
  assert.match(editor, /STYLE_PROPERTY_OPTIONS\.map\(option/);
});


test('admin element selection can add, clear and toggle only visible filtered elements', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /selectVisibleElementsPreservingOthers/);
  assert.match(editor, /current => \[\.\.\.new Set\(\[\.\.\.current, \.\.\.filteredElementEntries\.map\(\(\[key\]\) => key\)\]\)\]/);
  assert.match(editor, /clearVisibleElementSelection/);
  assert.match(editor, /current\.filter\(key => !visibleKeys\.has\(key\)\)/);
  assert.match(editor, /toggleVisibleElementSelection/);
  assert.match(editor, /allVisibleSelected/);
  assert.match(editor, /ნაჩვენების დამატება/);
  assert.match(editor, /ნაჩვენების მოხსნა/);
  assert.match(editor, /ნაჩვენების გადართვა/);
  assert.match(editor, /ნაჩვენებიდან: \{visibleSelectedElementCount\}/);
});


test('admin visual editor safely restores selected customized elements in the active viewport', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /const resetSelectedElements = \(\) =>/);
  assert.match(editor, /selectedElementKeys\.filter\(key => customizedElementKeys\.has\(key\)\)/);
  assert.match(editor, /window\.confirm\(\`არჩეული \$\{targets\.length\} შეცვლილი ელემენტის/);
  assert.match(editor, /targets\.reduce\(\(current, key\) => resetAdminPanelVisualElement\(current, viewport, key\), normalized\)/);
  assert.match(editor, /commitChange\(nextDesign\)/);
  assert.match(editor, /setSelectedElementKeys\(current => current\.filter\(key => !targets\.includes\(key\)\)\)/);
  assert.match(editor, /მონიშნული შეცვლილის აღდგენა/);
  assert.match(editor, /სხვა ხედები და დანარჩენი ელემენტები უცვლელი დარჩება/);
});

test('admin visual editor can reset only customized elements in the active module and viewport', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /const resetCurrentModuleElements = \(\) =>/);
  assert.match(editor, /ELEMENT_CATEGORIES\.find\(item => item\.id === elementCategory\)/);
  assert.match(editor, /category\.keys\.filter\(key => customizedElementKeys\.has\(key\)\)/);
  assert.match(editor, /resetAdminPanelVisualElement\(current, viewport, key\)/);
  assert.match(editor, /სხვა მოდულები და სხვა ხედები უცვლელი დარჩება/);
  assert.match(editor, /მოდულის საწყისზე დაბრუნება/);
  assert.match(editor, /disabled=\{!ELEMENT_CATEGORIES\.some\(category => category\.id === elementCategory && category\.keys\.some\(key => customizedElementKeys\.has\(key\)\)\)\}/);
});

test('admin visual editor can apply a saved style to every element in its module category', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /const applySavedElementStyleToCategory = preset =>/);
  assert.match(editor, /ELEMENT_CATEGORIES\.find\(item => item\.label === preset\?\.category\)/);
  assert.match(editor, /const targets = category\.keys\.filter\(key => ADMIN_PANEL_ELEMENT_DEFINITIONS\[key\]\)/);
  assert.match(editor, /applySavedElementStyleToTargets\(preset, targets\)/);
  assert.match(editor, /სტილი „\$\{preset\.name\}“ გადაეტანოს/);
  assert.match(editor, /მთელ მოდულზე/);
  assert.match(editor, /disabled=\{!ELEMENT_CATEGORIES\.some\(category => category\.label === preset\.category\) \|\| !selectedStylePropertyKeys\.length\}/);
});

test('admin visual editor can batch-save selected element styles without adding empty or duplicate presets', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /const saveSelectedElementStylesAsPresets = \(\) =>/);
  assert.match(editor, /const targets = \[\.\.\.new Set\(selectedElementKeys\)\]/);
  assert.match(editor, /const availableSlots = 30 - normalized\.stylePresets\.length/);
  assert.match(editor, /if \(!Object\.keys\(style\)\.length\) \{ emptyCount \+= 1; return; \}/);
  assert.match(editor, /if \(existingStyleKeys\.has\(signature\)\) \{ duplicateCount \+= 1; return; \}/);
  assert.match(editor, /const accepted = additions\.slice\(0, availableSlots\)/);
  assert.match(editor, /stylePresets: \[\.\.\.normalized\.stylePresets, \.\.\.accepted\]/);
  assert.match(editor, /მონიშნული ელემენტების სტილების შენახვა/);
  assert.match(editor, /დუბლიკატი: \$\{duplicateCount\}/);
});

test('admin visual editor exposes per-element history and restores only that element in the active viewport', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /expandedElementHistoryKeys, setExpandedElementHistoryKeys/);
  assert.match(editor, /const getElementHistoryEntries = key =>/);
  assert.match(editor, /historyRef\.current\.past/);
  assert.match(editor, /\.slice\(0, 5\)/);
  assert.match(editor, /const restoreElementHistoryEntry = \(key, entry\) =>/);
  assert.match(editor, /ამ ელემენტის წინა დიზაინის აღდგენა\?/);
  assert.match(editor, /elementStyles: \{ \.\.\.normalized\.elementStyles, \[key\]: \{ \.\.\.entry\.snapshot\.elementStyles\[key\] \} \}/);
  assert.match(editor, /const previousOverride = entry\.snapshot\.responsive\?\.\[viewport\]\?\.elementStyles\?\.\[key\]/);
  assert.match(editor, /ამ ელემენტის ცვლილებების ისტორია/);
  assert.match(editor, /სხვა ელემენტების პარამეტრები უცვლელი დარჩება/);
});

test('admin visual editor compares each element against its initial design values', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /ELEMENT_STYLE_DIFF_FIELDS/);
  assert.match(editor, /getElementStyleDifferences/);
  assert.match(editor, /DEFAULT_ADMIN_PANEL_VISUAL_DESIGN\.elementStyles\[key\]/);
  assert.match(editor, /expandedElementDiffKeys/);
  assert.match(editor, /toggleElementDiff/);
  assert.match(editor, /საწყისთან შედარება/);
  assert.match(editor, /საწყისი:/);
  assert.match(editor, /ახლა:/);
  for (const property of ['fontSize', 'fontWeight', 'textAlign', 'textColor', 'backgroundColor', 'borderColor', 'borderRadius', 'padding']) {
    assert.ok(editor.includes(`key: '${property}'`), `missing comparison field: ${property}`);
  }
});


test('admin module backups preserve and restore only one module in its selected viewport', () => {
  const category = { id: 'orders', label: 'შეკვეთები', keys: ['orderHeader', 'orderCard'] };
  const initial = normalizeAdminPanelVisualDesign({
    theme: { ordersSectionBackground: '#123456' },
    components: { orders: { radius: 36 } },
    elementStyles: { orderHeader: { fontSize: 19 }, orderCard: { padding: 22 }, staffList: { fontSize: 18 } },
    responsive: { mobile: { elementStyles: { orderHeader: { fontSize: 20 }, staffList: { fontSize: 17 } }, components: { orders: { radius: 18 }, staff: { radius: 12 } } } }
  });
  const backedUp = createAdminPanelModuleBackup(initial, category, 'mobile');
  assert.equal(backedUp.moduleDesignBackups.length, 1);
  const backup = backedUp.moduleDesignBackups[0];
  const changed = normalizeAdminPanelVisualDesign({
    ...backedUp,
    theme: { ...backedUp.theme, ordersSectionBackground: '#654321' },
    elementStyles: { ...backedUp.elementStyles, orderCard: { padding: 4 } },
    responsive: { ...backedUp.responsive, mobile: { ...backedUp.responsive.mobile, elementStyles: { ...backedUp.responsive.mobile.elementStyles, orderHeader: { fontSize: 11 }, staffList: { fontSize: 15 } }, components: { ...backedUp.responsive.mobile.components, orders: { radius: 40 } } } }
  });
  const restored = restoreAdminPanelModuleBackup(changed, backup.id);
  assert.equal(restored.responsive.mobile.theme.ordersSectionBackground, '#123456');
  assert.equal(restored.responsive.mobile.elementStyles.orderCard.padding, 22);
  assert.equal(restored.responsive.mobile.elementStyles.orderHeader.fontSize, 20);
  assert.equal(restored.responsive.mobile.elementStyles.staffList.fontSize, 15);
  assert.equal(restored.responsive.mobile.components.orders.radius, 18);
  assert.equal(restored.responsive.mobile.components.staff.radius, 12);
  assert.equal(deleteAdminPanelModuleBackup(restored, backup.id).moduleDesignBackups.length, 0);
});

test('admin module backups are limited to ten and invalid entries are discarded', () => {
  const backups = Array.from({ length: 12 }, (_, index) => ({
    id: `module-${index}`, savedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    moduleId: 'orders', moduleLabel: 'შეკვეთები', viewport: 'desktop', reason: 'test',
    snapshot: { elementStyles: { orderCard: { fontSize: 14 } }, components: { orders: { radius: 20 } }, theme: {}, content: {} }
  }));
  const normalized = normalizeAdminPanelVisualDesign({ moduleDesignBackups: [...backups, { id: 'bad', savedAt: 'invalid' }] });
  assert.equal(normalized.moduleDesignBackups.length, 10);
  assert.equal(normalized.moduleDesignBackups[0].id, 'module-2');
  assert.equal(normalized.moduleDesignBackups.at(-1).id, 'module-11');
});

test('admin visual editor exposes isolated per-module backup, restore and delete controls', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /createAdminPanelModuleBackup\(normalized, category, viewport\)/);
  assert.match(editor, /restoreAdminPanelModuleBackup\(normalized, backup\.id\)/);
  assert.match(editor, /deleteAdminPanelModuleBackup\(normalized, backupId\)/);
  assert.match(editor, /მოდულის სარეზერვო ასლები/);
  assert.match(editor, /სხვა მოდულები და დანარჩენი ხედები უცვლელი დარჩება/);
});


test('admin module backup comparison reports exact differences without changing the design', () => {
  const category = { id: 'orders', label: 'შეკვეთები', keys: ['orderHeader', 'orderCard'] };
  const initial = normalizeAdminPanelVisualDesign({
    elementStyles: { orderHeader: { fontSize: 18 }, orderCard: { padding: 20 }, staffList: { fontSize: 16 } },
    responsive: { mobile: { elementStyles: { orderHeader: { fontSize: 21 } } } }
  });
  const saved = createAdminPanelModuleBackup(initial, category, 'mobile');
  const backup = saved.moduleDesignBackups.at(-1);
  const current = normalizeAdminPanelVisualDesign({
    ...saved,
    responsive: { ...saved.responsive, mobile: { ...saved.responsive.mobile, elementStyles: { ...saved.responsive.mobile.elementStyles, orderHeader: { fontSize: 13 } } } }
  });
  const before = JSON.stringify(current);
  const comparison = compareAdminPanelModuleBackup(current, backup.id);
  assert.equal(comparison.moduleId, 'orders');
  assert.equal(comparison.viewport, 'mobile');
  assert.equal(comparison.unchanged, false);
  console.log('MODULE_BACKUP_DIFF_DEBUG', JSON.stringify(comparison.differences));
  assert.equal(comparison.changedCount, 1);
  assert.ok(comparison.differences.some(item => item.path.endsWith('orderHeader.fontSize') && item.saved === 21 && item.current === 13));
  assert.equal(JSON.stringify(current), before);
});

test('admin module backup comparison identifies an unchanged design', () => {
  const category = { id: 'staff', label: 'თანამშრომლები', keys: ['staffList', 'staffCreateForm'] };
  const saved = createAdminPanelModuleBackup(normalizeAdminPanelVisualDesign({}), category, 'desktop');
  const backup = saved.moduleDesignBackups.at(-1);
  const comparison = compareAdminPanelModuleBackup(saved, backup.id);
  assert.equal(comparison.unchanged, true);
  assert.equal(comparison.changedCount, 0);
});


test('admin module backup JSON controls export and safely import validated module backups', () => {
  const editor = readFileSync(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');
  assert.match(editor, /geostore-admin-module-design-backups/);
  assert.match(editor, /normalizeAdminPanelVisualDesign\(\{ moduleDesignBackups: parsed\.moduleDesignBackups \}\)/);
  assert.match(editor, /250 \* 1024/);
  assert.match(editor, /moduleBackupFileInputRef/);
  assert.match(editor, /JSON იმპორტი/);
  assert.match(editor, /JSON ექსპორტი/);
  assert.match(editor, /მაქსიმუმ 10 ასლის ლიმიტისთვის/);
});

test('module backup import normalization rejects malformed records and caps the collection', () => {
  const valid = createAdminPanelModuleBackup(normalizeAdminPanelVisualDesign({}), {
    id: 'orders', label: 'შეკვეთები', keys: ['orderHeader', 'orderCard']
  }, 'desktop').moduleDesignBackups[0];
  const imported = normalizeAdminPanelVisualDesign({ moduleDesignBackups: [valid] });
  assert.equal(imported.moduleDesignBackups.length, 1);
  assert.equal(normalizeAdminPanelVisualDesign({ moduleDesignBackups: [{ ...valid, viewport: 'wide' }] }).moduleDesignBackups.length, 0);
  assert.equal(normalizeAdminPanelVisualDesign({ moduleDesignBackups: Array.from({ length: 12 }, (_, index) => ({ ...valid, id: `import-${index}` })) }).moduleDesignBackups.length, 10);
});
