/**
 * Stage73 — compare actual applied Supabase SQL *digests* with local SQL files.
 * This script never accesses Production, credentials, customer data, or SQL
 * statements from the remote service. It compares ONLY locally committed
 * version/name/md5/byte-length fingerprints captured via read-only SQL.
 * Exact byte equality is positive evidence, differences require review.
 * Running this does NOT authorize database migration or production release.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyMigrationHistory } from './stage64MigrationHistoryAudit.mjs';
import { reviewReleaseBaseline } from './stage72ReconciledReleaseGate.mjs';

const root = new URL('../', import.meta.url);
export const sourceMd5 = source => createHash('md5').update(source,'utf8').digest('hex');
const cleanName = name => name.replace(/^\d{14}_/, '');

function stop(why) { throw new Error('Stage73 stored SQL parity gate refused: ' + why); }

export function analyzeStoredSqlParity({ baseline, digestSnapshot, localFiles, source, currentDigests=null }) {
  if (!digestSnapshot || digestSnapshot.schema !== 1 ||
      digestSnapshot.projectId !== baseline?.projectId ||
      digestSnapshot.parentHistoryMd5 !== baseline.remoteHistoryMd5 ||
      !Array.isArray(digestSnapshot.records) || digestSnapshot.records.length!==135) {
    stop('captured SQL digest index does not match the reviewed Production baseline');
  }
  const rows=digestSnapshot.records;
  if (rows.length!==baseline.appliedMigrations.length) stop('applied migration history count changed');
  for(let i=0;i<rows.length;i++){
    const row=rows[i],expected=baseline.appliedMigrations[i];
    if (row.version!==expected.version || row.name!==expected.name ||
        !/^[0-9a-f]{32}$/.test(row.sql_md5) ||
        !Number.isInteger(row.sql_bytes) || row.sql_bytes<=0 || row.chunks!==1) {
      stop('invalid applied SQL digest or version at index '+i);
    }
  }
  if(currentDigests!==null){
    const current=Array.isArray(currentDigests)?currentDigests:currentDigests?.records;
    if(!Array.isArray(current) || current.length!==rows.length ||
       current.some((x,i)=>x.version!==rows[i].version ||
         x.name!==rows[i].name || x.sql_md5!==rows[i].sql_md5 ||
         Number(x.sql_bytes)!==rows[i].sql_bytes || Number(x.chunks)!==1)){
      stop('live applied SQL fingerprint changed since captured baseline');
    }
  }
  const checked=reviewReleaseBaseline(baseline,{files:localFiles,source});
  const history=classifyMigrationHistory(localFiles,{migrations:baseline.appliedMigrations});
  if(history.counts.exactVersionAndName!==80 || history.counts.sameNameDifferentVersion!==32) {
    stop('unexpected migration source/history bucket changes');
  }
  const byVersion=new Map(rows.map(x=>[x.version,x]));
  const byName=new Map();
  for(const r of rows){
    const name=cleanName(r.name);
    if(!byName.has(name))byName.set(name,[]);
    byName.get(name).push(r);
  }
  const matches={exactVersionExactSql:[],exactVersionDifferentSql:[],
    differentVersionExactSql:[],differentVersionDifferentSql:[]};
  for(const name of localFiles.filter(x=>x.endsWith('.sql'))){
    const v=name.slice(0,14),logical=name.slice(15,-4);
    const applied=byVersion.get(v);
    const remote=(applied && cleanName(applied.name)===logical)?applied:
      (!applied && byName.get(logical)?.length===1 ? byName.get(logical)[0] : null);
    if(!remote)continue;
    const strictVersion=remote.version===v;
    const strictContent=remote.sql_md5===sourceMd5(source(name));
    const bucket=strictVersion
      ? (strictContent?'exactVersionExactSql':'exactVersionDifferentSql')
      : (strictContent?'differentVersionExactSql':'differentVersionDifferentSql');
    matches[bucket].push({file:name,appliedVersion:remote.version});
  }
  const totals=Object.fromEntries(Object.entries(matches).map(([key,files])=>[key,files.length]));
  if(totals.exactVersionExactSql+totals.exactVersionDifferentSql!==80 ||
     totals.differentVersionExactSql+totals.differentVersionDifferentSql!==32) {
    stop('source parity count cannot account for all 112 linked local migrations');
  }
  return {
    status: 'BLOCKED_UNTIL_MANUAL_SQL_DIFF_REVIEW_AND_FULL_SCHEMA_JWT_STAGING',
    baselineApplied:rows.length,
    comparedLinkedSqlFiles:112,
    totals,
    sameNameDifferentTimestampButExactByteSql:matches.differentVersionExactSql,
    sameNameDifferentTimestampAndDifferentSql:matches.differentVersionDifferentSql,
    exactVersionButDifferentSql:matches.exactVersionDifferentSql,
    stillBlockedOlderFiles:checked.blockedOldFiles.length,
    stillPendingSourcePinnedPhaseA:checked.PhaseA.length,
    stillPendingSourcePinnedPhaseB:checked.PhaseB.length,
    warning: 'Byte equality is proof of exact recorded SQL source parity, not authorization to repair timestamps. Any different SQL requires a real semantic/release review. No SQL was applied.'
  };
}

function main(){
  const args=process.argv.slice(2);
  let currentDigests=null;
  if(args.length===1 && args[0]==='--verify-frozen-digests') { /* CI snapshot mode */ }
  else if(args.length===2 && args[0]==='--fresh-digests-json'){
    currentDigests=JSON.parse(readFileSync(resolve(args[1]),'utf8'));
  } else stop('usage: --verify-frozen-digests OR --fresh-digests-json <metadata-only.json>');
  const baseline=JSON.parse(readFileSync(new URL('../release/stage72-production-history-baseline.json',import.meta.url),'utf8'));
  const digestSnapshot=JSON.parse(readFileSync(new URL('../release/stage73-production-sql-digests.json',import.meta.url),'utf8'));
  const localFiles=readdirSync(new URL('../supabase/migrations/',import.meta.url)).filter(x=>x.endsWith('.sql'));
  const source=filename=>readFileSync(new URL('../supabase/migrations/'+filename,import.meta.url),'utf8');
  process.stdout.write(JSON.stringify(analyzeStoredSqlParity({
    baseline,digestSnapshot,localFiles,source,currentDigests
  }),null,2)+'\n');
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{main();}catch(err){process.stderr.write(String(err.message)+'\n');process.exitCode=2;}
}
