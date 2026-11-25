import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCustomerOrderRequest,classifyCustomerOrderRequest,matchesCustomerOrderRequestFilter} from '../src/utils/customerOrderRequest.js';
import {readFileSync} from 'node:fs';

test('all generated localized request subjects are classified without guessing free text',()=>{
  for(const lang of ['ka','en','ru']) for(const kind of ['return','exchange']){
    const subject=buildCustomerOrderRequest({id:'GS-123',status:'completed'},kind,lang).subject;
    assert.deepEqual(classifyCustomerOrderRequest(subject),{kind,orderId:'GS-123'});
    assert.equal(matchesCustomerOrderRequestFilter(subject,'requests'),true);
    assert.equal(matchesCustomerOrderRequestFilter(subject,kind),true);
    assert.equal(matchesCustomerOrderRequestFilter(subject,kind==='return'?'exchange':'return'),false);
  }
  for(const subject of [null,'Return request','Return request · Order #','Return request · Order #x\n','Return request · Order # x','Return request · Order #'+ 'x'.repeat(101),'Question about return']){
    assert.equal(classifyCustomerOrderRequest(subject),null);
    assert.equal(matchesCustomerOrderRequestFilter(subject,'requests'),false);
    assert.equal(matchesCustomerOrderRequestFilter(subject,'all'),true);
  }
});
test('customer and admin filter shared support subjects without new mutation endpoints',()=>{
  const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
  const admin=readFileSync(new URL('../src/components/AdminDashboardPro.jsx',import.meta.url),'utf8');
  assert.ok(app.includes('matchesCustomerOrderRequestFilter(ticket.subject, supportRequestFilter)'));
  assert.ok(app.includes('readOnly={!!activeOrderRequestDraft}'));
  assert.ok(app.includes('mySupportTicketsHasMore &&'));
  assert.ok(admin.includes('matchesCustomerOrderRequestFilter(ticket.subject, supportRequestFilter)'));
  assert.ok(admin.includes('handleUpdateTicketStatus(t.id'));
});
