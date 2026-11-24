/**
 * Stage76: pin one-time lexical SQL review for all 61 same-version,
 * different-stored-SQL historical migration records.
 *
 * No remote SQL source is copied into Git. This file has no network,
 * database, migration execution, release or deploy capability.
 * Source-token equality was inspected once via read-only Supabase metadata;
 * subsequent CI only validates pinned Git blobs and stored SQL digests.
 */
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gitBlobSha} from './stage72ReconciledReleaseGate.mjs';
import {analyzeStoredSqlParity} from './stage73SqlContentParity.mjs';
import {verifyStage75} from './stage75LocalHistoryReconcile.mjs';

const critical = Object.freeze([
 '20261103044438_add_idempotent_checkout_replay.sql',
 '20261103151704_use_amr_for_admin_order_reactivation.sql',
 '20261103194444_secure_admin_save_order_note.sql',
 '20261106103325_preserve_order_item_variants.sql',
 '20261107115218_persist_checkout_addons_server_pricing.sql',
 '20261107130302_add_order_status_notifications.sql',
 '20261109102126_support_ticket_threading_and_secure_access.sql',
 '20261109102221_fix_support_ticket_message_lookup.sql',
 '20261109102338_harden_support_ticket_rpc_wrappers.sql',
 '20261109160629_allow_partial_size_color_stock_updates.sql',
 '20261120122908_replenishment_optimistic_concurrency.sql',
]);
function blocked(reason){throw Error('Stage76 immutable SQL divergence gate refused: '+reason);}
export function verifyStage76({review,baseline,digests,stage75,files,source}){
 if(review?.schema!==1||review.projectId!==baseline?.projectId||
    review.remoteHistoryMd5!==baseline.remoteHistoryMd5||
    !Array.isArray(review.entries)||review.entries.length!==61)
   blocked('review header/count or Supabase snapshot changed');
 const pre=verifyStage75({manifest:stage75,baseline,digests,files,source});
 const parity=analyzeStoredSqlParity({baseline,digestSnapshot:digests,localFiles:files,source});
 if(pre.exactVersionAndName!==101||parity.totals.exactVersionDifferentSql!==61||
    parity.totals.differentVersionDifferentSql!==11||
    parity.totals.exactVersionExactSql!==40)blocked('historical migration source buckets drifted');
 const expected=new Set(parity.exactVersionButDifferentSql.map(x=>x.file));
 const applied=new Map(digests.records.map(r=>[r.version,r]));
 const risks=new Map(),seen=new Set();let equal=0,different=0;
 for(const entry of review.entries){
  const f=entry?.file,v=f?.slice(0,14);
  if(typeof f!=='string'||!expected.has(f)||seen.has(f)||
     !/^\d{14}_[A-Za-z0-9_]+\.sql$/.test(f))blocked('unexpected, duplicate, or excluded migration filename');
  seen.add(f);
  const r=applied.get(v);
  if(!r||r.name.replace(/^\d{14}_/,'')!==f.slice(15,-4)||
     r.sql_md5!==entry.appliedSqlMd5||
     !/^[a-f0-9]{40}$/.test(entry.gitBlobSha)||
     gitBlobSha(source(f))!==entry.gitBlobSha)
     blocked('local Git source or applied-SQL digest modified: '+f);
  if(critical.includes(f)){
   different++;
   if(entry.classification!=='EXECUTABLE_TOKEN_DIFFERENCE'||
      typeof entry.why!=='string'||entry.why.length<24||
      !['COMMERCE','AUTHORIZATION','SQL_SYNTAX','SECURITY_DEFINER',
         'SUPPORT_AUTH','MESSAGE_TEXT','TRANSACTION_SCOPE'].includes(entry.risk)){
      blocked('unreviewed executable-code difference: '+f);
   }
   risks.set(f,entry.risk);
  }else{
   equal++;
   if(entry.classification!=='EXECUTABLE_TOKENS_SAME_EXCEPT_COMMENTS_WHITESPACE'||
      'risk' in entry||'why' in entry)blocked('historical source classification changed: '+f);
  }
 }
 if(expected.size!==seen.size||equal!==50||different!==11||risks.size!==critical.length)
   blocked('frozen one-time review evidence incomplete');
 return {
   outcome:'NOT_RELEASE_READY_HISTORY_RECONCILIATION_STILL_BLOCKED',
   comparedExactlyVersionMatchedFiles:61,
   lexicalTokenSameExceptCommentsAndSpaces:equal,
   executableTokenDifferences:different,
   criticalOrBehavioralFiles:[...risks].map(([file,risk])=>({file,risk})),
   remainingDifferentTimestamp:11,
   legacyUnappliedOrUnsafe:7,
   phaseAMigrations:3,phaseBMigrations:1,
   warning:'This only authenticates one-time review evidence. Never automatically replay old SQL, mark migrations applied, or deploy without full-schema authenticated Supabase JWT/PostgREST tests.'
 };
}
function run(){
 if(process.argv.length!==3||process.argv[2]!=='--verify-frozen-review')
   blocked('usage: --verify-frozen-review');
 const json=n=>JSON.parse(readFileSync(new URL('../release/'+n,import.meta.url),'utf8'));
 const files=readdirSync(new URL('../supabase/migrations/',import.meta.url)).filter(x=>x.endsWith('.sql'));
 const source=n=>readFileSync(new URL('../supabase/migrations/'+n,import.meta.url),'utf8');
 const result=verifyStage76({review:json('stage76-existing-version-sql-divergence.json'),
   baseline:json('stage72-production-history-baseline.json'),
   digests:json('stage73-production-sql-digests.json'),
   stage75:json('stage75-reviewed-local-renames.json'),files,source});
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{run()}catch(err){process.stderr.write(err.message+'\n');process.exitCode=2;}
}
