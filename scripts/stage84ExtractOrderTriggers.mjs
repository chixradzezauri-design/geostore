// Stage84: copy original order-trigger SQL source into disposable local CI.
// This parser never accesses or changes the connected Production database.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const load=name=>readFileSync(new URL('../supabase/migrations/'+name,import.meta.url),'utf8');
const paths=[
 {file:'20261108215548_bind_order_ownership_to_auth_user_uuid.sql',name:'bind_order_to_auth_user',trigger:'orders_bind_auth_user_before_insert'},
 {file:'20261107150014_require_valid_guest_checkout_email.sql',name:'require_valid_guest_checkout_email',trigger:'orders_require_valid_guest_checkout_email'},
 {file:'20261103155226_track_order_status_change_time.sql',name:'set_order_status_changed_at',trigger:'orders_set_status_changed_at'}
];
export const OUTPUT='/tmp/stage84-original-order-triggers.sql';
function uniqueStart(input,pattern){
 const matches=[...input.matchAll(pattern)];
 assert.equal(matches.length,1,'Stage84 refuses missing/duplicate source SQL: '+pattern);
 return matches[0].index;
}
export function extract(input,{name,trigger}){
 const escaped=name.replace(/[^a-z_]/g,'');
 assert.equal(escaped,name);
 const fnStart=uniqueStart(input,new RegExp('create\\s+or\\s+replace\\s+function\\s+private\\.'+name+'\\s*\\(\\s*\\)','ig'));
 const fnEnd=input.indexOf('$function$;',fnStart);
 assert.ok(fnEnd>fnStart,'Stage84 function body did not terminate: '+name);
 const fnSql=input.slice(fnStart,fnEnd+'$function$;'.length);
 assert.match(fnSql,/AS\s+\$function\$/i);
 assert.match(fnSql,/RETURNS?\s+trigger/i);
 const trgStart=uniqueStart(input,new RegExp('drop\\s+trigger\\s+if\\s+exists\\s+'+trigger+'\\s+on\\s+public\\.orders','ig'));
 const call=new RegExp('execute\\s+function\\s+private\\.'+name+'\\s*\\(\\s*\\)\\s*;','ig');
 const calls=[...input.slice(trgStart).matchAll(call)];
 assert.equal(calls.length,1,'Stage84 unexpected original trigger callback count: '+name);
 const trgEnd=trgStart+calls[0].index+calls[0][0].length;
 const trgSql=input.slice(trgStart,trgEnd);
 assert.match(trgSql,new RegExp('create\\s+trigger\\s+'+trigger,'i'));
 const revocation='REVOKE ALL ON FUNCTION private.'+name+'() FROM PUBLIC, anon, authenticated;';
 // Effective Production privileges must remain trigger-only; use local
 // revocation even if original migration positioned it before the trigger DDL.
 return fnSql+'\n\n'+revocation+'\n\n'+trgSql+';\n'.replace(';;',';');
}
export function build(){
 const blocks=paths.map(p=>extract(load(p.file),p));
 const sql='-- Stage84 exact original function/trigger SQL; synthetic local Supabase only.\n'+blocks.join('\n');
 for(const p of paths)assert.match(sql,new RegExp('private\\.'+p.name+'\\(\\)'));
 return sql;
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 writeFileSync(OUTPUT,build(),{mode:0o600});
 console.log('Stage84 extracted 3 Production order trigger sources for local PostgreSQL');
}
