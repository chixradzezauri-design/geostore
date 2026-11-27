import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('settings jumps remain non-mutating and target existing sections',()=>{
 const app=read('src/components/AdminDashboardPro.jsx'),character=read('src/components/AdminCharacterStudio.jsx');
 for(const key of ['security','delivery','global'])assert.ok(app.includes('data-admin-settings-target="'+key+'"'));
 assert.ok(character.includes('data-admin-settings-target="characters"'));
 assert.ok(app.includes('target?.scrollIntoView({block:'));
 assert.ok(app.includes('target?.focus({preventScroll:true})'));
 assert.ok(app.includes('onClick={handleSaveDeliveryFees}'));
 assert.ok(app.includes('onSubmit={handleSaveSettings}'));
});
test('editor and character chrome retain live controls and remove legacy dark surfaces',()=>{
 const editor=read('src/components/AdminPanelVisualEditor.jsx'),store=read('src/components/StorefrontVisualEditor.jsx'),character=read('src/components/AdminCharacterStudio.jsx');
 const css=read('src/adminUnifiedWorkspace.css').split('/* Video stage 8')[1];
 assert.equal((editor.match(/className="admin-studio-group min-w-0 border p-3"/g)||[]).length,6);
 assert.ok(editor.includes('hidden={!isPanelGroupVisible('));
 assert.ok(store.includes('onClick={saveDraft}'));
 assert.ok(store.includes('onClick={publish}'));
 assert.ok(character.includes('onClick={onTestPublishedCharacter}'));
 assert.ok(css.includes('admin-character-device-warning'));
 assert.ok(css.includes('admin-character-preset-notice'));
 assert.ok(!css.includes('.gs-character-preview {'));
});
