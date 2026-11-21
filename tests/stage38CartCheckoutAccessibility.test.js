import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const modals = readFileSync(new URL('../src/components/Modals.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/designSystemV2.css', import.meta.url), 'utf8');
const chromium = readFileSync(new URL('./browser/responsiveLayout.mjs', import.meta.url), 'utf8');

test('Stage 38: cart coupon example is neutral and quantity controls name their product', () => {
  assert.doesNotMatch(app, /placeholder="GEOSTORE2026"/);
  assert.match(app, /placeholder=\{currentLang === 'en' \? 'Promo code'/);
  assert.match(app, /<div role="group" className="gs-cart-quantity-controls/);
  assert.match(app, /Decrease quantity: \$\{item\.name\}/);
  assert.match(app, /Increase quantity: \$\{item\.name\}/);
  assert.match(app, /aria-live="polite" aria-atomic="true" className="min-w-5/);
  assert.match(app, /onClick=\{\(\) => changeCartQuantity\(item, Number\(item\.quantity\) - 1\)\}/);
  assert.match(app, /onClick=\{\(\) => removeFromCart\(item\)\}/);
  assert.match(app, /onSubmit=\{handleApplyCoupon\}/);
});
test('Stage 38: checkout error is focusable inside scrolling form without changing order RPC', () => {
  assert.match(modals, /const checkoutErrorRef = useRef\(null\)/);
  assert.match(modals, /if \(!isCheckoutOpen \|\| !checkoutError\) return undefined/);
  assert.match(modals, /target\.focus\(\{ preventScroll: true \}\)/);
  assert.match(modals, /form\.scrollTo\(/);
  assert.match(modals, /<form ref=\{checkoutFormRef\} onSubmit=\{handlePlaceOrder\} aria-busy=\{isSubmittingOrder\}/);
  assert.match(modals, /<p ref=\{checkoutErrorRef\} tabIndex=\{-1\} id="geostore-checkout-error" role="alert"/);
  assert.match(modals, /<button type="submit" disabled=\{isSubmittingOrder\}/);
});
test('Stage 38: mobile sticky submit bar and safe checkout fields are browser-tested', () => {
  assert.match(css, /Stage 38 — checkout\/cart visibility/);
  assert.match(css, /\.gs-commerce-overlay--checkout \.gs-checkout-submit-area \{\s*position: sticky/);
  assert.match(chromium, /checkoutSubmitPosition, 'sticky'/);
  assert.match(chromium, /cartCouponFont >= 16/);
  assert.match(chromium, /cartRegionFont >= 16/);
});
