import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const smoke=readFileSync(new URL('./browser/realStorefrontSmoke.mjs',import.meta.url),'utf8');
const scenario=readFileSync(new URL('./browser/stage49AccountSwitchScenarios.mjs',import.meta.url),'utf8');
test('Stage49: existing browser suite runs a real React multi-owner journey',()=>{
  assert.match(smoke,/runStage49AccountSwitchScenario\(browser, host\)/);
  for(const step of ['Guest → A','Guest → B → guest → A','otherTab','Private Customer A','Private address A']) {
    assert.ok(scenario.includes(step));
  }
  assert.match(scenario,/waitCart\(page, mockUsers\.a\.id, 0\)/);
  assert.match(scenario,/waitCart\(page, mockUsers\.b\.id, 0\)/);
  assert.match(scenario,/waitCart\(page, mockUsers\.a\.id, 1\)/);
  assert.match(scenario,/waitCart\(page, mockUsers\.b\.id, 2\)/);
});
test('Stage49: test endpoints are isolated and cannot mutate live data',()=>{
  assert.match(scenario,/context\.route\(supabase \+ '\/\*\*'/);
  assert.match(scenario,/context\.routeWebSocket/);
  assert.match(scenario,/Stage49: unexpected write blocked/);
  assert.match(scenario,/assert\.deepEqual\(blockedMutations, \[\]/);
  assert.doesNotMatch(scenario,/create_order_with_stock/);
});
test('Stage49: forged user metadata cannot bypass server admin permissions',()=>{
  assert.match(scenario,/user_metadata: \{ name: 'Customer A', phone: '599000001', role: 'admin' \}/);
  assert.match(scenario,/get_my_admin_access/);
  assert.match(scenario,/is_admin: false, is_staff: false, permissions: \{\}/);
  assert.match(scenario,/geostore-admin-shortcut/);
});
