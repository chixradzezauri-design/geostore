import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildCustomerOrderRequest} from '../src/utils/customerOrderRequest.js';

test('delivered order requests are localized and identify the order',()=>{
  for(const lang of ['ka','en','ru','unsupported']){
    for(const status of ['delivered','completed','დასრულებული','доставлен']){
      const order={id:'GS-123',status};
      const a=buildCustomerOrderRequest(order,'return',lang);
      const b=buildCustomerOrderRequest(order,'exchange',lang);
      assert.equal(a.kind,'return');assert.equal(b.kind,'exchange');
      assert.match(a.subject,/#GS-123$/);assert.match(b.subject,/#GS-123$/);
      assert.notEqual(a.subject,b.subject);
    }
  }
});
test('pending, cancelled, invalid and oversized order references cannot initialize requests',()=>{
  for(const status of ['new','processing','shipped','cancelled','unknown',null])assert.equal(buildCustomerOrderRequest({id:'1',status},'return'),null);
  for(const id of ['',null,'a\nb','x'.repeat(101)])assert.equal(buildCustomerOrderRequest({id,status:'delivered'},'return'),null);
  assert.equal(buildCustomerOrderRequest({id:'1',status:'delivered'},'refund'),null);
});
test('order request UI uses existing support form and owner scope without auto submission',()=>{
  const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
  const component=readFileSync(new URL('../src/components/CustomerOrderRequest.jsx',import.meta.url),'utf8');
  assert.ok(app.includes('orderRequestDraft?.ownerId === currentUser?.id'));
  assert.ok(app.includes('defaultValue={activeOrderRequestDraft?.subject'));
  assert.ok(app.includes('setOrderRequestDraft({ ...request, ownerId: currentUser.id })'));
  assert.ok(app.includes('create_support_ticket_idempotent'));
  assert.ok(component.includes('type="button"'));
  assert.ok(!component.includes('fetch('));
});
