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
    layout: { fontSize: 99, cardRadius: -4, cardPadding: 100, sidebarWidth: 10 }
  });

  assert.equal(design.theme.accent, DEFAULT_ADMIN_PANEL_VISUAL_DESIGN.theme.accent);
  assert.equal(design.theme.panel, '#123456');
  assert.equal(design.layout.fontSize, 16);
  assert.equal(design.layout.cardRadius, 10);
  assert.equal(design.layout.cardPadding, 32);
  assert.equal(design.layout.sidebarWidth, 240);
});

test('tablet and mobile admin visual overrides inherit unset desktop values', () => {
  const design = normalizeAdminPanelVisualDesign({
    theme: { accent: '#112233', panel: '#223344' },
    layout: { fontSize: 14, cardRadius: 20 },
    responsive: {
      tablet: { theme: { accent: '#abcdef' }, layout: { fontSize: 13 } },
      mobile: { theme: { panel: '#334455' }, layout: { cardPadding: 14 } }
    }
  });
  const style = buildAdminPanelVisualStyle(design);

  assert.equal(style['--admin-vd-accent'], '#112233');
  assert.equal(style['--admin-vd-tablet-accent'], '#abcdef');
  assert.equal(style['--admin-vd-tablet-panel'], '#223344');
  assert.equal(style['--admin-vd-tablet-fontSize'], '13px');
  assert.equal(style['--admin-vd-mobile-accent'], '#112233');
  assert.equal(style['--admin-vd-mobile-panel'], '#334455');
  assert.equal(style['--admin-vd-mobile-cardPadding'], '14px');
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
