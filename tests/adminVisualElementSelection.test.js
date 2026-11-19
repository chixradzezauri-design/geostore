import test from 'node:test';
import assert from 'node:assert/strict';
import { findMostSpecificAdminPanelVisualElement } from '../src/utils/adminPanelVisualDesign.js';

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

  assert.equal((css.match(/@media \\(min-width: 641px\\) and \\(max-width: 1023px\\)/g) || []).length, 4);
  assert.equal((css.match(/@media \\(max-width: 640px\\)/g) || []).length, 3);
  assert.equal(css.includes('@media (min-width: 768px) and (max-width: 1023px)'), false);
  assert.equal(css.includes('@media (max-width: 767px)'), false);
});
