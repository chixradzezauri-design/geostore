import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('video flash scope labels have paired readable colors and preserve selection',()=>{
 const app=read('src/components/AdminFlashPricePreview.jsx'),css=read('src/adminUnifiedWorkspace.css').split('/* Video stage 7')[1];
 assert.equal((app.match(/className="admin-flash-scope-caption"/g)||[]).length,2);
 for(const s of ['onSelectionChange(null)','onSelectionChange([])','checked={!selected}','checked={selected}','fieldset disabled={disabled}'])assert.ok(app.includes(s),s);
 for(const s of ['background: #f8fafc !important; color: #243448','background: #e4eefc !important; color: #254b8a','background: #dff3eb !important; color: #14594a','-webkit-text-fill-color: currentColor !important','fieldset:disabled'])assert.ok(css.includes(s),s);
 const dashboard=read('src/components/AdminDashboardPro.jsx');
 assert.ok(dashboard.includes('onSubmit={handleApplyFlashSale}'));
 assert.ok(dashboard.includes('onSubmit={handleCreateCoupon}'));
 assert.ok(dashboard.includes('onSubmit={handleAddBanner}'));
 assert.ok(!dashboard.includes('admin-flash-sale-expiry-note text-[11px] leading-relaxed text-emerald-100/70'));
});
