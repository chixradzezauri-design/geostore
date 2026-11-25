\ir ../../release/phase4-system-error-budget-draft.sql
set role service_role;
do $check$ begin
 perform public.record_system_error('catalogue_render_error',20);
 perform public.record_system_error('sitemap_upstream_error',10);
 begin perform public.record_system_error('browser_runtime_error',1);raise exception 'Budget exceeded without rejection';exception when program_limit_exceeded then null;end;
 begin perform private.prune_system_error_history();raise exception 'Service cleanup exposed';exception when insufficient_privilege then null;end;
end $check$;
reset role;
do $check$ begin
 if (select accepted from private.system_error_write_budget)<>30 then raise exception 'Incorrect global budget';end if;
 if (select sum(observations) from private.system_error_hourly)<>37 then raise exception 'Rejected aggregate mutated history';end if;
 if has_table_privilege('service_role','private.system_error_write_budget','UPDATE') or has_table_privilege('authenticated','private.system_error_write_budget','SELECT') then raise exception 'Budget table exposed';end if;
end $check$;
-- Emulate elapsed minute without sleeping or external calls.
update private.system_error_write_budget set minute_at=minute_at-interval '1 minute';
set role service_role;
select public.record_system_error('catalogue_render_error',1);
reset role;
insert into private.system_error_hourly values(date_trunc('hour',now(),'UTC')-interval '31 days','browser_resource_error',1);
do $check$ begin
 if (select accepted from private.system_error_write_budget)<>1 then raise exception 'Budget did not reset';end if;
 if private.prune_system_error_history()<>1 then raise exception 'Independent retention cleanup failed';end if;
 if has_function_privilege('authenticated','private.prune_system_error_history()','EXECUTE') then raise exception 'Cleanup exposed';end if;
end $check$;
\echo 'PASS phase4 global monitoring budget and independent retention cleanup'
