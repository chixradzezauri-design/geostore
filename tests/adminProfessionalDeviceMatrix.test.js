import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Admin PRO device matrix covers all planned widths and both engines without removing legacy interactions',()=>{
 const smoke=read('tests/browser/adminWorkspaceSmoke.mjs'), runner=read('tests/browser/realStorefrontSmoke.mjs');
 assert.ok(smoke.includes('Object.freeze([320, 360, 390, 430, 768, 1024, 1440, 1920])'));
 for(const term of ['widths = [390, 1440]','page.setViewportSize','matrix.length, Object.keys(modules).length * auditWidths.length','sample.documentOverflow > 2','sample.main.overflow > 2','selected !== tab','!moduleVisible','activeCount !== 1','assert.deepEqual(layoutFailures, []','assert.deepEqual(writes, []','ADMIN_DEVICE_MATRIX'])assert.ok(smoke.includes(term),term);
 assert.ok(runner.includes('await runAdminWorkspaceSmoke(browser, host);'));
 assert.ok(runner.indexOf('await runAdminWorkspaceSmoke(browser,host,{widths:[390],layoutOnly:true});')>runner.indexOf('browser = await webkit.launch'));
});

test('narrow staff and vendor forms constrain native controls without clipping workspace',()=>{
 const app=read('src/components/AdminDashboardPro.jsx');
 const css=read('src/adminVideoRedesign.css').split('/* Admin PRO — narrow forms:')[1];
 assert.ok(css);
 for(const term of ['admin-staff-existing-form grid','sm:grid-cols-[minmax(0,1fr)_auto]','admin-pro-control-caption','onSubmit={handleAddExistingUser}','onSubmit={handleInviteStaff}','onSubmit={handleAddVendor}'])assert.ok(app.includes(term),term);
 for(const term of ['max-width:639px','grid-template-columns:minmax(0,1fr)!important','-webkit-appearance:none','text-overflow:ellipsis','overflow-wrap:anywhere!important','width:100%!important'])assert.ok(css.includes(term),term);
 assert.ok(!css.includes('overflow:hidden'));assert.ok(!css.includes('overflow:clip'));
});

test('measured native field overflow uses only field-level boundaries and retains native inputs',()=>{
 const app=read('src/components/AdminDashboardPro.jsx'),purchase=read('src/components/AdminPurchaseWorkspace.jsx'),css=read('src/adminVideoRedesign.css').split('/* Measured WebKit native-control overflow:')[1];
 assert.ok(app.includes('<span className="admin-pro-native-control-boundary">'));
 assert.ok(purchase.includes('<span className="admin-pro-native-control-boundary"><select'));
 assert.ok(purchase.includes('<span className="admin-pro-native-control-boundary"><input'));
 assert.ok(css.includes('contain:inline-size;overflow: hidden'));
 assert.ok(css.includes('.admin-pro-native-control-boundary:focus-within'));
 assert.ok(!css.includes('.admin-workspace-main'));
 assert.ok(read('tests/browser/adminWorkspaceSmoke.mjs').includes('bounds.visible && bounds.fits'));
});

test('WebKit release gate runs before long storefront suite and PRs have separate concurrency groups',()=>{
 const runner=read('tests/browser/realStorefrontSmoke.mjs');
 const workflow=read('.github/workflows/responsive-browser-smoke.yml');
 const call='await runAdminWorkspaceSmoke(browser,host,{widths:[390],layoutOnly:true});';
 assert.equal(runner.split(call).length,2);
 assert.ok(runner.indexOf(call)<runner.indexOf('browser = await chromium.launch'));
 assert.ok(runner.includes('await runStage46ProductPurchaseScenarios(browser, host, [390]);'));
 assert.ok(runner.includes('await runAdminWorkspaceSmoke(browser, host);'));
 assert.ok(runner.includes('assert.ok(allCategoryReset'));
 assert.ok(runner.includes("await page.keyboard.press('Space')"));
 assert.ok(workflow.includes('github.event.pull_request.number || github.ref'));
 assert.ok(workflow.includes('cancel-in-progress: true'));
 assert.ok(workflow.includes('node tests/browser/adminMfaEnabledSmoke.mjs'));
});


test('deep visual audit retains geometry-only diagnostic counts at every device width',()=>{
 const helper=read('tests/browser/adminVisualBaseline.mjs'),smoke=read('tests/browser/adminWorkspaceSmoke.mjs');
 for(const field of ['narrowControls','textElements','horizontallyOverflowingText','smallTextElements']) {
  assert.ok(helper.includes(field),field);
  assert.ok(smoke.includes(field+':sample.'+field),field);
 }
 assert.ok(helper.includes('el.scrollWidth-el.clientWidth>2'));
 assert.ok(helper.includes('parseFloat(getComputedStyle(el).fontSize)<12'));
 assert.ok(smoke.includes('sample.documentOverflow > 2 || sample.main.overflow > 2'));
 for(const forbidden of ['.textContent','.innerText','.innerHTML','.value','localStorage','fetch('])assert.ok(!helper.includes(forbidden),forbidden);
 assert.equal(JSON.parse(read('vercel.json')).git.deploymentEnabled['internal-admin-deep-audit-2026-11-27'],false);
});
