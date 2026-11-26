import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('PRO CRM and support retain real record origins and protected actions',()=>{
 const app=read('src/components/AdminDashboardPro.jsx');
 for(const term of ['data-admin-pro-crm-badge="vip"','data-admin-pro-crm-badge="restricted"','data-admin-pro-crm-badge="discount"','u.isServerCustomer ? "server" : u.isLocalCrmRecord ? "local" : "order"','canEditCrmCustomer(u) && !crmSaving','handleToggleVipUser(u.id || u.email)','handleToggleBlockUser(u.id || u.email)','handleSaveUserCrm(u.id || u.email)','!u.isServerCustomer && u.isLocalCrmRecord','data-admin-pro-ticket-status','supportTicketsReady && !supportTicketsError ?','data-admin-pro-thread-role','handleSendTicketReply(t.id)','fetchSupportTicketThread(ticketId)','fetchLegacyMessages({ loadMore: true })','Auth ანგარიშს არ ბლოკავს'])assert.ok(app.includes(term),term);
 const css=read('src/adminVideoRedesign.css').split('/* Admin PRO 10')[1];
 const lum=h=>{const a=h.match(/../g).map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return a[0]*.2126+a[1]*.7152+a[2]*.0722};
 const pairs=[...css.matchAll(/--admin-contact-bg:#([0-9a-f]{6});--admin-contact-fg:#([0-9a-f]{6})/g)];
 assert.equal(pairs.length,5);
 for(const [,bg,fg] of pairs){const a=[lum(bg),lum(fg)].sort((x,y)=>y-x);assert.ok((a[0]+.05)/(a[1]+.05)>=4.5)}
});
