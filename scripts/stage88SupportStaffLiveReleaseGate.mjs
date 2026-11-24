/** Stage88: offline support/staff RLS and legacy/new admin cutover release gate.
 * Uses only frozen metadata and checked-in versioned sources. No live SQL/write.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {gitBlobSha} from './stage72ReconciledReleaseGate.mjs';
import {verifyStage87} from './stage87PhaseAPreflightHighRiskGate.mjs';
import {build as originalPolicies} from './stage88ExtractStaffSupportPolicies.mjs';
const SNAP_SHA='da130644e7f258533929455cd220148b1080253f';
const source=new URL('../release/stage88-live-support-staff-surface.json',import.meta.url);
const frozen=JSON.parse(readFileSync(source,'utf8'));
const stage82=JSON.parse(readFileSync(new URL('../release/stage82-live-effective-schema-surface.json',import.meta.url),'utf8'));
const phase=JSON.parse(readFileSync(new URL('../release/stage72-production-history-baseline.json',import.meta.url),'utf8'));
const get=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const reject=why=>{throw Error('Stage88 support/staff/Phase B release BLOCKED: '+why)};
const demand=(truth,why)=>{if(!truth)reject(why)};
const md5=s=>typeof s==='string'&&/^[0-9a-f]{32}$/.test(s);
const keySort=obj=>Array.isArray(obj)?obj.map(keySort):
 obj&&typeof obj==='object'?Object.fromEntries(Object.entries(obj).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,keySort(v)])):obj;
const comparable=(a,b)=>isDeepStrictEqual(keySort(a),keySort(b));
export function verifyNewFrontendEntrypoints({app=get('src/App.jsx'),
 admin=get('src/components/AdminDashboardPro.jsx'),
 loader=get('src/utils/adminOrderLedgerSafety.js')}={}){
 demand(app.includes('fetchVerifiedAdminOrderLedger({')&&
  app.includes("from './utils/adminOrderLedgerSafety.js'"),
  'new admin order UI must consume session-verified paginated RPC loader');
 demand(loader.includes('/rest/v1/rpc/admin_order_ledger_page')&&
  loader.includes('/rest/v1/rpc/has_staff_permission')&&
  loader.includes("p_permission: 'orders'")&&
  loader.includes("p_permission: 'expenses'"),
  'order projection must enforce signed orders and finance-scoped staff permissions');
 demand(admin.includes('/rest/v1/rpc/admin_order_image_refs_page')&&
  admin.includes("callStaffAdminApi({ action: 'list' })"),
  'new admin product image usage and staff management must use scoped RPC/server API');
 for(const [name,text] of [['App',app],['AdminDashboard',admin]]){
  demand(!/\.from\s*\(\s*['"]orders['"]\s*\)/.test(text)&&
   !/\/rest\/v1\/orders\?select\s*=\s*\*/.test(text),
   'new '+name+' contains legacy raw order SELECT code; Phase B migration would break it');
 }
 return true;
}
export function verifyStage88({observed=frozen,freshSurface=null}={}){
 demand(gitBlobSha(readFileSync(source,'utf8'))===SNAP_SHA,
  'frozen effective Production support metadata Git blob modified');
 verifyStage87();
 demand(observed.schema===1&&observed.projectId==='xmtnszxtnfxnrojionoa'&&
  observed.capturedDate==='2026-11-24'&&observed.phase==='PRE_PHASE_A'&&
  observed.historyMd5==='4f09258df9fbd7b415cc2d3dc5ffbe6f',
  'Production source/date or Phase A applied state changed');
 demand(Array.isArray(phase.phasedSources)&&phase.phasedSources.length===4&&
  phase.phasedSources[0].phase==='A'&&phase.phasedSources[1].phase==='A'&&
  phase.phasedSources[2].phase==='A'&&phase.phasedSources[3].phase==='B',
  'old/new frontend controlled Phase A then Phase B sequence changed');
 const s=observed.supportSurface;
 demand(Array.isArray(s?.tables)&&s.tables.length===5&&
  Array.isArray(s.policies)&&s.policies.length===7&&
  Array.isArray(s.rpcs)&&s.rpcs.length===16,
  'five protected tables, seven RLS policies, 16 support/permission RPCs must remain reviewed');
 const t=new Map(s.tables.map(x=>[x.name,x]));
 demand(t.size===5,'support/CRM/staff table duplicated');
 for(const name of ['public.admin_staff_members','public.admin_staff_pending_invites']){
  const row=t.get(name);
  demand(row?.rls===true&&row.forced===true&&
   row.anonSelect===false&&row.authenticatedSelect===false&&
   row.authenticatedUpdate===false&&row.authenticatedDelete===false,
   'server-only staff records exposed: '+name);
 }
 for(const name of ['public.messages','public.support_tickets','public.support_ticket_messages']){
  const row=t.get(name);
  demand(row?.rls===true&&row.anonSelect===false&&row.authenticatedSelect===true,
   'support/CRM RLS protected authenticated client access changed: '+name);
 }
 const policies=new Map(s.policies.map(x=>[x.name,x]));
 demand(policies.size===7,'duplicate support/CRM policies');
 const wanted=[
  ['Staff with CRM permission can delete chat messages','public.messages','DELETE','190ed8f6308ae82f7264099e38974dee'],
  ['Staff with CRM permission can read chat messages','public.messages','SELECT','190ed8f6308ae82f7264099e38974dee'],
  ['Staff with CRM permission can update chat messages','public.messages','UPDATE','190ed8f6308ae82f7264099e38974dee'],
  ['Staff with support permission can read support ticket messages','public.support_ticket_messages','SELECT','c0ddc486653df8d967b6aa1522ed1a9d'],
  ['Staff with support permission can read support tickets','public.support_tickets','SELECT','c0ddc486653df8d967b6aa1522ed1a9d'],
  ['Staff with support permission can update support tickets','public.support_tickets','UPDATE','c0ddc486653df8d967b6aa1522ed1a9d']
 ];
 const extracted=originalPolicies();
 for(const [name,table,cmd,hash] of wanted){
  const p=policies.get(name);
  demand(p?.table===table&&p.cmd===cmd&&
   Array.isArray(p.roles)&&p.roles.length===1&&p.roles[0]==='authenticated'&&
   p.usingMd5===hash&&md5(p.checkMd5)&&
   extracted.includes('CREATE POLICY "'+name+'"'),
   'original live staff CRM/support RLS policy differs: '+name);
  if(cmd==='UPDATE')
   demand(p.checkMd5===hash,'staff UPDATE RLS WITH CHECK scope changed: '+name);
 }
 const visitor=policies.get('Visitors can submit validated support tickets');
 demand(visitor?.table==='public.support_tickets'&&visitor.cmd==='INSERT'&&
  comparable(visitor.roles,['anon','authenticated'])&&
  visitor.usingMd5==='d41d8cd98f00b204e9800998ecf8427e'&&
  visitor.checkMd5==='d920b74e35dc2afa0f0ccc6fa3db01be',
  'guest support submit policy changed or visitor access was lost');
 const rpcs=new Map(s.rpcs.map(x=>[x.sig,x]));
 demand(rpcs.size===16,'duplicate support/staff RPC signature');
 const catalog=new Map(stage82.surface.functions.map(x=>[x.signature,x]));
 for(const [signature,v] of rpcs){
  const prev=catalog.get(signature);
  demand(Boolean(prev)&&v.md5===prev.definition_md5&&
   v.definer===prev.definer&&
   v.anon===prev.anon_execute&&v.authenticated===prev.authenticated_execute&&
   v.pathLocked===true,
   'support/staff AUTH RPC definition or grant mismatch: '+signature);
  demand(signature.startsWith('public.') ? v.definer===false : v.definer===true,
   'public support RPC escalates privileges directly: '+signature);
 }
 for(const name of ['public.has_staff_permission(text)','private.has_staff_permission(text)',
  'public.get_my_support_tickets(integer)','public.get_support_ticket_unread_counts()']){
  const entry=rpcs.get(name);
  demand(entry?.anon===false&&entry.authenticated===true,
   'authenticated-only module or history RPC no longer locked: '+name);
 }
 for(const name of ['public.get_support_ticket_messages(text,text)',
  'private.get_support_ticket_messages(text,text)',
  'public.create_support_ticket(text,text,text,text,text,text)']){
  const entry=rpcs.get(name);
  demand(entry?.anon===true&&entry.authenticated===true,
   'guest-support token-gated endpoint access changed: '+name);
 }
 verifyNewFrontendEntrypoints();
 const wf=get('.github/workflows/stage78-free-supabase-auth-postgrest.yml');
 demand(wf.includes('stage88SignedSupportStaffHttp.mjs')&&
  wf.includes('stage88-support-staff-rls.sql')&&
  wf.includes('stage88ExtractStaffSupportPolicies.mjs'),
  'signed staff CRM/support RLS HTTP rehearsal missing from CI');
 if(freshSurface!==null){
  const input=Array.isArray(freshSurface)&&freshSurface.length===1?freshSurface[0]:freshSurface;
  const actual=input?.snapshot!==undefined?
   typeof input.snapshot==='string'?JSON.parse(input.snapshot):input.snapshot:input;
  demand(comparable(actual,s),
   'fresh Production staff/support RLS catalog differs from pinned snapshot');
 }
 return {result:'SUPPORT_STAFF_LIVE_METADATA_AND_LOCAL_ROLE_CUTOVER__RELEASE_STILL_BLOCKED',
  tables:5,rlsPolicies:7,rpcs:16,
  originalStaffRlsPolicies:6,phaseA:3,phaseB:1,
  browserLegacyRawOrderReadsRequirePhaseBDelay:true,
  warning:'Metadata and synthetic signed HTTP tests only. Support owner/visitor ticket-token full-schema flows and historic SQL drift remain release blockers. Production unchanged.'};
}
function main(){
 const args=process.argv.slice(2);
 let result;
 if(args.length===1&&args[0]==='--verify-pinned')result=verifyStage88();
 else if(args.length===2&&args[0]==='--fresh-support-surface-json')
  result=verifyStage88({freshSurface:JSON.parse(readFileSync(resolve(args[1]),'utf8'))});
 else reject('Use --verify-pinned or --fresh-support-surface-json FILE');
 console.log(JSON.stringify(result,null,2));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{main()}catch(e){console.error(e.message);process.exitCode=2}
}
