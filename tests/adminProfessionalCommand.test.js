import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('PRO command center preserves four KPI identities and requires verified support data',()=>{
 const app=read('src/components/AdminDashboardPro.jsx');
 const s=app.slice(app.indexOf('<section className="admin-command-center'),app.indexOf("{(visibleAdminTab === 'inventory'",app.indexOf('<section className="admin-command-center')));
 assert.deepEqual([...s.matchAll(/data-admin-kpi-tone="([^"]+)"/g)].map(m=>m[1]),['primary','warning','danger','info']);
 assert.ok(app.includes('const commandCenterSupportVerified = hasSupportPermission && supportTicketsReady && !supportTicketsError'));
 assert.ok(s.includes('commandCenterSupportVerified ? commandCenterOverdueTickets.length : "—"'));
 assert.ok(s.includes('!commandCenterSupportVerified ? ('));
 assert.ok(s.includes('ordersVerifiedForReports ? commandCenterNewOrders.length'));
 assert.ok(s.includes('commandCenterLowStockPositions.length'));
 assert.ok(s.includes('flashSaleAdminSummary.expiringCount'));
 for(const tab of ['orders','support','replenishment','discounts','analytics'])assert.ok(s.includes("setAdminTab('"+tab+"')"));
});
test('PRO command status foreground and background pairs are legible',()=>{
 const css=read('src/adminVideoRedesign.css').split('/* Admin PRO 04:')[1];
 const lum=h=>{const a=h.match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722};
 const pairs=[...css.matchAll(/--admin-command-tone-bg:#([0-9a-f]{6});--admin-command-tone-fg:#([0-9a-f]{6});/g)];
 assert.equal(pairs.length,5);
 for(const [,bg,fg] of pairs){const a=[lum(bg),lum(fg)].sort((x,y)=>y-x);assert.ok((a[0]+.05)/(a[1]+.05)>=4.5)}
 assert.ok(css.includes('@container (min-width:850px)'));
 assert.ok(css.includes('@container (max-width:300px)'));
 assert.ok(css.includes('--admin-vd-cardTitleText-active'));
});
