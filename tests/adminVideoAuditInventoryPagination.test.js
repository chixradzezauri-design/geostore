import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const admin = await readFile(new URL('../src/components/AdminDashboardPro.jsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');

test('inventory replenishment results are paginated without changing inventory data or save behavior', () => {
  assert.ok(admin.includes("const [replenishmentPage, setReplenishmentPage] = useState(1)"));
  assert.ok(admin.includes('const REPLENISHMENT_PER_PAGE = 8'));
  assert.ok(admin.includes('const paginatedReplenishmentPositions = filteredReplenishmentPositions.slice('));
  assert.ok(admin.includes(') : paginatedReplenishmentPositions.map(position => {'));
  assert.ok(admin.includes('setReplenishmentPage(1)'));
  assert.ok(admin.includes('aria-label="მარაგის შევსების გვერდები"'));
  assert.ok(admin.includes('saveInventoryReplenishmentSetting(position)'));
  assert.ok(admin.includes('p_product_id: position.productId'));
  assert.ok(admin.includes('p_variant_id: position.variantId'));
});

test('staff invitation and permission controls use their existing responsive CSS hooks', () => {
  assert.ok(admin.includes('className="admin-staff-create-form space-y-4 text-xs"'));
  assert.ok(admin.includes('className="admin-staff-permission-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"'));
  assert.ok(css.includes('.admin-staff-permission-grid label,'));
  assert.ok(css.includes('display:flex;align-items:flex-start'));
  assert.ok(css.includes('flex:0 0 16px'));
  assert.ok(css.includes('grid-template-columns:minmax(0,1fr)!important'));
});
