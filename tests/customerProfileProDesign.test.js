import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/storefrontVideoRedesign.css',import.meta.url),'utf8');
test('compact profile keeps existing account components and navigation handlers',()=>{
 for(const key of ['gs-profile-pro-account','gs-profile-pro-shortcuts','id="gs-profile-pro-orders"','<CustomerAvatarStudio','<CustomerMarketingConsent','<CustomerPersonalOffers','<CustomerPurchaseStatistics','<CustomerOrderProgress','<CustomerOrderRequest','setIsNotificationsOpen(true)','onClick={handleLogout}'])assert.ok(app.includes(key),key);
});
test('signature profile theme includes visible consent, progress states, offers and notification controls',()=>{
 const patch=css.split('/* Profile PRO: scoped signature-commerce refinements; no global admin overrides. */').at(-1);
 for(const key of ['.gs-profile-marketing','.gs-personal-offers','.gs-purchase-statistics','.gs-customer-progress-steps li[data-current]','.gs-notification-center-filters button[aria-pressed=true]','.gs-password-manager input[type=checkbox]','@media(max-width:350px)','min-height:44px'])assert.ok(patch.includes(key),key);
 assert.ok(!patch.includes('.admin-dashboard'));
});
