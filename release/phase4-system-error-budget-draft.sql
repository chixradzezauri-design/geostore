-- Unapplied 4BB draft, after 4AY. Global budget across server instances.
create table private.system_error_write_budget(
 singleton boolean primary key check(singleton),
 minute_at timestamptz not null,
 accepted integer not null check(accepted between 0 and 30)
);
alter table private.system_error_write_budget enable row level security;
revoke all on private.system_error_write_budget from public,anon,authenticated,service_role;
create or replace function private.record_system_error(p_code text,p_count integer)
returns void language plpgsql security definer set search_path=''
as $fn$
declare bucket timestamptz:=date_trunc('hour',statement_timestamp(),'UTC');
 minute_bucket timestamptz:=date_trunc('minute',statement_timestamp(),'UTC');
 budget_count integer;
begin
 if current_setting('role',true) is distinct from 'service_role' then raise exception 'Service required' using errcode='42501';end if;
 if p_code is null or p_code not in ('browser_runtime_error','browser_resource_error','browser_unhandled_rejection','react_root_render_error','react_admin_render_error','catalogue_upstream_error','catalogue_render_error','sitemap_upstream_error') or p_count is null or p_count not between 1 and 1000 then
  raise exception 'Invalid error aggregate' using errcode='22023';
 end if;
 -- Reject immediately under contention; diagnostics must not queue.
 if not pg_try_advisory_xact_lock(42025,1) then raise exception 'Monitoring busy' using errcode='55P03';end if;
 insert into private.system_error_write_budget values(true,minute_bucket,0) on conflict(singleton) do nothing;
 update private.system_error_write_budget set minute_at=minute_bucket,accepted=0 where minute_at<minute_bucket;
 select accepted into budget_count from private.system_error_write_budget where singleton;
 if budget_count+p_count>30 then raise exception 'Monitoring budget exceeded' using errcode='54000';end if;
 update private.system_error_write_budget set accepted=accepted+p_count where singleton;
 delete from private.system_error_hourly where hour_at<bucket-interval '30 days';
 insert into private.system_error_hourly(hour_at,code,observations) values(bucket,p_code,p_count)
 on conflict(hour_at,code) do update set observations=least(1000000,private.system_error_hourly.observations+excluded.observations);
end;
$fn$;
-- A database-owner scheduled job may invoke this private function even if no
-- telemetry arrives. Do not expose it through the Data API.
create function private.prune_system_error_history()
returns integer language plpgsql security invoker set search_path=''
as $fn$
declare removed integer;
begin
 if not pg_try_advisory_xact_lock(42025,1) then return 0;end if;
 delete from private.system_error_hourly where hour_at<date_trunc('hour',statement_timestamp(),'UTC')-interval '30 days';
 get diagnostics removed=row_count;
 return removed;
end;
$fn$;
revoke all on function private.prune_system_error_history() from public,anon,authenticated,service_role;
