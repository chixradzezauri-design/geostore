import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const admin = readFileSync(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('server raw order total survives display normalization for financial reconciliation', () => {
  assert.match(app, /totalGEL: normalizeOrderTotal\(o\.total_gel\),[\s\S]*?rawTotalGEL: o\.total_gel/);
  assert.match(admin, /Object\.prototype\.hasOwnProperty\.call\(order, 'rawTotalGEL'\)/);
  assert.match(admin, /\? order\.rawTotalGEL\s*: \(order\.totalGEL \?\? order\.total_gel\)/);
  assert.match(admin, /isReconciledOrderRevenue\(rawOrderTotal, revenueSplit, order\.checkoutBreakdown\)/);
});

test('raw null and malformed amounts remain available instead of becoming certified zero', () => {
  const resolveOriginal = order => Object.prototype.hasOwnProperty.call(order, 'rawTotalGEL')
    ? order.rawTotalGEL
    : (order.totalGEL ?? order.total_gel);
  assert.equal(resolveOriginal({ rawTotalGEL: null, totalGEL: 0 }), null);
  assert.equal(resolveOriginal({ rawTotalGEL: 'oops', totalGEL: 0 }), 'oops');
  assert.equal(resolveOriginal({ rawTotalGEL: '23.50', totalGEL: 23.5 }), '23.50');
  assert.equal(resolveOriginal({ totalGEL: 23.5 }), 23.5);
});
