import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Admin PRO baseline is collected for all existing authorized fixture modules before interaction',()=>{
 const smoke=read('tests/browser/adminWorkspaceSmoke.mjs');
 const helper=read('tests/browser/adminVisualBaseline.mjs');
 assert.ok(smoke.includes('visualBaseline.push(await collectAdminVisualBaseline(shell,tab))'));
 assert.ok(smoke.includes('visualBaseline.length,Object.keys(modules).length'));
 assert.ok(smoke.includes('assert.deepEqual(writes, []'));
 assert.ok(smoke.indexOf('visualBaseline.push')<smoke.indexOf("if(tab==='settings')"));
 for(const property of ['documentOverflow','headingSizes','labelSizes','shortControls','buttonColors','imageLoadFailures'])assert.ok(helper.includes(property));
 for(const forbidden of ['.textContent','.innerText','.innerHTML','.value','localStorage','fetch('])assert.ok(!helper.includes(forbidden),forbidden);
});
test('Admin PRO audit branch disables preview and retains original admin CSS cascade slots',()=>{
 const main=read('src/main.jsx'),dashboard=read('src/components/AdminDashboardPro.jsx');
 const imports=['adminCssSlotStart.css','adminDashboard.css','adminDashboardSections.css','adminDashboardModals.css','adminDashboardPolish.css','adminCssSlotEnd.css','designSystemV2.css','videoAuditMobileAdmin.css'];
 for(let i=1;i<imports.length;i++)assert.ok(main.indexOf(imports[i-1])<main.indexOf(imports[i]),imports[i]);
 assert.ok(dashboard.indexOf("import '../adminPanelVisualDesign.css'")<dashboard.indexOf("import '../adminVideoRedesign.css'"));
 assert.ok(dashboard.includes('style={isOwner ? adminVisualStyle : undefined}'));
 assert.equal(JSON.parse(read('vercel.json')).git.deploymentEnabled['internal-admin-professional-ui-2026-11-26'],false);
});
