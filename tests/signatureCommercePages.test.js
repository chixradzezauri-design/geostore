import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Signature commerce styling remains opt-in and excludes admin',()=>{
 const app=read('src/App.jsx'),view=read('src/components/StoreView.jsx'),css=read('src/storefrontVideoRedesign.css'),modals=read('src/components/Modals.jsx');
 assert.ok(app.includes("data-signature-commerce={activeTab !== 'admin' && siteSettings?.visualDesign?.signature2026 === true"));
 assert.ok(view.includes('data-signature-commerce={signatureHero ? "true" : undefined}'));
 assert.ok(css.includes('.geostore-shell.geostore-fashion-store:where([data-signature-commerce="true"])'));
 for(const token of ['changeCartQuantity(item, Number(item.quantity) + 1)','removeFromCart(item)','calculateCheckoutTotals({','handleAddSavedProduct(savedProd)','handleFindSavedProduct(savedProd)','onClick={handleLogout}'])assert.ok(app.includes(token),token);
 for(const token of ['setSelectedSize(size)','setSelectedColor(colName)','addToCart({','handleAddReview(e, selectedProduct.id)'])assert.ok(view.includes(token),token);
 assert.ok(modals.includes('onSubmit={handlePlaceOrder}'));
});
