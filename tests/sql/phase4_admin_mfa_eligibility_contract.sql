-- After 4AQ test, whose valid owner session was deliberately deleted.
insert into auth.sessions(id,user_id,aal,not_after) values
 ('00000000-0000-4000-8000-000000000201','1060de3d-d28a-45f8-9a64-5e0368cffc4b','aal1',null),
 ('00000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000001','aal1',null),
 ('00000000-0000-4000-8000-000000000203','00000000-0000-4000-8000-000000000002','aal1',null),
 ('00000000-0000-4000-8000-000000000204','00000000-0000-4000-8000-000000000003','aal1',null),
 ('00000000-0000-4000-8000-000000000205','00000000-0000-4000-8000-000000000004','aal1',null);
\ir ../../release/phase4-admin-mfa-eligibility-draft.sql
set role authenticated;
do $test$
declare claims jsonb; i integer; principal text; session_id text;
begin
 claims:='{"sub":"1060de3d-d28a-45f8-9a64-5e0368cffc4b","aal":"aal1","session_id":"00000000-0000-4000-8000-000000000201","app_metadata":{"role":"admin"}}';
 perform set_config('request.jwt.claims',claims::text,false);
 if public.admin_mfa_eligible() is distinct from true or public.has_staff_permission('orders') or (public.get_my_admin_access()->>'is_admin')::boolean then raise exception 'Owner eligibility leaked authorization';end if;
 perform set_config('request.jwt.claims',(claims||'{"is_anonymous":true}'::jsonb)::text,false);
 if public.admin_mfa_eligible() then raise exception 'Anonymous eligible';end if;
 perform set_config('request.jwt.claims',(claims||'{"session_id":"00000000-0000-4000-8000-000000000202"}'::jsonb)::text,false);
 if public.admin_mfa_eligible() then raise exception 'Foreign session eligible';end if;
 for i in 1..4 loop
  principal:='00000000-0000-4000-8000-'||lpad(i::text,12,'0');
  session_id:='00000000-0000-4000-8000-'||lpad((201+i)::text,12,'0');
  perform set_config('request.jwt.claims',jsonb_build_object('sub',principal,'aal','aal1','session_id',session_id,'user_metadata',jsonb_build_object('role','admin'))::text,false);
  if public.admin_mfa_eligible() is distinct from (i=1) then raise exception 'Wrong staff eligibility for fixture %',i;end if;
  if public.has_staff_permission('orders') then raise exception 'AAL1 permission leaked';end if;
 end loop;
end $test$;
reset role;
do $acl$ begin
 if has_function_privilege('anon','public.admin_mfa_eligible()','EXECUTE') or has_function_privilege('anon','private.admin_mfa_eligible()','EXECUTE') then raise exception 'Eligibility ACL expanded';end if;
end $acl$;
\echo 'PASS phase4 pre-MFA eligibility is separate from effective authorization'
