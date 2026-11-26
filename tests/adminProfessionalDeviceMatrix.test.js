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
