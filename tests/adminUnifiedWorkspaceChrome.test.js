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


test('Atelier navigation uses bounded icon and label tracks with visible active and grouped states',()=>{
 const css=read('src/adminUnifiedWorkspace.css');
 const stage=css.split('/* Atelier navigation:')[1].split('@media')[0];
 for(const token of ['grid-template-columns: minmax(0,1fr) auto','grid-template-columns: 18px minmax(0,1fr)','min-inline-size: 0','inset 3px 0 currentColor','white-space: normal']) assert.ok(stage.includes(token),token);
 assert.doesNotMatch(stage,/position:\s*absolute|overflow:\s*hidden/);
 const video=read('src/adminVideoRedesign.css');
 assert.match(video,/@media\(min-width:768px\) and \(max-width:1023px\) \{[^}]*admin-workspace-nav-group \{ display:block!important;/);
 const smoke=read('tests/browser/adminWorkspaceSmoke.mjs');
 assert.ok(smoke.includes('menu tracks do not collide'));
});
