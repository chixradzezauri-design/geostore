import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('editor shortcuts only open existing groups and preserve save/publication contracts',()=>{
 const admin=read('src/components/AdminPanelVisualEditor.jsx'),store=read('src/components/StorefrontVisualEditor.jsx');
 for(const key of ['palette','typography','layout','content','modules','elements'])assert.ok(admin.includes('data-admin-studio-group="'+key+'"'));
 for(const term of ['group.open = true','isPanelGroupVisible(key)','commitChange(applyAdminProfessionalDesign(normalized))','if (viewport !== \'desktop\') return;','onClick={onRetrySave}','onReloadRemote?.()','elementEditorDetailsRef.current.open = true'])assert.ok(admin.includes(term),term);
 assert.equal((store.match(/onClick=\{saveDraft\}/g)||[]).length,2);
 assert.equal((store.match(/onClick=\{publish\}/g)||[]).length,2);
 assert.ok(store.indexOf('data-admin-unified-editor-actions="desktop"')<store.indexOf('data-admin-unified-editor-target="controls"'));
 for(const term of ['!isOwner || storefrontDraftBusy','onClick={restoreSelectedStorefrontVersion}','onClick={clearViewportOverrides}','data-admin-unified-editor-target="preview"','addToCart={NOOP}'])assert.ok(store.includes(term),term);
});
test('editor chrome uses explicit scoped selectors without touching live storefront or character preview styles',()=>{
 const css=read('src/adminUnifiedWorkspace.css').split('/* Stage 13 — editor navigation and chrome only;')[1];
 for(const term of ['admin-unified-editor-jumps','@container (min-width: 850px)','min-height: 44px','prefers-reduced-motion'])assert.ok(css.includes(term),term);
 assert.doesNotMatch(css,/\.gs-visual-preview-frame|\.gs-character-preview(?:\s|[.:>])|overflow:\s*(hidden|clip)/);
});
