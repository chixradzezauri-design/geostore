import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('product section navigation keeps all targets and existing mutations',()=>{
 const app=read('src/components/AdminDashboardPro.jsx');
 for(const target of ['geostore-product-form','admin-unified-product-description','admin-unified-product-variants','admin-unified-product-gallery','admin-pro-catalogue-title'])assert.equal(app.split('id="'+target+'"').length,2,target);
 for(const token of ['admin-unified-product-jumps','section?.focus({preventScroll: true})','onSubmit={handleSaveProduct}','onChange={handleImageChange}','handleEditProduct(p)','handleDeleteProduct(p.id)','handleToggleProductPublished(p.id)',"handleQuickUpdateProduct(p.id, 'stock', draft)","handleQuickUpdateProduct(p.id, 'priceGEL', draft)","handleQuickUpdateProduct(p.id, 'purchaseCost', draft)",'setSelectedImages(prev => [prev[idx], ...prev.filter','disabled={Boolean(editingProductId)}'])assert.ok(app.includes(token),token);
});
test('product layout uses actual container width, retains accessible fields and gallery',()=>{
 const css=read('src/adminUnifiedWorkspace.css').split('/* Stage 06 — product workspace.')[1];
 assert.ok(css);
 for(const token of ['@container (min-width: 480px)','@container (min-width: 700px)','@container (min-width: 900px)','@media (max-width: 359px)','admin-product-controls input[type="number"]','admin-workspace-gallery-card:first-child','min-height: 44px'])assert.ok(css.includes(token),token);
 assert.doesNotMatch(css,/overflow:\s*(hidden|clip)/);
});
