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


test('Atelier inventory and supply forms keep native controls and monetary operations independent',()=>{
 const css=read('src/adminUnifiedWorkspace.css');
 const stage=css.split('/* Atelier inventory:')[1].split('/* Stage 08')[0];
 for(const token of ['overflow-x: auto !important','overscroll-behavior-inline: contain','grid-template-columns: minmax(0,2fr) repeat(2,minmax(0,1fr))','min-height: 44px','font-variant-numeric: tabular-nums','button[type="submit"]:disabled'])assert.ok(stage.includes(token),token);
 const app=read('src/components/AdminDashboardPro.jsx');
 for(const token of ['saveInventoryReplenishmentSetting(position)','recoverInventoryReplenishmentConflict(position.key)','handleAddVendor'])assert.ok(app.includes(token),token);
 const purchase=read('src/components/AdminPurchaseWorkspace.jsx');
 for(const token of ['onSubmit={create}','receive(currentOrder,l)','transition(currentOrder,\'approve\')','transition(currentOrder,\'cancel\')','!ready||!valid'])assert.ok(purchase.includes(token),token);
 assert.ok(read('tests/browser/adminWorkspaceSmoke.mjs').includes('inventory and supply controls stay inside their regions'));
});


test('Atelier finance separates financial presentation from the existing calculation and data guards',()=>{
 const css=read('src/adminUnifiedWorkspace.css');
 const stage=css.split('/* Atelier finance:')[1].split('/* Stage 10')[0];
 for(const token of ['grid-template-rows: auto auto 1fr','grid-template-columns: 18px minmax(0,1fr)','font-variant-numeric: tabular-nums','data-admin-pro-calculator-net','min-height: 44px','admin-expense-submit:disabled'])assert.ok(stage.includes(token),token);
 const app=read('src/components/AdminDashboardPro.jsx');
 for(const token of ['ordersVerifiedForReports','expensesVerifiedForReports','verifiedFinanceSnapshot','calculatedSalesMetrics.netProfit','handleAddExpense','handleDeleteExpense'])assert.ok(app.includes(token),token);
 assert.ok(read('tests/browser/adminWorkspaceSmoke.mjs').includes('financial content stays within its own region'));
});


test('Atelier account management keeps native permissions, authorization and CRM semantics intact',()=>{
 const css=read('src/adminUnifiedWorkspace.css');
 const stage=css.split('/* Atelier staff:')[1].split('/* Stage 12')[0];
 for(const token of ['grid-template-columns: 20px minmax(0,1fr)','input[type="checkbox"]','min-height: 44px','button:disabled','/* Atelier CRM:','admin-crm-edit-panel'])assert.ok(stage.includes(token),token);
 const app=read('src/components/AdminDashboardPro.jsx');
 for(const token of ['handleInviteStaff','handleAddExistingUser','saveStaff(staff)','revokeStaff(staff)','reactivateStaff(staff)','canEditCrmCustomer(u)','handleToggleVipUser','handleToggleBlockUser','handleSaveUserCrm'])assert.ok(app.includes(token),token);
 assert.ok(read('tests/browser/adminWorkspaceSmoke.mjs').includes('staff and CRM controls remain bounded'));
});


test('Atelier correspondence preserves message delivery limitations and existing support operations',()=>{
 const css=read('src/adminUnifiedWorkspace.css');
 const stage=css.split('/* Atelier correspondence:')[1].split('/* Stage 12')[0];
 for(const token of ['grid-template-columns: minmax(0,auto) minmax(0,1fr)','aria-expanded="true"','min-height: 44px','data-admin-pro-thread-role="admin"','data-admin-pro-delivery-disabled','admin-support-reply-form'])assert.ok(stage.includes(token),token);
 const app=read('src/components/AdminDashboardPro.jsx');
 for(const token of ['handleUpdateTicketStatus(t.id','handleSendTicketReply(t.id)','fetchSupportTicketThread(t.id)','fetchLegacyMessages','handleSendBroadcast','მომხმარებლებისთვის რეალური გაგზავნა ჯერ დაკავშირებული არ არის.'])assert.ok(app.includes(token),token);
 assert.ok(read('tests/browser/adminWorkspaceSmoke.mjs').includes('communication regions stay bounded'));
});


test('Atelier promotions retain draft and pricing contracts while bounding promotion controls',()=>{
 const css=read('src/adminUnifiedWorkspace.css');
 const stage=css.split('/* Atelier promotions:')[1].split('/* Stage 13')[0];
 for(const token of ['grid-template-columns: 76px minmax(0,1fr)','min-height: 44px','admin-unified-flash-price-pair','object-fit: contain','button:disabled'])assert.ok(stage.includes(token),token);
 const app=read('src/components/AdminDashboardPro.jsx');
 for(const token of ['handleApplyFlashSale','selectedFlashRows','handleCreateCoupon','handleDeleteCoupon(c.id)','handleAddBanner','handleDeleteBanner(b.id)','moveBanner(b.id, -1)','onPublishStorefront','flashSalePlannedStart'])assert.ok(app.includes(token),token);
 assert.ok(read('tests/browser/adminWorkspaceSmoke.mjs').includes('promotion controls stay within their regions'));
});


test('Atelier editor controls are scoped away from preview content and retain publication safeguards',()=>{
 const css=read('src/adminUnifiedWorkspace.css');
 const stage=css.split('/* Atelier editor chrome:')[1].split('/* Stage 14')[0];
 for(const token of ['min-height: 44px','[data-admin-unified-editor-actions]','grid-template-columns: repeat(3,minmax(0,1fr))','button:disabled','admin-unified-preview-toolbar'])assert.ok(stage.includes(token),token);
 assert.doesNotMatch(stage,/\.gs-visual-preview-content|\.gs-visual-preview-frame/);
 const store=read('src/components/StorefrontVisualEditor.jsx');
 for(const token of ['onClick={saveDraft}','onClick={publish}','heroImagePending || !isOwner','clearViewportOverrides','onRestoreStorefrontVersion'])assert.ok(store.includes(token),token);
 const admin=read('src/components/AdminPanelVisualEditor.jsx');
 for(const token of ['undoChange','redoChange','resetViewport','onRetrySave','onReloadRemote','directSelectionMode'])assert.ok(admin.includes(token),token);
 assert.ok(read('tests/browser/adminWorkspaceSmoke.mjs').includes('editor tools remain bounded and publication actions unique'));
});


test('Atelier cascade uses one primary product edit treatment and preserves KPI status colors',()=>{
 const css=read('src/adminUnifiedWorkspace.css');
 const rule=css.split('/* Atelier dashboard:')[1].match(/\.admin-command-kpi\s*\{[^}]+\}/)[0];
 assert.ok(rule.indexOf('border-color:')<rule.indexOf('border-block-start: 3px solid'));
 const video=read('src/adminVideoRedesign.css');
 const hover=video.match(/\.admin-command-kpi:hover\s*\{([^}]+)\}/);
 assert.ok(hover,'dashboard KPI hover rule exists');
 assert.match(hover[1],/border-inline-color:/);
 assert.match(hover[1],/border-block-end-color:/);
 assert.doesNotMatch(hover[1],/\bborder-color:|\bborder-block-start(?:-color)?:|\bborder-top(?:-color)?:/);
 for(const tone of ['primary','warning','danger'])assert.ok(video.includes('[data-admin-command-status="'+tone+'"],[data-admin-kpi-tone="'+tone+'"]'));
 assert.equal((css.match(/\.admin-product-controls > \.admin-video-edit\s*\{/g)||[]).length,1);
 assert.ok(!css.includes('background: color-mix(in srgb, var(--av-accent) 8%, var(--av-inset))'));
 assert.ok(read('tests/browser/adminWorkspaceSmoke.mjs').includes('KPI semantic borders survive card border-color shorthand'));
});


test('Atelier narrow dashboard keeps explicit label and icon tracks and one column at 320px',()=>{
 const css=read('src/adminUnifiedWorkspace.css');
 assert.match(css,/@media \(max-width: 359px\)\s*\{[^}]*\.admin-command-kpis\s*\{grid-template-columns: minmax\(0,1fr\) !important;/);
 assert.match(css,/\.admin-command-kpi > span:first-child > span\s*\{[^}]*grid-column: 1;[^}]*overflow-wrap: anywhere !important;/);
 assert.match(css,/\.admin-command-kpi > span:first-child > svg\s*\{[^}]*grid-column: 2;/);
 assert.ok(read('tests/browser/adminWorkspaceSmoke.mjs').includes('320px dashboard has one readable KPI column'));
});


test('deep audit uses active title and KPI typography and tests actual header separation',()=>{
 const css=read('src/adminUnifiedWorkspace.css');
 assert.ok(css.includes('clamp(18px,var(--admin-vd-titleFontSize-active,22px),26px)'));
 assert.ok(css.includes('clamp(22px,calc(var(--admin-vd-titleFontSize-active,22px) * 1.25),30px)'));
 assert.ok(css.includes(':has(> .admin-pro-header-actions)'));
 const smoke=read('tests/browser/adminWorkspaceSmoke.mjs');
 assert.ok(smoke.includes('header regions stay separated'));
 assert.ok(smoke.includes('header identity/action collision'));
});
