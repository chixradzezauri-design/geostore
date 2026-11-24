// Stage88: exact CRM/support RLS policy DDL from reviewed historical migration.
// Never apply the later dynamic RPC rewrites to a synthetic/Production schema.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
export const OUTPUT='/tmp/stage88-authentic-staff-support-policies.sql';
const file=new URL('../supabase/migrations/20261117231534_staff_crm_support_permissions.sql',import.meta.url);
export function build(){
 const source=readFileSync(file,'utf8');
 const first='DROP POLICY IF EXISTS "Admin can read chat messages" ON public.messages;';
 const marker='DO $staff_support_permissions$';
 const start=source.indexOf(first),end=source.indexOf(marker);
 assert.ok(start>0&&end>start&&source.indexOf(marker,end+marker.length)<0,
  'Stage88 original standalone RLS statements missing or duplicated');
 const sql=source.slice(start,end).trim();
 const creates=[...sql.matchAll(/^CREATE POLICY "([^"]+)"\s*$/gim)].map(m=>m[1]);
 const drops=[...sql.matchAll(/^DROP POLICY IF EXISTS /gim)];
 assert.equal(creates.length,6,'Six actual historical CRM/support RLS policy statements required');
 assert.equal(drops.length,6,'Six original legacy permission removals required');
 assert.deepEqual(creates,[
  'Staff with CRM permission can read chat messages',
  'Staff with CRM permission can update chat messages',
  'Staff with CRM permission can delete chat messages',
  'Staff with support permission can read support tickets',
  'Staff with support permission can update support tickets',
  'Staff with support permission can read support ticket messages'
 ]);
 assert.equal((sql.match(/public\.has_staff_permission\('/g)||[]).length,8,
  'Every original policy using/check must remain server-side');
 assert.doesNotMatch(sql,/\b(?:CREATE OR REPLACE FUNCTION|GRANT EXECUTE|DO \$staff_support_permissions\$)\b/i);
 return '-- Stage88 source-verbatim historical RLS DDL, synthetic LOCAL Supabase only.\n'+sql+'\n';
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 writeFileSync(OUTPUT,build(),{mode:0o600});
 console.log('Stage88 extracted six original staff CRM/support RLS policies for local PostgreSQL');
}
