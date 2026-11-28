import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('staff presentation keeps owner-only mutations, server verification and isolated default appearance',()=>{
 const app=read('src/components/AdminDashboardPro.jsx');
 const area=app.slice(app.indexOf('function AdminStaffManagement('),app.indexOf('export default function AdminDashboardPro('));
 assert.equal((area.match(/if \(!isOwner \|\| !staffListReady \|\| staffMutationRef.current\) return;/g)||[]).length,4);
 for(const term of ['if (!isOwner) return null','callStaffAdminApi({ action: \'revoke\', id: staff.id })','createStaffPermissions(staff.permissions)','staffListReady ? value :','data-admin-staff-auth','revokeStaff(staff)','reactivateStaff(staff)','saveStaff(staff)'])assert.ok(area.includes(term),term);
 for(const term of ['buildAdminPanelVisualStyle(resolveAdminStudioAppearance(DEFAULT_ADMIN_PANEL_VISUAL_DESIGN))','style={isOwner ? adminVisualStyle : staffWorkspaceVisualStyle}','if (!adminLoggedIn || !isOwner)','saveAdminPanelVisualDesignToCloud(adminVisualDesign, adminVisualUpdatedAtRef.current)','canAccessAdminTab(tab.id)'])assert.ok(app.includes(term),term);
 assert.ok(!app.includes('saveAdminPanelVisualDesignToCloud(staffWorkspaceVisualStyle'));
});
test('staff security visual states and adaptive controls are scoped to admin',()=>{
 const css=read('src/adminUnifiedWorkspace.css').split('/* Stage 10 — staff and security.')[1];
 for(const term of ['data-admin-staff-auth="confirmed"','data-admin-staff-auth="pending"','data-admin-staff-auth="missing"','@container (min-width: 460px)','@container (min-width: 700px)','min-height: 44px'])assert.ok(css.includes(term),term);
 assert.doesNotMatch(css,/overflow:\s*(hidden|clip)/);
});


test('Studio staff and security stay scoped and preserve visible permission and access semantics',()=>{
 const css=read('src/adminStudioWorkspace.css').split('/* Studio — staff and security.')[1].split('/* Studio — ')[0];
 const prefix='.admin-dashboard-pro.admin-dashboard-shell[data-admin-video-layout="v1"][data-admin-appearance="studio"] ';
 const selectors=css.split('\n').map(line=>line.trim()).filter(line=>line.startsWith('.'));
 assert.ok(selectors.length>20);
 for(const line of selectors)assert.ok(line.startsWith(prefix),line);
 for(const term of ['.admin-staff-permission-grid > label:has(input:checked)','.admin-staff-permission-grid > label:focus-within','[data-admin-pro-staff-card]','.admin-unified-staff-permission-summary > span','.admin-security-notice'])assert.ok(css.includes(term),term);
 assert.doesNotMatch(css,/display:\s*none|visibility:\s*hidden|pointer-events\s*:\s*none|overflow\s*:\s*(?:hidden|clip)/);
 assert.doesNotMatch(css,/\[data-admin-staff-auth=|\[data-admin-pro-staff-state=|\[data-admin-pro-permission=|\[data-admin-staff-action="(?:revoke|reactivate)"\]/);
});
