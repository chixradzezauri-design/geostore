import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('professional product interface retains existing operations and explicitly labels catalogue status',()=>{
 const app=read('src/components/AdminDashboardPro.jsx');
 for(const term of ['data-admin-pro-product-image','data-admin-pro-gallery-image','data-admin-pro-publication','data-admin-pro-stock','data-admin-pro-product-reset','onSubmit={handleSaveProduct}','onChange={handleImageChange}','handleToggleProductPublished(p.id)','handleDeleteProduct(p.id)','handleEditProduct(p)','handleQuickUpdateProduct(p.id, \'stock\', draft)','setSelectedImages(prev => [prev[idx], ...prev.filter','disabled={Boolean(editingProductId)}'])assert.ok(app.includes(term),term);
 const css=read('src/adminVideoRedesign.css').split('/* Admin PRO 06')[1];
 assert.ok(css.includes('object-fit:contain!important'));
 const lum=h=>{const a=h.match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722};
 const pairs=[...css.matchAll(/--admin-product-status-bg:#([0-9a-f]{6});--admin-product-status-fg:#([0-9a-f]{6})/g)];
 assert.equal(pairs.length,3);
 for(const [,bg,fg] of pairs){const a=[lum(bg),lum(fg)].sort((x,y)=>y-x);assert.ok((a[0]+.05)/(a[1]+.05)>=4.5)}
});
