import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCheckoutContact, validateCheckoutItems } from './checkoutValidation.js';
test('valid guest contact',()=>assert.deepEqual(validateCheckoutContact({name:'Valid Name',phone:'+995 599 00 00 00',email:'guest@example.com',address:'Tbilisi 1',requireEmail:true}),{valid:true}));
test('rejects malformed contact fields',()=>{assert.equal(validateCheckoutContact({name:'A',phone:'599000000',address:'Tbilisi'}).field,'name');assert.equal(validateCheckoutContact({name:'Valid Name',phone:'123',address:'Tbilisi'}).field,'phone');assert.equal(validateCheckoutContact({name:'Valid Name',phone:'599000000',email:'bad',address:'Tbilisi',requireEmail:true}).field,'email');});
test('rejects invalid product quantities and variants',()=>{assert.equal(validateCheckoutItems([{id:'p1',quantity:0}]).valid,false);assert.equal(validateCheckoutItems([{id:'p1',quantity:101}]).valid,false);assert.equal(validateCheckoutItems([{id:'p1',quantity:1,selected_size:'x'.repeat(41)}]).valid,false);});
test('caps total quantity per product across variants',()=>assert.deepEqual(validateCheckoutItems([{id:'p1',quantity:60,selected_size:'M'},{id:'p1',quantity:41,selected_size:'L'}]),{valid:false,reason:'quantity'}));
