import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('PRO category hierarchy preserves original draft actions and server purchase operations',()=>{
 const app=read('src/components/AdminDashboardPro.jsx');
 for(const term of ['data-admin-pro-category-photo','data-admin-pro-category-summary','handleAddCategory','moveCategory(parentCat.id, -1)','moveCategory(sub.id, 1)','handleSaveEditedCategory(parentCat.id)','handleDeleteCategory(sub.id, sub.name)','isOwner && visibleAdminTab === \'vendors\''])assert.ok(app.includes(term),term);
 const supplier=read('src/components/AdminSupplierWorkspace.jsx');
 for(const term of ['data-admin-pro-supplier-status','onSubmit={submit}','toggle(row)','importOne(item)','row.revision===editing.revision'])assert.ok(supplier.includes(term),term);
 const purchase=read('src/components/AdminPurchaseWorkspace.jsx');
 for(const term of ['data-admin-pro-purchase-status','aria-pressed={selected===o.id}','onSubmit={create}','receive(currentOrder,l)',"transition(currentOrder,'approve')",'recordPayment(currentOrder,payment)','correctPayment(currentOrder,record,reason)'])assert.ok(purchase.includes(term),term);
 for(const file of ['AdminPurchaseWorkspace','AdminPurchasePayments','AdminSupplierBalance'])assert.ok(read('src/components/'+file+'.jsx').includes('data-admin-pro-supply-metric'));
 const css=read('src/adminVideoRedesign.css').split('/* Admin PRO 08')[1];
 const lum=h=>{const a=h.match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722};
 const pairs=[...css.matchAll(/--admin-supply-bg:#([0-9a-f]{6});--admin-supply-fg:#([0-9a-f]{6})/g)];
 assert.equal(pairs.length,5);
 for(const [,bg,fg] of pairs){const a=[lum(bg),lum(fg)].sort((x,y)=>y-x);assert.ok((a[0]+.05)/(a[1]+.05)>=4.5)}
});
