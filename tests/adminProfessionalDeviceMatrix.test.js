import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Admin PRO device matrix covers all planned widths and both engines without removing legacy interactions',()=>{
 const smoke=read('tests/browser/adminWorkspaceSmoke.mjs'), runner=read('tests/browser/realStorefrontSmoke.mjs');
 assert.ok(smoke.includes('Object.freeze([320, 360, 390, 430, 768, 1024, 1440])'));
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
