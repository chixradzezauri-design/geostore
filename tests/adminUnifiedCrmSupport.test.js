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


test('CRM and support share readable status typography without duplicate heading rules',()=>{
 const css=read('src/adminUnifiedWorkspace.css'),video=read('src/adminVideoRedesign.css'),smoke=read('tests/browser/adminWorkspaceSmoke.mjs');
 assert.match(css,/\.admin-unified-crm-identity h4 \{font-size: clamp\(14px,var\(--admin-vd-bodyFontSize-active,15px\),18px\)/);
 assert.doesNotMatch(video,/\.admin-crm-user-card h4 \{font-size:15px!important/);
 assert.match(video,/:is\(\[data-admin-pro-crm-badge\],\[data-admin-pro-ticket-status\]\) \{[^}]*font-size:12px!important/);
 assert.ok(smoke.includes('account status captions remain readable'));
 assert.ok(smoke.includes('support status or thread caption too small'));
});
