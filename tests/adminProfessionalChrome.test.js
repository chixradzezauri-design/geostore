import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('PRO navigation uses authorized groups and existing actions',()=>{
 const app=read('src/components/AdminDashboardPro.jsx');
 for(const s of ['currentAdminNavigationGroup = adminNavigationGroups.find','canAccessAdminTab(tab.id)','aria-current={isActive ? "page" : undefined}','onClick={() => setAdminTab(tab.id)}','onSaveStorefrontDraft()','onPublishStorefront()','handleLogout()','admin-pro-access-dot'])assert.ok(app.includes(s),s);
 assert.ok(app.includes('GEOSTORE Admin PRO'));
});
test('PRO sidebar uses paired navigation theme tokens and header remains independently themed',()=>{
 const css=read('src/adminVideoRedesign.css');
 assert.match(css,/> \[data-admin-sidebar="true"\] \{\s*background: var\(--av-nav-bg\) !important;/);
 assert.match(css,/> div\.flex-1 > \[data-admin-visual-header="true"\] \{\s*background: var\(--av-header\) !important;/);
 assert.ok(css.includes('.admin-pro-brand :is(h3,p)'));
 assert.ok(css.includes('color:var(--av-nav-text)!important'));
 const smoke=read('tests/browser/adminWorkspaceSmoke.mjs');
 assert.ok(smoke.includes('Exactly one active authorized navigation item'));
});
