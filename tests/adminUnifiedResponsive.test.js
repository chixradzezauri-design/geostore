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
