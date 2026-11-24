import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const jsx = readFileSync(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/designSystemV2.css', import.meta.url), 'utf8');
const browser = readFileSync(new URL('./browser/responsiveLayout.mjs', import.meta.url), 'utf8');

test('Stage 37: support replies accept multiline input while retaining guarded send', () => {
  const section = jsx.slice(jsx.indexOf('<div className="admin-support-reply-form'), jsx.indexOf('<div className="admin-support-reply-form') + 1700);
  assert.match(section, /<textarea\s+rows=\{3\}/);
  assert.match(section, /maxLength=\{4000\}/);
  assert.match(section, /admin-support-reply-input/);
  assert.match(section, /onChange=\{e => setReplyInputs/);
  assert.match(section, /handleSendTicketReply\(t\.id\)/);
  assert.match(section, /disabled=\{!supportTicketsReady \|\| !!supportTicketsError \|\| !!supportStatusBusy\[String\(t\.id\)\] \|\| !!replySending\[String\(t\.id\)\] \|\| !String\(replyInputs\[t\.id\] \|\| ''\)\.trim\(\)\}/);
  for (const state of ['ღია', 'მუშავდება', 'მოგვარებული'])
    assert.ok(jsx.includes("handleUpdateTicketStatus(t.id, '" + state + "')"), state);
});
test('Stage 37: CRM fields are labelled and existing save function remains', () => {
  assert.match(jsx, /htmlFor=\{`crm-discount-\$\{uId\}`\}/);
  assert.match(jsx, /id=\{`crm-discount-\$\{uId\}`\}/);
  assert.match(jsx, /htmlFor=\{`crm-note-\$\{uId\}`\}/);
  assert.match(jsx, /id=\{`crm-note-\$\{uId\}`\}/);
  assert.match(jsx, /handleSaveUserCrm\(u\.id \|\| u\.email\)/);
  assert.match(jsx, /crmLoading && <p role="status"/);
  assert.match(jsx, /crmError && <p role="alert"/);
});
test('Stage 37: product filters and responsive forms retain existing mutations', () => {
  assert.match(jsx, /type="search"\s+placeholder="ძებნა პროდუქტებში\.\.\."/);
  assert.match(jsx, /<input type="search" aria-label="CRM მომხმარებლების ძებნა"/);
  assert.match(jsx, /onClick=\{\(\) => handleToggleProductPublished\(p\.id\)\}/);
  assert.match(jsx, /onBlur=\{e => \{/);
  assert.match(css, /Stage 37 — support, CRM and product forms/);
  assert.match(browser, /supportReplyFont >= 16/);
  assert.match(browser, /crmEditInputMinHeight >= 43/);
  assert.match(browser, /productFilterMinFont >= 16/);
});
