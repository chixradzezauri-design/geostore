import test from 'node:test';
import assert from 'node:assert/strict';
import {
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
    theme: { accent: '#112233', panel: '#223344', navActiveBackground: '#abcdef', headerBackground: '#aabbcc', tableHeaderText: '#112244', inputFocus: '#556677', contentCardBackground: '#a1b2c3', contentCardBorder: '#b2c3d4', staffSectionBackground: '#aabbcc', inventorySectionBorder: '#bbccdd', analyticsSectionBackground: '#ccddee', ordersSectionBackground: '#ddeeff', supportSectionBorder: '#aabbcc', modalBackground: '#123abc', modalText: '#ffffff', modalBorder: '#345678', modalOverlayBackground: '#123456' },
    layout: { fontSize: 14, cardRadius: 20, sectionGap: 30, headerPadding: 28, tableCellPadding: 10, inputHeight: 48, cardBorderWidth: 2, cardShadowBlur: 30, modalRadius: 32, modalPadding: 30, modalOverlayOpacity: 90 },
    responsive: {
      tablet: { theme: { accent: '#123456', navActiveBackground: '#445566', headerBackground: '#667788', inputFocus: '#778899', contentCardBackground: '#8899aa', modalBackground: '#7788aa', modalOverlayBackground: '#abcdef', staffSectionBackground: '#ddeeff' }, layout: { fontSize: 13, navItemRadius: 8, sectionGap: 18, headerPadding: 16, inputHeight: 42, cardBorderWidth: 1, cardShadowBlur: 12, modalRadius: 18, modalPadding: 16, modalOverlayOpacity: 70 } },
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
  assert.equal(style['--admin-vd-inputFocus'], '#556677');
  assert.equal(style['--admin-vd-tablet-headerBackground'], '#667788');
  assert.equal(style['--admin-vd-tablet-inputFocus'], '#778899');
  assert.equal(style['--admin-vd-tablet-headerPadding'], '16px');
  assert.equal(style['--admin-vd-tablet-inputHeight'], '42px');
  assert.equal(style['--admin-vd-headerPadding'], '28px');
  assert.equal(style['--admin-vd-tableCellPadding'], '10px');
  assert.equal(style['--admin-vd-inputHeight'], '48px');
  assert.equal(style['--admin-vd-contentCardBackground'], '#a1b2c3');
  assert.equal(style['--admin-vd-contentCardBorder'], '#b2c3d4');
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
  assert.equal(style['--admin-vd-ordersSectionBackground'], '#0f172a');
  assert.equal(style['--admin-vd-supportSectionBorder'], '#334155');
  assert.equal(style['--admin-vd-tablet-ordersSectionBackground'], '#ddeeff');
  assert.equal(style['--admin-vd-tablet-supportSectionBorder'], '#aabbcc');
  assert.equal(style['--admin-vd-tablet-staffSectionBackground'], '#ddeeff');
  assert.equal(style['--admin-vd-tablet-contentCardBackground'], '#8899aa');
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
