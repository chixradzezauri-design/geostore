/** Stage74 frozen read-only review; never a migration runner. */
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gitBlobSha,reviewReleaseBaseline} from './stage72ReconciledReleaseGate.mjs';
import {analyzeStoredSqlParity} from './stage73SqlContentParity.mjs';
import {executableTokens} from './stage74SqlExecutableTokenizer.mjs';

function block(why){throw Error('Stage74 fail-closed SQL review: '+why)}
export function verifyStage74({evidence,baseline,digests,files,source}){
 if(evidence?.schema!==1||evidence.projectId!==baseline.projectId||
 evidence.historyMd5!==baseline.remoteHistoryMd5||evidence.items?.length!==11)
   block('invalid reviewed history');
 const preflight=reviewReleaseBaseline(baseline,{files,source});
 const parity=analyzeStoredSqlParity({baseline,digestSnapshot:digests,localFiles:files,source});
 const unmatched=new Map(parity.sameNameDifferentTimestampAndDifferentSql.map(x=>[x.file,x.appliedVersion]));
 if(unmatched.size!==11)block('remaining mismatch count changed');
 const byVersion=new Map(digests.records.map(x=>[x.version,x]));
 let commentOnly=0,acl=0;
 for(const item of evidence.items){
  const remote=byVersion.get(item.version),sql=source(item.file);
  if(!unmatched.has(item.file)||unmatched.get(item.file)!==item.version||
     !remote||remote.sql_md5!==item.remoteMd5||
     gitBlobSha(sql)!==item.localBlobSha||
     executableTokens(sql).length!==item.localTokenCount)
    block('reviewed source/blob/digest/token drift: '+item.file);
  unmatched.delete(item.file);
  if(item.classification==='TOKENS_EQUAL_IGNORING_COMMENTS_AND_SPACES')commentOnly++;
  else if(item.classification==='ACL_DELTA_SERVICE_ROLE_AND_TRANSACTION'){
   acl++;
   if(item.file!=='20261119090000_revoke_anon_completed_order_reactivation.sql'||
    !/\bBEGIN;/.test(sql)||!/\bCOMMIT;/.test(sql)||
    !/GRANT EXECUTE ON FUNCTION public\.admin_reopen_completed_order\(text\)\s+TO authenticated,\s*service_role;/i.test(sql))
      block('unexpected privilege delta');
  }else block('unknown review status');
 }
 if(unmatched.size||commentOnly!==10||acl!==1||preflight.PhaseA.length!==3||preflight.PhaseB.length!==1)
   block('mismatch counts or release phases changed');
 return {status:'BLOCKED_AUTHENTICATED_FULL_SCHEMA_STAGING_REQUIRED',
    oneTimeReadOnlyTokenMatched:commentOnly,realAclAndTransactionDelta:acl,
    sourceAndDigestEvidencePinned:true,
    warning:'Only hashes and previously reviewed classifications are checked in CI; remote SQL bodies are not stored. No migration repair/deploy is authorized.'};
}
function main(){
 if(process.argv.length!==3||process.argv[2]!=='--verify-frozen')block('use --verify-frozen');
 const json=file=>JSON.parse(readFileSync(new URL('../release/'+file,import.meta.url),'utf8'));
 const files=readdirSync(new URL('../supabase/migrations/',import.meta.url)).filter(x=>x.endsWith('.sql'));
 const source=file=>readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8');
 process.stdout.write(JSON.stringify(verifyStage74({evidence:json('stage74-reviewed-sql-evidence.json'),
 baseline:json('stage72-production-history-baseline.json'),digests:json('stage73-production-sql-digests.json'),
 files,source}),null,2)+'\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main()}catch(err){process.stderr.write(err.message+'\n');process.exitCode=2}
}
