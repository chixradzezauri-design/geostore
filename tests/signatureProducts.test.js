import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeStorefrontVisualDesign} from '../src/utils/storefrontVisualDesign.js';
import {applySignature2026Design} from '../src/utils/signature2026Design.js';
const view=readFileSync(new URL('../src/components/StoreView.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/storefrontVideoRedesign.css',import.meta.url),'utf8');
test('Signature uses six desktop columns and retains existing catalogue interactions',()=>{
 const design=applySignature2026Design({});
 assert.equal(design.layout.productColumns,6);
 assert.equal(normalizeStorefrontVisualDesign({layout:{productColumns:6}}).layout.productColumns,6);
 for(const token of ['data-signature-products={signatureHero ? "true" : undefined}','toggleWishlist(prod)','toggleComparison(prod)','getProductStartingPrice(prod)','handleOpenProduct(prod, event.currentTarget)','handleProductReorder(event.dataTransfer','handleProductPageChange(page)','videoElementStyle(\'product.button\')'])assert.ok(view.includes(token),token);
 assert.ok(css.includes('repeat(var(--gs-product-columns,6),minmax(0,1fr))'));
});
