import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('unified workspace stylesheet is independent of native control regression boundary',()=>{
 const app=read('src/components/AdminDashboardPro.jsx');
 assert.ok(app.indexOf("import '../adminUnifiedWorkspace.css'")>app.indexOf("import '../adminVideoRedesign.css'"));
 assert.ok(!read('src/adminVideoRedesign.css').includes('/* Unified workspace foundation:'));
 const css=read('src/adminUnifiedWorkspace.css');
 assert.ok(css.includes('/* Unified workspace foundation:'));
 assert.ok(css.includes('grid-row: 2; grid-column: 1 / -1;'));
 assert.ok(css.includes('@container (min-width: 320px)'));
 assert.ok(css.includes('@container (min-width: 800px)'));
 assert.ok(!css.includes('overflow: hidden'));
});
test('workspace chrome retains real navigation, owner checks, publish and logout actions',()=>{
 const app=read('src/components/AdminDashboardPro.jsx');
 for(const token of ['onClick={() => setAdminTab(tab.id)}','onChange={(event) => setAdminTab(event.target.value)}','hasModulePermission(\'settings\')','onSaveStorefrontDraft()','onPublishStorefront()','handleLogout()','aria-label="სისტემიდან გასვლა"','aria-current={isActive ? "page" : undefined}'])assert.ok(app.includes(token),token);
});


test('Atelier navigation uses bounded icon and label tracks with visible active and grouped states',()=>{
 const css=read('src/adminUnifiedWorkspace.css');
 const stage=css.split('/* Atelier navigation:')[1].split('@media')[0];
 for(const token of ['grid-template-columns: minmax(0,1fr) auto','grid-template-columns: 18px minmax(0,1fr)','min-inline-size: 0','inset 3px 0 currentColor','white-space: normal']) assert.ok(stage.includes(token),token);
 assert.doesNotMatch(stage,/position:\s*absolute|overflow:\s*hidden/);
 const video=read('src/adminVideoRedesign.css');
 assert.match(video,/@media\(min-width:768px\) and \(max-width:1023px\) \{[^}]*admin-workspace-nav-group \{ display:block!important;/);
 const smoke=read('tests/browser/adminWorkspaceSmoke.mjs');
 assert.ok(smoke.includes('menu tracks do not collide'));
});


test('Atelier dashboard geometry reserves actual icon size and reflows operational panels by container width',()=>{
 const css=read('src/adminUnifiedWorkspace.css');
 const overview=css.split('/* Atelier dashboard:')[1].split('/* Atelier navigation:')[0];
 for(const term of ['grid-template-columns: minmax(0,1fr) 30px','width: 30px !important','@container (min-width: 720px)','border-block-start: 3px solid','min-inline-size: 0']) assert.ok(overview.includes(term),term);
 const header=css.split('/* Atelier page header:')[1].split('/* Workspace chrome')[0];
 for(const term of ['grid-template-columns: minmax(0,1fr)','border-inline-start: 3px solid','--admin-vd-primaryButtonBackground-active','button:disabled']) assert.ok(header.includes(term),term);
 assert.ok(read('tests/browser/adminWorkspaceSmoke.mjs').includes('dashboard tracks do not collide'));
});


test('Atelier catalogue separates image, labels and action regions without replacing handlers',()=>{
 const css=read('src/adminUnifiedWorkspace.css');
 const catalogue=css.split('/* Atelier catalogue:')[1].split('/* Stage 07')[0];
 for(const token of ['grid-template-columns: 56px minmax(0,1fr)','object-fit: contain','border-inline-start: 1px solid','font-variant-numeric: tabular-nums','--admin-vd-primaryButtonBackground-active']) assert.ok(catalogue.includes(token),token);
 const categories=css.split('/* Atelier categories:')[1].split('/* Stage 09')[0];
 assert.ok(categories.includes('button:disabled'));
 assert.ok(categories.includes('max-inline-size: 100%'));
 const app=read('src/components/AdminDashboardPro.jsx');
 for(const token of ['handleQuickUpdateProduct','handleSaveProduct','handleEditProduct(p)','handleDeleteProduct(p.id)','moveCategory(parentCat.id, -1)','moveCategory(sub.id, 1)']) assert.ok(app.includes(token),token);
 assert.ok(read('tests/browser/adminWorkspaceSmoke.mjs').includes('catalogue identity and actions do not overlap'));
});


test('Atelier orders isolate amount, customer and status actions while preserving transition guards',()=>{
 const css=read('src/adminUnifiedWorkspace.css');
 const order=css.split('/* Atelier orders:')[1].split('/* Stage 06')[0];
 for(const term of ['grid-template-columns: minmax(0,1fr) minmax(120px,auto)','repeat(5,minmax(0,1fr))','min-height: 44px','aria-pressed="true"','grid-column: 1 / -1'])assert.ok(order.includes(term),term);
 assert.doesNotMatch(order,/overflow:\s*(hidden|clip)|position:\s*absolute/);
 const app=read('src/components/AdminDashboardPro.jsx');
 for(const term of ['handleExportOrders','handlePrintInvoice(o)','handleUpdateOrderStatus(o.id,','setSelectedOrderForModal(o)','handleSaveOrderAdminNote(selectedOrderForModal.id)','isDeliveredOrderStatus(o.status)','isShippedOrderStatus(o.status)','orderDetailTriggerRef.current'])assert.ok(app.includes(term),term);
 assert.ok(read('tests/browser/adminWorkspaceSmoke.mjs').includes('order filters fit without duplicate controls'));
});
