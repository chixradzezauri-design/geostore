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
