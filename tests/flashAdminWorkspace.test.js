import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const admin=readFileSync(new URL('../src/components/AdminDashboardPro.jsx',import.meta.url),'utf8');
const editor=readFileSync(new URL('../src/components/StorefrontVisualEditor.jsx',import.meta.url),'utf8');
const store=readFileSync(new URL('../src/components/StoreView.jsx',import.meta.url),'utf8');
test('discount workspace exposes focused campaign editor beside existing pricing and schedule',()=>{
 assert.ok(admin.includes('data-gs-flash-workspace="true"'));
 assert.ok(admin.includes('სახელი და დიზაინი'));
 assert.ok(admin.includes('<StorefrontVisualEditor campaignOnly'));
 assert.ok(admin.includes('onSaveStorefrontDraft={onSaveStorefrontDraft}'));
 assert.ok(admin.includes('onPublishStorefront={onPublishStorefront}'));
 assert.ok(admin.includes('<AdminFlashSchedule'));
});
test('focused mode reuses campaign controls and does not offer global reset or unrelated section editing',()=>{
 assert.ok(editor.includes('campaignOnly ? key===\'campaigns\''));
 assert.ok(editor.includes('{campaignOnly&&campaignControls}'));
 assert.ok(editor.includes('{!campaignOnly&&campaignControls}'));
 assert.ok(editor.includes('{!campaignOnly&&<button type="button" onClick={resetDesign}'));
 assert.ok(editor.includes('campaignPreviewOnly={campaignOnly}'));
 assert.ok(store.includes("campaignPreviewOnly ? sectionGroups.flashSale : sectionOrder.map"));
});
