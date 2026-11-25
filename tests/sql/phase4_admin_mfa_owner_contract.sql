-- Runs after the 4AN isolated authorization fixture. No live data.
create table public.orders(id text primary key,status text,stock_restored_at timestamptz,stock_deducted_at timestamptz,items jsonb,status_changed_at timestamptz);
create table public.products(id text primary key,stock integer,variants jsonb);
create table private.admin_panel_visual_settings(singleton boolean primary key,design jsonb,updated_by uuid,updated_at timestamptz);
create table private.admin_activity_log(id bigint primary key,action text,created_at timestamptz);
alter table auth.users add column email text;
create table private.marketing_email_consent_events(event_id uuid,user_id uuid,sequence_id bigint,opted_in boolean,email_fingerprint text,verified_email_confirmed_at timestamptz);
create function private.marketing_email_fingerprint(text) returns text language sql immutable as $fp$ select md5($1) $fp$;
insert into public.products values('fixture-product',10,'[]');
insert into public.orders values('cancelled','გაუქმებული',now(),now(),'[{"id":"fixture-product","quantity":2}]',now()),('completed','დასრულებული',null,now(),'[]',now());
insert into private.admin_panel_visual_settings values(true,'{"fixture":true}',null,now());
insert into private.admin_activity_log values(1,'fixture',now());
\ir phase4_admin_mfa_owner_original_fixture.sql
revoke all on function private.admin_reactivate_cancelled_order(text) from public,anon;
grant execute on function private.admin_reactivate_cancelled_order(text) to authenticated;
revoke all on function private.admin_reopen_completed_order(text) from public,anon;
grant execute on function private.admin_reopen_completed_order(text) to authenticated;
revoke all on function private.get_admin_panel_visual_design() from public,anon;
grant execute on function private.get_admin_panel_visual_design() to authenticated;
revoke all on function private.get_admin_panel_visual_design_state() from public,anon;
grant execute on function private.get_admin_panel_visual_design_state() to authenticated;
revoke all on function private.list_admin_activity_logs(integer) from public,anon;
grant execute on function private.list_admin_activity_logs(integer) to authenticated;
revoke all on function private.read_admin_marketing_consent_summary() from public,anon;
grant execute on function private.read_admin_marketing_consent_summary() to authenticated;
revoke all on function private.save_admin_panel_visual_design(jsonb) from public,anon;
grant execute on function private.save_admin_panel_visual_design(jsonb) to authenticated;
revoke all on function private.save_admin_panel_visual_design_state(jsonb,timestamp with time zone) from public,anon;
grant execute on function private.save_admin_panel_visual_design_state(jsonb,timestamp with time zone) to authenticated;
begin;
\ir ../../release/phase4-admin-mfa-owner-rpcs-draft.sql
commit;
set role authenticated;
do $checks$
declare owner_id text:='1060de3d-d28a-45f8-9a64-5e0368cffc4b'; valid_claims jsonb; stamp timestamptz; answer jsonb;
begin
 valid_claims:=jsonb_build_object('sub',owner_id,'aal','aal2','app_metadata',jsonb_build_object('role','admin'),'amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',extract(epoch from now())::bigint)));
 perform set_config('request.jwt.claims',(valid_claims||'{"aal":"aal1"}'::jsonb)::text,false);
 begin perform private.admin_reactivate_cancelled_order('cancelled');raise exception 'AAL1 allowed RPC 1';exception when insufficient_privilege then null;end;
 begin perform private.admin_reopen_completed_order('completed');raise exception 'AAL1 allowed RPC 2';exception when insufficient_privilege then null;end;
 begin perform private.get_admin_panel_visual_design();raise exception 'AAL1 allowed RPC 3';exception when insufficient_privilege then null;end;
 begin perform private.get_admin_panel_visual_design_state();raise exception 'AAL1 allowed RPC 4';exception when insufficient_privilege then null;end;
 begin perform private.list_admin_activity_logs(10);raise exception 'AAL1 allowed RPC 5';exception when insufficient_privilege then null;end;
 begin perform private.read_admin_marketing_consent_summary();raise exception 'AAL1 allowed RPC 6';exception when insufficient_privilege then null;end;
 begin perform private.save_admin_panel_visual_design('{"changed":true}'::jsonb);raise exception 'AAL1 allowed RPC 7';exception when insufficient_privilege then null;end;
 begin perform private.save_admin_panel_visual_design_state('{"changed":true}'::jsonb,null);raise exception 'AAL1 allowed RPC 8';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims',jsonb_set(valid_claims,'{sub}',to_jsonb('00000000-0000-4000-8000-000000000001'::text))::text,false);
 begin perform private.get_admin_panel_visual_design();raise exception 'Staff elevated to owner';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims',(valid_claims||'{"amr":[]}'::jsonb)::text,false);
 begin
  perform private.admin_reopen_completed_order('completed');
  raise exception 'Missing fresh password accepted';
 exception when raise_exception then
  if sqlerrm='Missing fresh password accepted' then raise;end if;
 end;
 perform set_config('request.jwt.claims',valid_claims::text,false);
 if private.get_admin_panel_visual_design() is distinct from '{"fixture":true}'::jsonb then raise exception 'Original design read changed';end if;
 stamp:=(private.get_admin_panel_visual_design_state()->>'updated_at')::timestamptz;
 answer:=private.save_admin_panel_visual_design_state('{"fixture":2}',stamp);
 if answer->'design' is distinct from '{"fixture":2}'::jsonb then raise exception 'Design CAS failed';end if;
 begin perform private.save_admin_panel_visual_design_state('{"fixture":3}',stamp);raise exception 'Stale design accepted';exception when serialization_failure then null;end;
 if private.save_admin_panel_visual_design('{"fixture":4}') is distinct from '{"fixture":4}'::jsonb then raise exception 'Legacy save changed';end if;
 if (select count(*) from private.list_admin_activity_logs(10))<>1 then raise exception 'Activity read changed';end if;
 if private.read_admin_marketing_consent_summary()->>'total' is distinct from '5' then raise exception 'Consent summary changed';end if;
 answer:=private.admin_reopen_completed_order('completed');
 if answer->>'stock_unchanged' is distinct from 'true' then raise exception 'Reopening changed stock contract';end if;
 answer:=private.admin_reactivate_cancelled_order('cancelled');
 if answer->>'stock_deducted' is distinct from 'true' then raise exception 'Reactivation changed stock contract';end if;
end $checks$;
reset role;
do $verify$ begin
 if (select stock from public.products where id='fixture-product')<>8 then raise exception 'Stock changed incorrectly';end if;
 if exists(select 1 from public.orders where status<>'ახალი') then raise exception 'Order status regression';end if;
 if has_function_privilege('anon','private.admin_reactivate_cancelled_order(text)','EXECUTE') or not has_function_privilege('authenticated','private.admin_reactivate_cancelled_order(text)','EXECUTE') then raise exception 'RPC ACL changed';end if;
 if has_function_privilege('anon','private.admin_reopen_completed_order(text)','EXECUTE') or not has_function_privilege('authenticated','private.admin_reopen_completed_order(text)','EXECUTE') then raise exception 'RPC ACL changed';end if;
 if has_function_privilege('anon','private.get_admin_panel_visual_design()','EXECUTE') or not has_function_privilege('authenticated','private.get_admin_panel_visual_design()','EXECUTE') then raise exception 'RPC ACL changed';end if;
 if has_function_privilege('anon','private.get_admin_panel_visual_design_state()','EXECUTE') or not has_function_privilege('authenticated','private.get_admin_panel_visual_design_state()','EXECUTE') then raise exception 'RPC ACL changed';end if;
 if has_function_privilege('anon','private.list_admin_activity_logs(integer)','EXECUTE') or not has_function_privilege('authenticated','private.list_admin_activity_logs(integer)','EXECUTE') then raise exception 'RPC ACL changed';end if;
 if has_function_privilege('anon','private.read_admin_marketing_consent_summary()','EXECUTE') or not has_function_privilege('authenticated','private.read_admin_marketing_consent_summary()','EXECUTE') then raise exception 'RPC ACL changed';end if;
 if has_function_privilege('anon','private.save_admin_panel_visual_design(jsonb)','EXECUTE') or not has_function_privilege('authenticated','private.save_admin_panel_visual_design(jsonb)','EXECUTE') then raise exception 'RPC ACL changed';end if;
 if has_function_privilege('anon','private.save_admin_panel_visual_design_state(jsonb,timestamp with time zone)','EXECUTE') or not has_function_privilege('authenticated','private.save_admin_panel_visual_design_state(jsonb,timestamp with time zone)','EXECUTE') then raise exception 'RPC ACL changed';end if;
end $verify$;
\echo 'PASS phase4 eight independent owner RPC AAL2 guards and preserved business rules'
