import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const modals = readFileSync(new URL('../src/components/Modals.jsx', import.meta.url), 'utf8');
const browser = readFileSync(new URL('./browser/stage46PurchaseScenarios.mjs', import.meta.url), 'utf8');

test('Stage 47: checkout field errors are tied to their editable inputs', () => {
  assert.match(app, /setCheckoutErrorField\(contactValidation\.field\)/);
  assert.match(app, /checkoutErrorField=\{checkoutErrorField\}/);
  assert.match(modals, /form\.querySelector\(/);
  for (const field of ['name', 'phone', 'email', 'address']) {
    assert.ok(modals.includes('name="' + field + '"'));
    assert.ok(modals.includes("checkoutErrorField === '" + field + "'"));
    assert.ok(modals.includes("updateCheckoutField('" + field + "'"));
  }
  assert.match(modals, /target\.focus\(\{ preventScroll: true \}\)/);
  assert.match(modals, /onCheckoutValidationEdit\?\.\(\)/);
});

test('Stage 47: checkout dialog keeps keyboard focus contained', () => {
  assert.match(modals, /const checkoutDialogRef = useRef\(null\)/);
  assert.match(modals, /event\.key === 'Escape'/);
  assert.match(modals, /if \(isSubmittingOrder\) return/);
  assert.match(modals, /event\.key !== 'Tab'/);
  assert.match(modals, /previousFocus\.focus\(\{ preventScroll: true \}\)/);
  assert.match(modals, /disabled=\{isSubmittingOrder\}/);
});

test('Stage 47: live React E2E includes validation recovery without order submission', () => {
  assert.match(browser, /Stage47 Test Customer/);
  assert.match(browser, /aria-describedby/);
  assert.match(browser, /getAttribute\('name'\) === 'phone'/);
  assert.match(browser, /page\.keyboard\.press\('Escape'\)/);
  assert.match(browser, /Checkout retry preserves corrected contact values/);
  assert.doesNotMatch(browser, /create_order_with_stock/);
});
