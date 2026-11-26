import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('CRM and support retain restricted actions, server readiness and actual delivery semantics',()=>{
 const app=read('src/components/AdminDashboardPro.jsx');
 for(const term of ['canEditCrmCustomer(u) && !crmSaving','handleToggleVipUser(u.id || u.email)','handleToggleBlockUser(u.id || u.email)','handleSaveUserCrm(u.id || u.email)','!u.isServerCustomer && u.isLocalCrmRecord','!supportTicketsReady || !!supportTicketsError','handleSendTicketReply(t.id)','fetchSupportTicketThread(t.id)','data-admin-pro-delivery-disabled','onSubmit={handleSendBroadcast}','ელფოსტით არ იგზავნება','data-admin-crm-action="restrict"','admin-unified-support-thread-list'])assert.ok(app.includes(term),term);
});
test('customer and support interfaces retain responsive action and text layout without clipping',()=>{
 const css=read('src/adminUnifiedWorkspace.css').split('/* Stage 11 — CRM, support and correspondence.')[1];
 for(const term of ['admin-unified-crm-contact','admin-support-status-actions','@container (min-width: 520px)','@container (min-width: 850px)','min-height: 44px'])assert.ok(css.includes(term),term);
 assert.doesNotMatch(css,/overflow:\s*(hidden|clip)/);
});
