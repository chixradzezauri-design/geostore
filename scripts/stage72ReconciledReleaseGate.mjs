/**
 * Stage72: metadata-only, source-pinned release plan for GEOSTORE.
 *
 * Zero network calls, no DB credentials, no SQL execution, no deploy.
 * --verify-pinned validates the committed historical snapshot for CI.
 * --fresh-migrations-json FILE validates a newly exported Supabase
 * migration history and refuses to proceed if Production changed.
 *
 * Passing this check never approves Production release. Full-schema
 * staging and authenticated HTTP/JWT E2E remain separate requirements.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyMigrationHistory, PENDING_STAGE_MIGRATIONS } from './stage64MigrationHistoryAudit.mjs';

const root = new URL('../', import.meta.url);
const localDir = new URL('../supabase/migrations/', import.meta.url);
const releaseFile = new URL('../release/stage72-production-history-baseline.json', import.meta.url);

function invalid(message) { throw new Error('Stage72 release gate blocked: ' + message); }

export function migrationHistoryMd5(rows) {
  if (!Array.isArray(rows) || rows.some(row =>
    !/^\d{14}$/.test(String(row?.version ?? '')) ||
    typeof row?.name !== 'string' || !row.name.trim())) {
    invalid('remote migrations metadata invalid');
  }
  return createHash('md5').update(rows
    .map(row => ({ version: String(row.version), name: row.name }))
    .sort((a,b) => a.version.localeCompare(b.version) || a.name.localeCompare(b.name))
    .map(row => row.version + ':' + row.name).join('\n'), 'utf8').digest('hex');
}

export function gitBlobSha(content) {
  if (typeof content !== 'string') invalid('SQL source must be UTF-8');
  return createHash('sha1')
    .update('blob ' + Buffer.byteLength(content, 'utf8') + '\0', 'utf8')
    .update(content, 'utf8').digest('hex');
}

function readBaselinedFiles() {
  const files = readdirSync(localDir).filter(name => name.endsWith('.sql'));
  return { files, source: path => readFileSync(new URL('../supabase/migrations/' + path, import.meta.url), 'utf8') };
}

export function reviewReleaseBaseline(baseline, { files, source, currentRemote = null }) {
  if (!baseline || baseline.schema !== 1 ||
      baseline.projectId !== 'xmtnszxtnfxnrojionoa' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(baseline.capturedDate) ||
      !Array.isArray(baseline.appliedMigrations) ||
      !Array.isArray(files) || typeof source !== 'function') invalid('untrusted baseline shape');
  const pinned = baseline.appliedMigrations;
  if (migrationHistoryMd5(pinned) !== baseline.remoteHistoryMd5) {
    invalid('frozen production migration history checksum mismatch');
  }
  if (currentRemote !== null) {
    const incoming = Array.isArray(currentRemote) ? currentRemote : currentRemote?.migrations;
    if (migrationHistoryMd5(incoming) !== baseline.remoteHistoryMd5) {
      invalid('live production migration history changed after audit; perform fresh reconciliation');
    }
  }
  const report = classifyMigrationHistory(files, { migrations: pinned });
  for (const [name,expected] of Object.entries(baseline.expected)) {
    if (name === 'duplicateLocalNames') {
      if (report.duplicateLocalNames.length !== expected) invalid('duplicate migration logical names changed');
    } else if (report.counts[name] !== expected) {
      invalid('migration bucket changed: ' + name + ' expected ' + expected +
        ', observed ' + report.counts[name]);
    }
  }
  if (report.classification !== 'BLOCKED_RECONCILE_MANUALLY' ||
      report.versionNameMismatch.length !== 0 ||
      report.duplicateLocalVersions.length !== 0 ||
      report.duplicateRemoteVersions.length !== 0) {
    invalid('unexpected migration-history classification or collision');
  }
  const stale = [...report.oldUnmatched].sort();
  if (!Array.isArray(baseline.blockedOldFiles) ||
      JSON.stringify(stale) !== JSON.stringify([...baseline.blockedOldFiles].sort())) {
    invalid('unreviewed older SQL migration detected');
  }
  if (!Array.isArray(baseline.phasedSources) ||
      baseline.phasedSources.length !== 4 ||
      PENDING_STAGE_MIGRATIONS.length !== 4 ||
      JSON.stringify(baseline.phasedSources.map(x=>x.file)) !==
        JSON.stringify(PENDING_STAGE_MIGRATIONS) ||
      baseline.phasedSources.some((x,i) => x.phase !== (i===3?'B':'A'))) {
    invalid('four-file Phase A/Phase B deployment ordering changed');
  }
  const included = new Set(files);
  for (const p of baseline.phasedSources) {
    if (!included.has(p.file)) invalid('required staged migration missing: ' + p.file);
    if (!/^[a-f0-9]{40}$/.test(p.sha) ||
        gitBlobSha(source(p.file)) !== p.sha) {
      invalid('reviewed migration source SHA changed: ' + p.file);
    }
  }
  if (baseline.phasedSources.some(x => stale.includes(x.file))) {
    invalid('legacy blocked migration included in staged release');
  }
  return {
    outcome: 'BLOCKED_PENDING_FULL_SCHEMA_STAGING_AND_MANUAL_SQL_HISTORY_RECONCILIATION',
    snapshotDate: baseline.capturedDate,
    remoteHistoryMd5: baseline.remoteHistoryMd5,
    counts: report.counts,
    remoteOnlyVersions: report.unmatchedRemote.length,
    duplicateLocalLogicalNames: report.duplicateLocalNames,
    blockedOldFiles: stale,
    PhaseA: baseline.phasedSources.filter(x=>x.phase==='A'),
    PhaseB: baseline.phasedSources.filter(x=>x.phase==='B'),
    warning: 'This is a read-only source/metadata gate, NOT permission to run SQL, repair history, merge the PR, or deploy Production.'
  };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 && args.length !== 2) {
    invalid('usage: --verify-pinned OR --fresh-migrations-json <metadata-only.json>');
  }
  let currentRemote = null;
  if (args[0] === '--fresh-migrations-json' && args.length === 2) {
    currentRemote = JSON.parse(readFileSync(resolve(args[1]), 'utf8'));
  } else if (args[0] !== '--verify-pinned' || args.length !== 1) {
    invalid('unknown or incomplete mode');
  }
  const baseline = JSON.parse(readFileSync(releaseFile, 'utf8'));
  const { files, source } = readBaselinedFiles();
  process.stdout.write(JSON.stringify(
    reviewReleaseBaseline(baseline, { files, source, currentRemote }), null, 2) + '\n');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch(error) {
    process.stderr.write(String(error.message) + '\n');
    process.exitCode=2;
  }
}
