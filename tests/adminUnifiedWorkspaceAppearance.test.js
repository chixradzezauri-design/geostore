import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveAdminWorkspaceAppearance,ADMIN_PRO_PALETTE} from '../src/utils/adminProfessionalDesign.js';
import {normalizeAdminPanelVisualDesign} from '../src/utils/adminPanelVisualDesign.js';

test('untouched legacy workspace displays the professional palette without mutating saved state',()=>{
 const raw=normalizeAdminPanelVisualDesign({content:{ordersTitle:'ჩემი შეკვეთები'},components:{orders:{padding:33}}});
 const snapshot=structuredClone(raw);
 const next=resolveAdminWorkspaceAppearance(raw);
 assert.equal(next.theme.canvas,ADMIN_PRO_PALETTE.canvas);
 assert.equal(next.layout.cardRadius,12);
 assert.equal(next.components.orders.padding,33);
 assert.equal(next.content.ordersTitle,'ჩემი შეკვეთები');
 assert.deepEqual(raw,snapshot);
 assert.deepEqual(resolveAdminWorkspaceAppearance(next),next);
});
test('custom desktop and responsive appearance are preserved',()=>{
 for(const input of [{theme:{accent:'#123456'}},{layout:{cardPadding:33}},{responsive:{mobile:{layout:{titleFontSize:17}}}}]){
  const raw=normalizeAdminPanelVisualDesign(input);
  assert.deepEqual(resolveAdminWorkspaceAppearance(raw),raw);
 }
});
test('the owner editor and shell use the same projected appearance, not automatic save',()=>{
 const app=readFileSync(new URL('../src/components/AdminDashboardPro.jsx',import.meta.url),'utf8');
 assert.ok(app.includes('buildAdminPanelVisualStyle(effectiveAdminVisualDesign)'));
 assert.ok(app.includes('design={effectiveAdminVisualDesign}'));
 assert.ok(app.includes('saveAdminPanelVisualDesignToCloud(adminVisualDesign, adminVisualUpdatedAtRef.current)'));
 assert.ok(!app.includes('saveAdminPanelVisualDesignToCloud(effectiveAdminVisualDesign'));
});
