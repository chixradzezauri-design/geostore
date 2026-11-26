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
