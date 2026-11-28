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
test('Studio shell is independent of owner saved editor; only explicit editing changes saved appearance',()=>{
 const app=readFileSync(new URL('../src/components/AdminDashboardPro.jsx',import.meta.url),'utf8');
 assert.ok(app.includes('buildAdminPanelVisualStyle(effectiveAdminVisualDesign)'));
 assert.ok(app.includes('design={savedAdminAppearance}'));
 assert.ok(app.includes("adminAppearanceMode === 'saved' ? savedAdminAppearance : resolveAdminStudioAppearance(adminVisualDesign)"));
 assert.ok(app.includes("setAdminAppearanceMode('saved');"));
 assert.ok(app.includes('onChange={handleAdminVisualDesignChange}'));
 assert.ok(app.includes('saveAdminPanelVisualDesignToCloud(adminVisualDesign, adminVisualUpdatedAtRef.current)'));
 assert.ok(!app.includes('saveAdminPanelVisualDesignToCloud(effectiveAdminVisualDesign'));
});


test('Atelier presentation projection preserves persisted desktop palettes, tablet overrides and custom text',()=>{
 const inputs=[
  {theme:{accent:'#126b59',navInactiveBackground:'#182230'},layout:{sidebarWidth:248},content:{ordersTitle:'შენახული სათაური'}},
  {responsive:{tablet:{theme:{accent:'#123456'},layout:{cardPadding:22}}}},
  {responsive:{mobile:{theme:{accent:'#654321'},layout:{titleFontSize:17}}}}
 ];
 for(const input of inputs){
  const raw=normalizeAdminPanelVisualDesign(input);
  const snapshot=structuredClone(raw);
  assert.deepEqual(resolveAdminWorkspaceAppearance(raw),snapshot);
  assert.deepEqual(raw,snapshot,'Projection must not mutate persisted values');
 }
});
