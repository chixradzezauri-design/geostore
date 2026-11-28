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
 // These exact negations exclude preview descendants; they do not style them.
 const withoutExclusions=css.replaceAll(':not(:where(.gs-visual-preview-frame *, .gs-character-preview *, .geostore-fashion-store *))','').replaceAll(':not(:where(.gs-character-preview *))','');
 assert.doesNotMatch(withoutExclusions,/\.gs-visual-preview-frame|\.gs-character-preview(?:\s|[.:>])|overflow:\s*(hidden|clip)/);
});

test('workspace-wide controls exclude storefront and character previews',()=>{
 const css=read('src/adminUnifiedWorkspace.css');
 const exclusion=':not(:where(.gs-visual-preview-frame *, .gs-character-preview *, .geostore-fashion-store *))';
 const broadRules=css.split('\n').filter(line=>line.includes('.admin-workspace-main :is('));
 assert.ok(broadRules.length>=6);
 for(const rule of broadRules)assert.ok(rule.includes(exclusion),rule);
 assert.ok(css.includes('font-size: max(16px,var(--admin-vd-inputFontSize-active,16px))'));
});


test('editor controls have readable text and full size color pickers without touching preview content',()=>{
 const css=read('src/adminUnifiedWorkspace.css'),smoke=read('tests/browser/adminWorkspaceSmoke.mjs');
 const rules=css.split('/* Editor control surfaces only:')[1].split('.gs-storefront-visual-editor > .admin-unified-editor-header [data-admin-pro-editor-save]')[0];
 assert.ok(rules.includes('.gs-visual-editor-controls .gs-visual-color-control'));
 assert.ok(rules.includes('min-height:44px !important; min-inline-size:44px'));
 assert.ok(rules.includes('font-size:12px !important'));
 assert.ok(smoke.includes('editor color controls remain usable'));
});


test('legacy visual design generic selectors cannot recolor storefront or character preview descendants',()=>{
 const css=read('src/adminPanelVisualDesign.css');
 const root='.admin-dashboard-pro[data-admin-visual-design="enabled"] ';
 const exclusion=':not(:where(.gs-visual-preview-frame *, .gs-character-preview *, .geostore-fashion-store *))';
 for(const selector of [':is(h1, h2, h3, h4)',':is(p, label, td, th, small, input, textarea, select)','.text-white','.text-slate-300','.text-emerald-400','.bg-emerald-500','button:not([data-admin-visual-nav-item="true"])','select','textarea',':is(input, textarea)'])assert.ok(css.includes(root+selector+exclusion),selector);
});


test('Studio editor and character chrome remains isolated from artwork and preserves native controls',()=>{
 const css=read('src/adminStudioWorkspace.css').split('/* Studio — editor and character chrome.')[1].split('/* Studio — ')[0];
 const prefix='.admin-dashboard-pro.admin-dashboard-shell[data-admin-video-layout="v1"][data-admin-appearance="studio"] ';
 const selectors=css.split('\n').map(line=>line.trim()).filter(line=>line.startsWith('.'));
 assert.ok(selectors.length>20);
 for(const line of selectors)assert.ok(line.startsWith(prefix),line);
 for(const term of ['.admin-unified-editor-header','.admin-studio-group > summary','[data-admin-unified-editor-actions] > button','.gs-visual-color-control','.admin-unified-preview-toolbar','.gs-character-admin-section > summary'])assert.ok(css.includes(term),term);
 assert.doesNotMatch(css,/\.gs-visual-preview-frame|\.gs-character-preview(?:\s|[.:>])|\.geostore-fashion-store|\.gs-character-roster-art|display:\s*none|visibility:\s*hidden|pointer-events\s*:\s*none|overflow\s*:\s*(?:hidden|clip)/);
 assert.doesNotMatch(css,/\.gs-character-roster-card\[aria-pressed/);
});


test('owner appearance switch is the only new exception to real admin preview event guard',()=>{
 const editor=read('src/components/AdminPanelVisualEditor.jsx'),app=read('src/components/AdminDashboardPro.jsx');
 for(const mode of ['studio','saved'])assert.ok(app.includes('type="button" data-admin-appearance-choice="'+mode+'"'));
 assert.ok(editor.includes('.admin-studio-appearance-options > button[type="button"]:is([data-admin-appearance-choice="studio"],[data-admin-appearance-choice="saved"])'));
 assert.ok(editor.includes('isWorkspaceNavigation(target) || isAppearanceSwitch(target)'));
 assert.ok(editor.includes('isWorkspaceNavigation(event.target) || isAppearanceSwitch(event.target)'));
 const submit=editor.slice(editor.indexOf('const handlePreviewSubmit'),editor.indexOf('const handlePreviewKeydown'));
 assert.ok(submit.includes('event.preventDefault()'));
 assert.ok(!submit.includes('isAppearanceSwitch'));
});
