import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  classifyMigrationHistory, PENDING_STAGE_MIGRATIONS
} from '../scripts/stage64MigrationHistoryAudit.mjs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('Stage64 fails closed for same logical name with a different applied timestamp', () => {
  const local = [
    '20261117100000_admin_staff_auth_foundation.sql',
    '20261120124250_storefront_publish_concurrency_safe_compat.sql',
    ...PENDING_STAGE_MIGRATIONS
  ];
  const remote = {
    migrations: [
      { version: '20261117231455', name: '20261117100000_admin_staff_auth_foundation' },
      { version: '20261120124250', name: 'storefront_publish_concurrency_safe_compat' },
    ]
  };
  const report = classifyMigrationHistory(local, remote);
  assert.equal(report.classification, 'BLOCKED_RECONCILE_MANUALLY');
  assert.equal(report.counts.exactVersionAndName, 1);
  assert.equal(report.counts.sameNameDifferentVersion, 1);
  assert.equal(report.counts.pending, 4);
  assert.deepEqual(report.nameAtDifferentVersion, [{
    file: '20261117100000_admin_staff_auth_foundation.sql',
    appliedVersions: ['20261117231455'],
  }]);
  assert.deepEqual(report.pending, PENDING_STAGE_MIGRATIONS);
  assert.equal(report.unmatchedRemote.length, 1);
});

test('Stage64 detects unregistered older trigger migrations instead of auto-running them', () => {
  const filenames = [
    '20261106120000_validate_order_item_variants.sql',
    '20261106210000_validate_checkout_input_on_order_insert.sql',
    '20261121170000_strip_private_costs_from_checkout_rpc.sql'
  ];
  const report = classifyMigrationHistory(filenames, {
    migrations: [{ version: '20261120124250', name: 'storefront_publish_concurrency_safe_compat' }]
  });
  assert.deepEqual(report.oldUnmatched, filenames.slice(0, 2));
  assert.deepEqual(report.pending, filenames.slice(2));
  assert.equal(report.classification, 'BLOCKED_RECONCILE_MANUALLY');
});

test('Stage64 rejects same-version/different-name and duplicate logical history', () => {
  const report = classifyMigrationHistory([
    '20261102000000_name_a.sql',
    '20261102000001_name_a.sql',
    '20261102000002_name_b.sql'
  ], { migrations: [
    { version: '20261102000000', name: 'different_name' },
    { version: '20261102000002', name: 'name_b' },
    { version: '20261102000002', name: 'name_b' },
  ]});
  assert.equal(report.counts.versionNameMismatch, 1);
  assert.deepEqual(report.duplicateLocalNames, ['name_a']);
  assert.deepEqual(report.duplicateRemoteVersions, ['20261102000002']);
  assert.equal(report.classification, 'BLOCKED_RECONCILE_MANUALLY');
});

test('Stage64 rejects invalid input and never treats a clean history as staging approval', () => {
  assert.throws(() => classifyMigrationHistory(['invalid.sql'], { migrations: [] }),
    /Invalid migration filename/);
  assert.throws(() => classifyMigrationHistory(['20261102000001_good.sql'], { migrations: [
    { version: 'invalid', name: 'good' }
  ]}), /Invalid remote migration metadata/);
  assert.throws(() => classifyMigrationHistory([], { migrations: 'invalid' }),
    /Expected metadata-only migrations array/);

  const result = classifyMigrationHistory(['20261102000001_good.sql'], {
    migrations: [{ version: '20261102000001', name: 'good' }]
  });
  assert.equal(result.classification, 'HISTORY_MATCH_ONLY_NOT_RELEASE_APPROVAL');
  assert.match(result.warning, /Full-schema isolated staging/);
});

test('Stage64 preserves real variant checkout and flags unsafe obsolete trigger replay', () => {
  const legacyVariant = read('../supabase/migrations/20261106120000_validate_order_item_variants.sql');
  const legacyInsert = read('../supabase/migrations/20261106210000_validate_checkout_input_on_order_insert.sql');
  const currentVariants = read('../supabase/migrations/20261107170000_integrate_custom_product_variants.sql');
  assert.match(legacyVariant, /CREATE TRIGGER orders_validate_item_variants/);
  assert.match(legacyVariant, /FROM public\.products/);
  assert.match(legacyVariant, /v_allowed_sizes/);
  assert.doesNotMatch(legacyVariant, /custom_variant_id/);
  assert.match(legacyInsert, /create trigger validate_order_checkout_input_before_insert/i);
  assert.match(currentVariants, /custom_variant_id/);
  assert.match(currentVariants, /CREATE OR REPLACE FUNCTION private\.create_order_with_stock/);

  const audit = read('../docs/stage64-migration-reconciliation.md');
  assert.match(audit, /legacy variant trigger/i);
  assert.match(audit, /full-schema staging/i);
  assert.match(audit, /DO NOT apply/i);
  const classifier = read('../scripts/stage64MigrationHistoryAudit.mjs');
  assert.doesNotMatch(classifier, /(?:supabase db push|apply_migration|execute_sql|pg\.query)\s*\(/);
});
