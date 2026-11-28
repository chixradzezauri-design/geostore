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


test('video CRM and correspondence cards no longer retain conflicting dark utility surfaces',()=>{
 const app=read('src/components/AdminDashboardPro.jsx'),css=read('src/adminUnifiedWorkspace.css');
 for(const cls of ['admin-crm-user-card','admin-support-panel','admin-support-ticket','admin-support-ticket-message','admin-support-ticket-reply','admin-legacy-message-card','admin-broadcasts-panel','admin-staff-list-panel']){
  const classes=[...app.matchAll(/className="([^"]+)"/g)].map(m=>m[1]).filter(s=>s.split(/\s+/).includes(cls));
  assert.ok(classes.length,cls);
  assert.ok(classes.every(s=>!/(?:bg-slate-9|bg-emerald-950|shadow-)/.test(s)),cls);
 }
 assert.ok(css.includes('.admin-crm-user-card:has([data-admin-pro-crm-badge="restricted"])'));
 assert.ok(css.includes('/* Video redesign stage 6:'));
 assert.ok(css.includes('data-admin-pro-delivery-disabled'));
 const smoke=read('tests/browser/adminWorkspaceSmoke.mjs');
 assert.ok(smoke.includes('compact:bounds.height<=220'));
 assert.ok(smoke.includes('JSON.stringify(geometry)'));
});


test('Studio CRM and support rules are scoped, preserve semantic status controls and retain usable actions',()=>{
 const css=read('src/adminStudioWorkspace.css').split('/* Studio — CRM and support workspaces.')[1].split('/* Studio — ')[0];
 assert.ok(css);
 const selectorLines=css.split('\n').map(line=>line.trim()).filter(line=>line.startsWith('.'));
 assert.ok(selectorLines.length>20);
 for(const line of selectorLines)assert.ok(line.startsWith('.admin-dashboard-pro.admin-dashboard-shell[data-admin-video-layout="v1"][data-admin-appearance="studio"] '),line);
 for(const selector of ['.admin-crm-user-card','.admin-crm-contact-line > b','.admin-crm-edit-panel [data-admin-crm-action="save"]','.admin-support-ticket-header','[data-admin-pro-thread-role="customer"]','[data-admin-pro-thread-role="admin"]','.admin-support-reply-form > textarea:focus-visible','.admin-support-reply-form > button'])assert.ok(css.includes(selector),selector);
 assert.doesNotMatch(css,/display:\s*none|visibility:\s*hidden|pointer-events\s*:\s*none|overflow\s*:\s*(?:hidden|clip)/);
 assert.doesNotMatch(css,/\[data-admin-pro-(?:crm-badge|ticket-status)(?:[=\]])/);
});
