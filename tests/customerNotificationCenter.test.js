import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filterCustomerNotifications,summarizeSupportReplies} from '../src/utils/customerNotificationCenter.js';
test('notification status and order-code search preserve source data',()=>{
 const rows=[{id:'1',orderId:'GS-11',read:false},{id:'2',orderId:'GS-12',read:true},{id:'3',orderId:'OTHER',read:false}];
 assert.deepEqual(filterCustomerNotifications(rows,'unread','#gs-').map(x=>x.id),['1']);
 assert.deepEqual(filterCustomerNotifications(rows,'read').map(x=>x.id),['2']);
 assert.equal(filterCustomerNotifications(rows,'all').length,3);
 assert.equal(rows[0].read,false);
 assert.deepEqual(filterCustomerNotifications(null),[]);
});
test('support counts distinct tickets with unread replies, not message totals',()=>{
 assert.equal(summarizeSupportReplies([{ticket_id:'a',unread_count:4},{ticket_id:'a',unread_count:1},{ticket_id:'b',unread_count:0},{ticket_id:'c',unread_count:'2'},{ticket_id:'d',unread_count:'bad'}]),2);
 assert.equal(summarizeSupportReplies(null),0);
});
test('notification center uses owner-scoped support history and existing read RPC',()=>{
 const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
 const mod=readFileSync(new URL('../src/components/Modals.jsx',import.meta.url),'utf8');
 assert.ok(app.includes('supportHistoryOpen = supportOpen || isNotificationsOpen'));
 assert.ok(app.includes('supportHistoryOwnerRef.current === String(currentUser.id) ? mySupportTickets : []'));
 assert.ok(app.includes('mark_my_order_notifications_read'));
 assert.ok(mod.includes('visibleNotifications.map'));
 assert.ok(mod.includes('supportNotificationsHasMore'));
});
