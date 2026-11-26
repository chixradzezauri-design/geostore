import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('unified workspace stylesheet is independent of native control regression boundary',()=>{
 const app=read('src/components/AdminDashboardPro.jsx');
 assert.ok(app.indexOf("import '../adminUnifiedWorkspace.css'")>app.indexOf("import '../adminVideoRedesign.css'"));
 assert.ok(!read('src/adminVideoRedesign.css').includes('/* Unified workspace foundation:'));
 const css=read('src/adminUnifiedWorkspace.css');
 assert.ok(css.includes('/* Unified workspace foundation:'));
 assert.ok(css.includes('grid-row: 2; grid-column: 1 / -1;'));
 assert.ok(css.includes('@container (min-width: 320px)'));
 assert.ok(css.includes('@container (min-width: 800px)'));
 assert.ok(!css.includes('overflow: hidden'));
});
test('workspace chrome retains real navigation, owner checks, publish and logout actions',()=>{
 const app=read('src/components/AdminDashboardPro.jsx');
 for(const token of ['onClick={() => setAdminTab(tab.id)}','onChange={(event) => setAdminTab(event.target.value)}','hasModulePermission(\'settings\')','onSaveStorefrontDraft()','onPublishStorefront()','handleLogout()','aria-label="სისტემიდან გასვლა"','aria-current={isActive ? "page" : undefined}'])assert.ok(app.includes(token),token);
});
