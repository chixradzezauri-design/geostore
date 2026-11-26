import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('responsive workspace keeps native navigation and existing permission-filtered handlers',()=>{
 const css=read('src/adminUnifiedWorkspace.css').split('/* Stage 15 — responsive reflow,')[1];
 for(const term of ['min-width: 768px','max-width: 1023px','max-width: 849px','max-width: 359px','repeat(3,minmax(0,1fr))','repeat(2,minmax(0,1fr))','min-height: 44px','admin-mobile-section-picker select'])assert.ok(css.includes(term),term);
 assert.doesNotMatch(css,/overflow:\s*(hidden|clip)/);
 const app=read('src/components/AdminDashboardPro.jsx');
 for(const term of ['canAccessAdminTab(tab.id)','onClick={() => setAdminTab(tab.id)}','onChange={(event) => setAdminTab(event.target.value)}','id="geostore-admin-mobile-section"'])assert.ok(app.includes(term),term);
});
test('device audit checks visible new controls and harmless editor navigation with no writes',()=>{
 const smoke=read('tests/browser/adminWorkspaceSmoke.mjs');
 for(const term of ['newControlIssues.length','rect.height < 43.5','bounds.right + 2','newControlIssues,offenders','Shortcut opens existing palette','Opening editor sections never writes settings','Object.freeze([320, 360, 390, 430, 768, 1024, 1440])'])assert.ok(smoke.includes(term),term);
});

test('measured header touch targets override the legacy compact selector without changing publication logic',()=>{
 const css=read('src/adminUnifiedWorkspace.css').split('/* Stage 16 — measured WebKit regression:')[1];
 assert.ok(css.includes('.admin-dashboard-pro.admin-dashboard-shell[data-admin-video-layout="v1"] > .admin-workspace-main > [data-admin-visual-header="true"] > .admin-pro-header-actions > button'));
 for(const term of ['min-height: 44px !important','min-block-size: 44px !important','height: auto !important','max-height: none !important'])assert.ok(css.includes(term),term);
 const smoke=read('tests/browser/adminWorkspaceSmoke.mjs');
 assert.ok(smoke.includes('rect.height < 43.5'));
 assert.ok(smoke.includes('newControlIssues.length'));
 const app=read('src/components/AdminDashboardPro.jsx');
 assert.ok(app.includes("typeof onSaveStorefrontDraft === 'function'"));
 assert.ok(app.includes("typeof onPublishStorefront === 'function'"));
});
