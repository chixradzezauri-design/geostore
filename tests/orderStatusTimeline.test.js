import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');

test('normal order status changes refresh the displayed status timestamp', () => {
  const handler = admin.split('const handleUpdateOrderStatus = async')[1]?.split('const handleConfirmOrderReactivation = async')[0] || '';
  assert.match(handler, /const statusResult = await response\.json\(\)\.catch\(\(\) => null\)/);
  assert.match(handler, /status_changed_at: statusChangedAt/);
  assert.match(handler, /new Date\(\)\.toISOString\(\)/);
});

test('completed and cancelled order reactivation refreshes the status timestamp without losing stock markers', () => {
  const handler = admin.split('const handleConfirmOrderReactivation = async')[1]?.split('const handleSaveOrderAdminNote = async')[0] || '';
  assert.match(handler, /const reactivationResult = await response\.json\(\)\.catch\(\(\) => null\)/);
  assert.match(handler, /status_changed_at: statusChangedAt/);
  assert.match(admin, /Boolean\(o\.stock_deducted_at\) && !o\.stock_restored_at/);
  assert.match(admin, /stock_restored_at/);
});
