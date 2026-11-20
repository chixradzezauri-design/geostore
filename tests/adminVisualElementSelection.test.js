import test from 'node:test';
import assert from 'node:assert/strict';
import { ADMIN_PANEL_ELEMENT_DEFINITIONS, DEFAULT_ADMIN_PANEL_VISUAL_DESIGN, buildAdminPanelVisualStyle, findMostSpecificAdminPanelVisualElement } from '../src/utils/adminPanelVisualDesign.js';

test('direct selection prefers a nested admin element over its parent container', () => {
  const parent = { parentElement: null };
  const child = { parentElement: parent };
  const target = {
    parentElement: child,
    closest(selector) {
      if (selector === '.admin-order-card') return parent;
      if (selector === '.admin-order-card-customer') return child;
      return null;
    }
  };

  const match = findMostSpecificAdminPanelVisualElement(target, {
    orderCard: { selector: '.admin-order-card' },
    orderCustomer: { selector: '.admin-order-card-customer' }
  });

  assert.equal(match.key, 'orderCustomer');
  assert.equal(match.element, child);
  assert.equal(match.distance, 1);
});

test('direct selection returns null when no configured element matches', () => {
  const target = { closest: () => null, parentElement: null };
  assert.equal(findMostSpecificAdminPanelVisualElement(target, {
    orderCard: { selector: '.admin-order-card' }
  }), null);
});

test('invalid selectors are ignored without preventing other matches', () => {
  const matched = { parentElement: null };
  const target = {
    parentElement: matched,
    closest(selector) {
      if (selector === '[') throw new Error('Invalid selector');
      if (selector === '.admin-support-ticket-header') return matched;
      return null;
    }
  };

  const match = findMostSpecificAdminPanelVisualElement(target, {
    invalid: { selector: '[' },
    supportTicketHeader: { selector: '.admin-support-ticket-header' }
  });

  assert.equal(match.key, 'supportTicketHeader');
});

test('admin visual element styles use the same tablet and mobile breakpoints as the panel theme', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(new URL('../src/adminPanelVisualDesign.css', import.meta.url), 'utf8');

  assert.equal(css.split('@media (min-width: 641px) and (max-width: 1023px)').length - 1, 3);
  // Additional accessibility rules may share the same supported mobile breakpoint.
  assert.ok(css.split('@media (max-width: 640px)').length - 1 >= 4);
  assert.equal(css.includes('@media (max-width: 639px)'), false);
  assert.equal(css.includes('@media (min-width: 768px) and (max-width: 1023px)'), false);
  assert.equal(css.includes('@media (max-width: 767px)'), false);
});

test('admin element styles preserve desktop values and inherit tablet values on mobile', () => {
  const style = buildAdminPanelVisualStyle({
    elementStyles: {
      orderCard: { fontSize: 16, textColor: '#112233' }
    },
    responsive: {
      tablet: {
        elementStyles: {
          orderCard: { fontSize: 18 }
        }
      },
      mobile: {
        elementStyles: {
          orderCard: { textColor: '#abcdef' }
        }
      }
    }
  });

  assert.equal(style['--admin-vd-element-orderCard-fontSize'], '16px');
  assert.equal(style['--admin-vd-element-tablet-orderCard-fontSize'], '18px');
  assert.equal(style['--admin-vd-element-mobile-orderCard-fontSize'], '18px');
  assert.equal(style['--admin-vd-element-orderCard-textColor'], '#112233');
  assert.equal(style['--admin-vd-element-tablet-orderCard-textColor'], '#112233');
  assert.equal(style['--admin-vd-element-mobile-orderCard-textColor'], '#abcdef');
});

test('admin live preview exposes every module with fine-grained visual targets', async () => {
  const { readFile } = await import('node:fs/promises');
  const editor = await readFile(new URL('../src/components/AdminPanelVisualEditor.jsx', import.meta.url), 'utf8');

  for (const moduleId of ['orders', 'staff', 'inventory', 'analytics', 'support', 'discounts', 'banners', 'categories', 'coupons', 'replenishment']) {
    assert.ok(editor.includes(`<option value="${moduleId}">`), `missing live preview option for ${moduleId}`);
  }
});


test('every admin visual target maps all eight editable style properties to live CSS', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile(new URL('../src/adminPanelVisualDesign.css', import.meta.url), 'utf8');
  const targets = Object.entries(ADMIN_PANEL_ELEMENT_DEFINITIONS);
  assert.equal(targets.length, 35, 'unexpected admin visual target count');

  for (const [key, definition] of targets) {
    assert.ok(css.includes(definition.selector), `missing CSS selector for ${key}: ${definition.selector}`);
    const fields = Object.keys(DEFAULT_ADMIN_PANEL_VISUAL_DESIGN.elementStyles[key] || {});
    assert.equal(fields.length, 8, `unexpected editable property count for ${key}`);
    for (const field of fields) {
      assert.ok(
        css.includes(`var(--admin-vd-element-${key}-${field}`),
        `missing live CSS binding for ${key}.${field}`
      );
    }
  }
});
