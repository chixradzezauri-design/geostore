import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('order reactivation retains password, MFA and existing submit and cancellation safeguards',()=>{
 const app=read('src/components/AdminDashboardPro.jsx');
 const area=app.slice(app.indexOf('className="admin-order-reactivation-overlay'));
 for(const term of ['onSubmit={handleConfirmOrderReactivation}','aria-busy={isReactivatingOrder}','autoComplete="current-password"','autoComplete="one-time-code"','ADMIN_MFA_ROLLOUT_ENABLED','reactivationCode.length!==6','!reactivationPassword','setReactivationPassword(\'\')','role="alert"','aria-describedby="admin-reactivation-explanation"'])assert.ok(area.includes(term),term);
 assert.ok(app.includes('ref={orderDetailCloseButtonRef}'));
});
test('dialog and form presentation stays scoped and does not clip content',()=>{
 const css=read('src/adminUnifiedWorkspace.css').split('/* Stage 14 — operational forms, dialogs and feedback;')[1];
 for(const term of ['admin-unified-dialog-actions','admin-vd-modalBackground-active','min-height: 44px','focus-visible','max-width: 359px','data-admin-unified-feedback="error"'])assert.ok(css.includes(term),term);
 assert.doesNotMatch(css,/overflow:\s*(hidden|clip)/);
});
