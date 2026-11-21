import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { addProductToCart } from '../src/utils/cartSafety.js';
import { getCartFeedbackMessage } from '../src/utils/cartFeedback.js';
const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const store = readFileSync(new URL('../src/components/StoreView.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/designSystemV2.css', import.meta.url), 'utf8');

test('stage45 quick-view actions are keyboard reachable and preserve modal failure state', () => {
 assert.match(store, /<button type="button" onClick={event => handleOpenProduct\\(prod, event\\.currentTarget\\)} aria-label=/);
 assert.match(store, /className="gs-flash-sale-title-action"/);
 assert.match(store, /if \\(added !== false\\) setSelectedProduct\\(null\\)/);
 assert.match(store, /returnTarget\\?\\.isConnected/);
 assert.match(store, /gs-custom-variant-name font-bold/);
 assert.match(css, /Stage 45 — accessible Flash Sale quick-view/);
 assert.match(css, /\\.gs-custom-variant-option[\\s\\S]*?min-height: 44px !important/);
 assert.match(css, /\\.gs-flash-sale-title-action[\\s\\S]*?min-height: 44px/);
});
test('stage45 stock-limit and option feedback is localized for all three languages', () => {
 for(const lang of ['ka','en','ru']) {
  for(const kind of ['invalidQuantity','invalidSize','invalidColor','invalidCombination','unavailableVariant','selectVariant','outOfStock']) {
   assert.ok(getCartFeedbackMessage(lang,kind).length > 12, lang+'/'+kind);
  }
  assert.ok(getCartFeedbackMessage(lang,'stockLimit',{remaining:2}).includes('2'));
  assert.ok(getCartFeedbackMessage(lang,'added',{name:'Jacket'}).includes('Jacket'));
 }
 assert.match(getCartFeedbackMessage('en','invalidColor'), /selected color/i);
 assert.match(getCartFeedbackMessage('ru','outOfStock'), /нет в наличии/);
 assert.equal(getCartFeedbackMessage('invalid','invalidSize'),getCartFeedbackMessage('ka','invalidSize'));
 assert.equal(getCartFeedbackMessage('en','stockLimit',{remaining:NaN}),getCartFeedbackMessage('en','outOfStock'));
 assert.match(app, /getCartFeedbackMessage\\(currentLang, 'invalidCombination'\\), 'error'/);
 assert.match(app, /role=\\{toastTone === 'error' \\? 'alert' : 'status'\\}/);
 assert.match(app, /toastTimerRef\\.current = setTimeout/);
});
test('stage45 rapid repeated taps must not exceed stock or overwrite cart', () => {
 const product={id:'stage45',name:'Jacket',priceGEL:105,stock:1,selectedSize:'M'};
 const first=addProductToCart([],product,1);
 assert.equal(first.valid,true);
 const second=addProductToCart(first.cart,product,1);
 assert.equal(second.valid,false);assert.equal(second.reason,'limit');
 assert.equal(second.remaining,0);assert.deepEqual(second.cart,first.cart);
 assert.equal(addProductToCart([],{...product,stock:0},1).reason,'stock');
 assert.equal(addProductToCart([],product,1.5).reason,'quantity');
});
