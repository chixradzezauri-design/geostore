import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('promotion redesign retains selection, scheduling and banner/coupon operations',()=>{
 const app=read('src/components/AdminDashboardPro.jsx'),preview=read('src/components/AdminFlashPricePreview.jsx'),schedule=read('src/components/AdminFlashSchedule.jsx');
 for(const term of ['onSubmit={handleApplyFlashSale}','selectedFlashRows(previewFlashPrices(products,flashSaleForm),flashSaleForm.selectedIds)','Boolean(flashSalePlannedStart)','<AdminFlashSchedule client={supabase}','onSubmit={handleAddBanner}','moveBanner(b.id, -1)','moveBanner(b.id, 1)','handleDeleteBanner(b.id)','onSubmit={handleCreateCoupon}','handleDeleteCoupon(c.id)','data-gs-flash-design="true"'])assert.ok(app.includes(term),term);
 for(const term of ['previewFlashPrices(products,form,scheduled)','onSelectionChange(null)','onSelectionChange([])','MAX_FLASH_SELECTION','money(row.current)','money(row.sale)','data-admin-flash-price-risk'])assert.ok(preview.includes(term),term);
 for(const term of ['admin_schedule_selected_flash_sale','admin_cancel_flash_sale_schedule','!ready||lock.current||immediateBusy','validateFlashScheduleRows'])assert.ok(schedule.includes(term),term);
});
test('promotion layouts preserve responsive controls and contrast for status',()=>{
 const css=read('src/adminUnifiedWorkspace.css').split('/* Stage 12 — promotions, coupons and banners.')[1];
 for(const term of ['admin-unified-flash-price-pair','gs-admin-flash-schedule-status[data-status="pending"]','admin-unified-banner-actions','@container (min-width: 480px)','@container (min-width: 760px)','min-height: 44px'])assert.ok(css.includes(term),term);
 assert.doesNotMatch(css,/overflow:\s*(hidden|clip)/);
});


test('flash price captions use explicit readable contrast and bounded typography',()=>{
 const css=read('src/adminUnifiedWorkspace.css'),smoke=read('tests/browser/adminWorkspaceSmoke.mjs');
 assert.match(css,/\[data-admin-flash-price-risk="normal"\] \.admin-unified-flash-price-pair > span:nth-child\(2\) \{[^}]*background: #dff3eb !important;[^}]*color: #14594a !important/);
 assert.match(css,/\[data-admin-flash-price-risk="increase"\] \.admin-unified-flash-price-pair > span:nth-child\(2\) \{[^}]*background: #fff0cc !important;[^}]*color: #754300 !important/);
 assert.match(css,/\.gs-admin-flash-schedule-status \{[^}]*font-size:12px !important/);
 assert.ok(smoke.includes('promotion price and status captions remain readable'));
});


test('Studio promotion and banner controls remain scoped, visible and preserve risk semantics',()=>{
 const css=read('src/adminStudioWorkspace.css').split('/* Studio — promotions and banners.')[1].split('/* Studio — ')[0];
 const prefix='.admin-dashboard-pro.admin-dashboard-shell[data-admin-video-layout="v1"][data-admin-appearance="studio"] ';
 const selectors=css.split('\n').map(line=>line.trim()).filter(line=>line.startsWith('.'));
 assert.ok(selectors.length>20);
 for(const line of selectors)assert.ok(line.startsWith(prefix),line);
 for(const term of ['.admin-flash-workspace-panel > [role="group"] > button[aria-pressed="true"]','.admin-unified-flash-price-row','.gs-admin-flash-schedule-create','.admin-banner-form button[type="submit"]','.admin-unified-banner-actions > button'])assert.ok(css.includes(term),term);
 assert.doesNotMatch(css,/display:\s*none|visibility:\s*hidden|pointer-events\s*:\s*none|overflow\s*:\s*(?:hidden|clip)/);
 assert.doesNotMatch(css,/\[data-admin-flash-price-risk=|\[data-status=|\[data-admin-pro-promotion-state=|data-gs-flash-design/);
});
