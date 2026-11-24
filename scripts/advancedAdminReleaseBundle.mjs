// Offline, source-pinned bundle builder. Never connects to a database.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const expected=['admin-suppliers','admin-purchases','admin-supplier-payments','marketing-consent','marketing-segments','marketing-campaigns','marketing-templates','marketing-preflight'].map(n=>'release/staged-'+n+'.sql');
const fail=m=>{throw Error('Advanced release blocked: '+m);};
export function historyKey(rows){
 if(!Array.isArray(rows)||rows.length===0||rows.some(r=>!r||!/^\d{14}$/.test(r.version)||typeof r.name!=='string'||!r.name.trim())||new Set(rows.map(r=>r.version)).size!==rows.length)fail('invalid migration metadata');
 return JSON.stringify(rows.map(({version,name})=>({version,name})).sort((a,b)=>a.version.localeCompare(b.version)));
}
export function gitBlobSha(s){return createHash('sha1').update('blob '+Buffer.byteLength(s,'utf8')+'\0').update(s,'utf8').digest('hex');}
export function buildAdvancedBundle(manifest,readSource,freshHistory=null){
 if(manifest?.schema!==1||manifest.projectId!=='xmtnszxtnfxnrojionoa'||manifest.releaseApproved!==false||manifest.deliveryEnabled!==false||!Array.isArray(manifest.sources)||JSON.stringify(manifest.sources.map(s=>s.path))!==JSON.stringify(expected))fail('invalid release scope/order');
 const pinned=historyKey(manifest.appliedMigrations);
 if(freshHistory!==null&&historyKey(Array.isArray(freshHistory)?freshHistory:freshHistory.migrations)!==pinned)fail('live migration history changed; re-audit before release');
 const parts=manifest.sources.map(({path,sha})=>{
  const source=readSource(path);
  if(typeof source!=='string'||!/^[a-f0-9]{40}$/.test(sha)||gitBlobSha(source)!==sha)fail('source changed: '+path);
  const begins=[...source.matchAll(/^BEGIN;[ \t]*$/gm)],commits=[...source.matchAll(/^COMMIT;[ \t]*$/gm)];
  if(begins.length!==1||commits.length!==1||begins[0].index>=commits[0].index||!/^(\s*--[^\n]*(?:\n|$))*\s*$/.test(source.slice(0,begins[0].index))||source.slice(commits[0].index+commits[0][0].length).trim()!=='')fail('unexpected transaction boundary: '+path);
  return '-- Verified staged source: '+path+' ('+sha+')\n'+source.slice(begins[0].index+begins[0][0].length,commits[0].index).trim();
 });
 return '-- ISOLATED REVIEW CANDIDATE ONLY. NOT APPROVAL TO DEPLOY.\nBEGIN;\n'+parts.join('\n\n')+'\nCOMMIT;\n';
}
export function loadAdvancedManifest(){return JSON.parse(readFileSync(new URL('../release/advanced-admin-release-candidate.json',import.meta.url),'utf8'));}
export function readAdvancedSource(path){return readFileSync(new URL('../'+path,import.meta.url),'utf8');}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const args=process.argv.slice(2);
 if(args.length!==0&&(args.length!==2||args[0]!=='--fresh-migrations-json'))fail('usage: [--fresh-migrations-json metadata.json]');
 const fresh=args.length?JSON.parse(readFileSync(args[1],'utf8')):null;
 process.stdout.write(buildAdvancedBundle(loadAdvancedManifest(),readAdvancedSource,fresh));
}
