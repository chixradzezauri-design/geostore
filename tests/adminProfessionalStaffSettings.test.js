import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('PRO staff and settings markers preserve existing permission and save actions',()=>{
 const app=read('src/components/AdminDashboardPro.jsx');
 for(const term of ['data-admin-pro-staff-card','data-admin-pro-staff-state={staff.is_active','data-admin-pro-permission={staff.permissions?.[permission.key]','data-admin-pro-log-action','data-admin-pro-log-time','data-admin-pro-security-warning','data-admin-pro-settings-draft','onSubmit={handleInviteStaff}','onSubmit={handleAddExistingUser}','revokeStaff(staff)','reactivateStaff(staff)','saveStaff(staff)','disabled={staffActionBusy || !staffListReady}','onClick={handleSaveDeliveryFees}','onSubmit={handleSaveSettings}','handleRestoreStorefrontVersion(version)','fetchActivityLogs()'])assert.ok(app.includes(term),term);
 const css=read('src/adminVideoRedesign.css').split('/* Admin PRO 12')[1];
 assert.ok(css);
 for(const term of ['data-admin-video-layout="v1"','min-height:44px','overflow-wrap:anywhere',':focus-visible','font-variant-numeric:tabular-nums','@media(max-width:767px)'])assert.ok(css.includes(term),term);
 const lum=h=>{const a=h.match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722};
 const pairs=[...css.matchAll(/--staff-bg:#([0-9a-f]{6});--staff-fg:#([0-9a-f]{6})/g)];
 assert.equal(pairs.length,4);
 for(const [,bg,fg] of pairs){const a=[lum(bg),lum(fg)].sort((x,y)=>y-x);assert.ok((a[0]+.05)/(a[1]+.05)>=4.5)}
});
