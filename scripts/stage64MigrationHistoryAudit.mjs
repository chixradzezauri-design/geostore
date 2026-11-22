/**
 * Stage64 READ-ONLY migration history classifier. It cannot migrate databases.
 *
 * Input: a locally exported metadata-only JSON file:
 *   { "migrations": [{ "version": "20261120124250", "name": "..." }, ...] }
 * or the migrations array itself. Do not include database credentials or row data.
 *
 * Usage: node scripts/stage64MigrationHistoryAudit.mjs /path/to/migrations.json
 * Exit code 2 means a version/name drift requires manual staging reconciliation.
 *
 * A clean report NEVER authorizes migration application or production release:
 * full isolated Supabase staging and authenticated tests are separate gates.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PENDING_STAGE_MIGRATIONS = Object.freeze([
  '20261121170000_strip_private_costs_from_checkout_rpc.sql',
  '20261121190000_redact_alternate_costs_from_order_history.sql',
  '20261121210000_scope_admin_order_ledger_permissions.sql',
]);

const VERSION_PATTERN = /^\d{14}$/;
const FILE_PATTERN = /^(\d{14})_(.+)\.sql$/;
const normalizeName = (value) => value.replace(/^\d{14}_/, '');

function validatedLocal(localFiles) {
  if (!Array.isArray(localFiles)) throw new Error('Expected SQL filename array');
  return localFiles.filter(name => typeof name === 'string' && name.endsWith('.sql'))
    .map(file => {
      const match = FILE_PATTERN.exec(file);
      if (!match) throw new Error('Invalid migration filename: ' + file);
      return { file, version: match[1], name: match[2] };
    });
}

function validatedRemote(payload) {
  const rows = Array.isArray(payload) ? payload : payload?.migrations;
  if (!Array.isArray(rows)) throw new Error('Expected metadata-only migrations array');
  return rows.map(row => {
    const version = String(row?.version ?? '');
    const rawName = row?.name;
    if (!VERSION_PATTERN.test(version) || typeof rawName !== 'string' || !rawName.trim()) {
      throw new Error('Invalid remote migration metadata');
    }
    return { version, name: normalizeName(rawName.trim()) };
  });
}

const collisions = (rows, key) => {
  const counts = new Map();
  for (const row of rows) counts.set(row[key], (counts.get(row[key]) || 0) + 1);
  return [...counts].filter(([, count]) => count > 1).map(([name]) => name).sort();
};

export function classifyMigrationHistory(localFiles, remotePayload) {
  const local = validatedLocal(localFiles);
  const remote = validatedRemote(remotePayload);
  const versions = new Map(remote.map(row => [row.version, row]));
  const names = new Map();
  for (const row of remote) {
    if (!names.has(row.name)) names.set(row.name, []);
    names.get(row.name).push(row.version);
  }
  const exactVersion = [];
  const versionNameMismatch = [];
  const nameAtDifferentVersion = [];
  const oldUnmatched = [];
  const pending = [];
  const otherUnmatched = [];
  const localByVersion = new Set(local.map(row => row.version));

  const newestRemoteVersion = remote.reduce((latest, row) =>
    row.version > latest ? row.version : latest, '00000000000000');

  for (const row of local) {
    const active = versions.get(row.version);
    if (active) {
      if (active.name === row.name) exactVersion.push(row.file);
      else versionNameMismatch.push({ file: row.file, appliedName: active.name });
    } else if (names.has(row.name)) {
      nameAtDifferentVersion.push({
        file: row.file,
        appliedVersions: [...names.get(row.name)].sort(),
      });
    } else if (PENDING_STAGE_MIGRATIONS.includes(row.file)) {
      pending.push(row.file);
    } else if (row.version <= newestRemoteVersion) {
      oldUnmatched.push(row.file);
    } else {
      otherUnmatched.push(row.file);
    }
  }

  const unmatchedRemote = remote.filter(row => !localByVersion.has(row.version));
  const duplicateLocalVersions = collisions(local, 'version');
  const duplicateLocalNames = collisions(local, 'name');
  const duplicateRemoteVersions = collisions(remote, 'version');

  const versionDrift = versionNameMismatch.length + nameAtDifferentVersion.length +
    oldUnmatched.length + otherUnmatched.length + pending.length +
    unmatchedRemote.length + duplicateLocalVersions.length +
    duplicateRemoteVersions.length + duplicateLocalNames.length;

  return {
    classification: versionDrift ? 'BLOCKED_RECONCILE_MANUALLY' : 'HISTORY_MATCH_ONLY_NOT_RELEASE_APPROVAL',
    counts: {
      local: local.length, remote: remote.length,
      exactVersionAndName: exactVersion.length,
      sameNameDifferentVersion: nameAtDifferentVersion.length,
      versionNameMismatch: versionNameMismatch.length,
      oldUnmatched: oldUnmatched.length,
      pending: pending.length,
      otherUnmatched: otherUnmatched.length,
      appliedRemoteWithoutMatchingLocalVersion: unmatchedRemote.length,
    },
    exactVersion,
    versionNameMismatch,
    nameAtDifferentVersion,
    oldUnmatched,
    pending,
    otherUnmatched,
    unmatchedRemote,
    duplicateLocalVersions,
    duplicateLocalNames,
    duplicateRemoteVersions,
    warning: 'Metadata matching cannot prove SQL equivalence. Never auto-apply, repair, rename or mark migrations applied. Full-schema isolated staging and authenticated E2E are mandatory.',
  };
}

function runCli() {
  if (process.argv.length !== 3) {
    throw new Error('Usage: node scripts/stage64MigrationHistoryAudit.mjs <metadata-only-migrations.json>');
  }
  const localDir = resolve(dirname(fileURLToPath(import.meta.url)), '../supabase/migrations');
  const localFiles = readdirSync(localDir);
  const payload = JSON.parse(readFileSync(resolve(process.argv[2]), 'utf8'));
  const report = classifyMigrationHistory(localFiles, payload);
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  if (report.classification === 'BLOCKED_RECONCILE_MANUALLY') process.exitCode = 2;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    runCli();
  } catch (error) {
    process.stderr.write('Stage64 preflight refused input: ' + error.message + '\n');
    process.exitCode = 1;
  }
}
