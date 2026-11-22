/**
 * Stage75 local-only SQL migration timestamp reconciliation.
 * This guard has NO DB/network capabilities, never repairs remote history,
 * applies migrations, or makes Production release decisions.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gitBlobSha, reviewReleaseBaseline } from './stage72ReconciledReleaseGate.mjs';
import { sourceMd5, analyzeStoredSqlParity } from './stage73SqlContentParity.mjs';

function blocked(reason) { throw new Error('Stage75 local history guard refused: ' + reason); }
export function verifyStage75({manifest,baseline,digests,files,source}) {
  if(!manifest || manifest.schema!==1 ||
     manifest.projectId!==baseline?.projectId ||
     manifest.remoteHistoryMd5!==baseline.remoteHistoryMd5 ||
     !Array.isArray(manifest.renames) || manifest.renames.length!==21) blocked('evidence header or count changed');
  const local=new Set(files);
  if(local.size!==123)blocked('expected 123 unique local SQL files');
  const remote=new Map(digests.records.map(record=>[record.version,record]));
  const previousNames=new Set(),newNames=new Set(),versions=new Set();
  for(const row of manifest.renames) {
    if(typeof row.before!=='string'||typeof row.after!=='string'||
       !/^\d{14}_.+\.sql$/.test(row.before)||!/^\d{14}_.+\.sql$/.test(row.after)||
       row.before.slice(15)!==row.after.slice(15) ||
       row.appliedVersion!==row.after.slice(0,14) ||
       previousNames.has(row.before)||newNames.has(row.after)||versions.has(row.appliedVersion)) {
      blocked('invalid or duplicate historical mapping');
    }
    previousNames.add(row.before);newNames.add(row.after);versions.add(row.appliedVersion);
    if(local.has(row.before)||!local.has(row.after))blocked('old file still present or renamed file missing: '+row.before);
    const d=remote.get(row.appliedVersion);
    if(!d||d.name.replace(/^\d{14}_/,'')!==row.after.slice(15,-4)||
       d.sql_md5!==row.storedSqlMd5 || !/^[0-9a-f]{40}$/.test(row.gitBlobSha)) {
      blocked('applied SQL metadata mismatch: '+row.after);
    }
    const sql=source(row.after);
    if(gitBlobSha(sql)!==row.gitBlobSha || sourceMd5(sql)!==row.storedSqlMd5) {
      blocked('renamed SQL bytes changed: '+row.after);
    }
  }
  const history=reviewReleaseBaseline(baseline,{files,source});
  const parity=analyzeStoredSqlParity({baseline,digestSnapshot:digests,localFiles:files,source});
  if(history.counts.exactVersionAndName!==101||
     history.counts.sameNameDifferentVersion!==11||
     history.counts.oldUnmatched!==7||history.counts.pending!==4||
     history.remoteOnlyVersions!==34 ||
     parity.totals.exactVersionExactSql!==40||
     parity.totals.exactVersionDifferentSql!==61||
     parity.totals.differentVersionExactSql!==0||
     parity.totals.differentVersionDifferentSql!==11 ||
     history.PhaseA.length!==3||history.PhaseB.length!==1) {
    blocked('migration bucket or remaining source parity drift');
  }
  return {
    result:'PARTIAL_LOCAL_RECONCILIATION_ONLY_NOT_RELEASE_APPROVAL',
    unchangedSqlBlobRenames:manifest.renames.length,
    exactVersionAndName:history.counts.exactVersionAndName,
    remainingDifferentTimestamp:history.counts.sameNameDifferentVersion,
    remainingOldUnmatched:history.counts.oldUnmatched,
    unappliedReleaseMigrations:history.counts.pending,
    remainingRemoteOnlyVersions:history.remoteOnlyVersions,
    sourceChanged:false,
    warning:'No Supabase SQL was applied, no migration history repaired, and Production deployment remains blocked by full-schema authenticated JWT/PostgREST testing.'
  };
}
function main(){
  if(process.argv.length!==3 || process.argv[2]!=='--verify-local-renames')
    blocked('use --verify-local-renames');
  const load=path=>JSON.parse(readFileSync(new URL('../release/'+path,import.meta.url),'utf8'));
  const files=readdirSync(new URL('../supabase/migrations/',import.meta.url)).filter(x=>x.endsWith('.sql'));
  const source=file=>readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8');
  process.stdout.write(JSON.stringify(verifyStage75({
    manifest:load('stage75-reviewed-local-renames.json'),
    baseline:load('stage72-production-history-baseline.json'),
    digests:load('stage73-production-sql-digests.json'),
    files,source
  }),null,2)+'\n');
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try{main()}catch(err){process.stderr.write(String(err.message)+'\n');process.exitCode=2}
}
