-- Reuse isolated MFA fixture; no live credentials, data, or API.
grant usage on schema private to service_role;
\ir ../../release/phase4-system-error-history-draft.sql
insert into private.system_error_hourly values(date_trunc('hour',now(),'UTC')-interval '31 days','browser_runtime_error',1);
set role service_role;
select public.record_system_error('browser_runtime_error',3);
select public.record_system_error('browser_runtime_error',4);
do $test$ begin
 begin perform public.record_system_error('raw email or token',1);raise exception 'Invalid event accepted';exception when invalid_parameter_value then null;end;
 begin perform public.record_system_error('browser_runtime_error',1001);raise exception 'Oversized event accepted';exception when invalid_parameter_value then null;end;
 begin perform public.read_system_error_history(24);raise exception 'Service read unexpectedly granted';exception when insufficient_privilege then null;end;
end $test$;
reset role;
do $check$ begin
 if (select count(*) from private.system_error_hourly)<>1 or (select observations from private.system_error_hourly)<>7 then raise exception 'Aggregate or pruning failed';end if;
 if has_table_privilege('authenticated','private.system_error_hourly','SELECT,INSERT') or has_table_privilege('service_role','private.system_error_hourly','INSERT') or has_function_privilege('anon','public.read_system_error_history(integer)','EXECUTE') then raise exception 'Unexpected privilege';end if;
end $check$;
insert into auth.sessions values('00000000-0000-4000-8000-000000000301','1060de3d-d28a-45f8-9a64-5e0368cffc4b','aal2',null);
set role authenticated;
do $check$
declare claims jsonb:='{"sub":"1060de3d-d28a-45f8-9a64-5e0368cffc4b","aal":"aal2","session_id":"00000000-0000-4000-8000-000000000301","app_metadata":{"role":"admin"}}'; result jsonb;
begin
 perform set_config('request.jwt.claims',(claims||'{"aal":"aal1"}'::jsonb)::text,false);
 begin perform public.read_system_error_history(24);raise exception 'AAL1 history exposed';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","aal":"aal2","session_id":"00000000-0000-4000-8000-000000000104"}',false);
 begin perform public.read_system_error_history(24);raise exception 'Staff history exposed';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claims',claims::text,false);
 result:=public.read_system_error_history(24);
 if jsonb_array_length(result)<>1 or result->0->>'observations'<>'7' then raise exception 'Incorrect owner history';end if;
 begin perform public.record_system_error('browser_runtime_error',1);raise exception 'Browser write granted';exception when insufficient_privilege then null;end;
 begin perform public.read_system_error_history(169);raise exception 'Range unbounded';exception when invalid_parameter_value then null;end;
end $check$;
reset role;
\echo 'PASS phase4 system monitoring bounded aggregate, retention and owner authorization'
