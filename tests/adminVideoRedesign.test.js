import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const jsx=read('src/components/AdminDashboardPro.jsx'),css=read('src/adminVideoRedesign.css');
test('video redesign is opt-in to actual admin shell and loaded after visual editor CSS',()=>{
 assert.match(jsx,/data-admin-video-layout="v1"/);
 assert.ok(jsx.indexOf("import '../adminVideoRedesign.css'")>jsx.indexOf("import '../adminPanelVisualDesign.css'"));
 assert.ok(css.includes('[data-admin-video-layout="v1"]'));
 assert.match(css,/var\(--admin-vd-text-active/);
});
test('product actions retain handlers and full labels, category actions retain movement and names',()=>{
 for(const term of ['admin-video-publish','admin-video-edit','admin-video-delete','handleToggleProductPublished(p.id)','handleEditProduct(p)','handleDeleteProduct(p.id)','moveCategory(parentCat.id, -1)','moveCategory(sub.id, 1)','admin-video-category-actions','admin-video-category-identity'])assert.ok(jsx.includes(term),term);
 assert.match(css,/grid-template-columns: repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/word-break: normal !important/);
 assert.match(css,/min-height: 44px !important/);
});
test('support statuses remain semantic and contrast scoped, preview disabled only on accumulation branch',()=>{
 assert.ok(jsx.includes("aria-pressed={t.status === 'ღია'}"));
 assert.ok(css.includes('button[aria-pressed="true"]'));
 assert.ok(css.includes('admin-support-ticket-reply'));
 const cfg=JSON.parse(read('vercel.json'));
 assert.deepEqual(cfg.git.deploymentEnabled,{'internal-admin-video-redesign-2026-11-24':false});
 assert.notEqual(cfg.git.deploymentEnabled.main,false);
});

test('batch 02 chrome uses editor tokens and retains owner/staff navigation and publishing actions',()=>{
 for(const term of ['data-admin-visual-header="true"','data-admin-visual-nav-item="true"','setAdminTab(tab.id)','onSaveStorefrontDraft()','onPublishStorefront()','visibleAdminNavigationItems','hasModulePermission']) assert.ok(jsx.includes(term),term);
 for(const term of ['--admin-vd-headerBackground-active','--admin-vd-navActiveBackground-active','--admin-vd-navInactiveText-active','--admin-vd-primaryButtonText-active','--admin-vd-inputFocus-active','clamp(10px, var(--admin-vd-headerPadding-active','button:only-of-type',':focus-visible']) assert.ok(css.includes(term),term);
 assert.ok(css.includes('Video redesign 02'));
});
