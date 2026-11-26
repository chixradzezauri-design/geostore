import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('professional order presentation preserves action contracts and canonical status in both views',()=>{
 const app=read('src/components/AdminDashboardPro.jsx');
 for(const term of ['data-admin-order-status={getOrderStatusFilterKey(o.status)}','data-admin-order-status={getOrderStatusFilterKey(selectedOrderForModal.status)}','data-admin-pro-order-number','data-admin-pro-order-total','data-admin-pro-order-reset','setOrderPageByStatus({})','handleExportOrders','handlePrintInvoice(o)','handleSaveOrderAdminNote(selectedOrderForModal.id)','orderDetailTriggerRef.current = event.currentTarget','normalizeOrderItems(selectedOrderForModal.items)',"handleUpdateOrderStatus(o.id, 'ახალი')",'Boolean(o.stock_restored_at)'])assert.ok(app.includes(term),term);
 const css=read('src/adminVideoRedesign.css').split('/* Admin PRO 05')[1];
 assert.ok(css.includes('grid-template-columns:64px minmax(0,1fr)'));
 for(const status of ['ახალი','მუშავდება','გაგზავნილი','დასრულებული','გაუქმებული'])assert.ok(css.includes('data-admin-order-status="'+status+'"'));
 const lum=h=>{const a=h.match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722};
 const pairs=[...css.matchAll(/--admin-pro-order-bg:#([0-9a-f]{6});--admin-pro-order-fg:#([0-9a-f]{6});?/g)];
 assert.equal(pairs.length,5);
 for(const [,bg,fg] of pairs){const a=[lum(bg),lum(fg)].sort((x,y)=>y-x);assert.ok((a[0]+.05)/(a[1]+.05)>=4.5)}
});
