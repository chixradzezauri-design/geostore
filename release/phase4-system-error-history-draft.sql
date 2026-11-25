-- Unapplied monitoring contract. Requires 4AQ session guard.
-- Browser clients cannot write directly. A future trusted, rate-limited
-- ingestion service may submit allowlisted aggregates only.
create table private.system_error_hourly(
 hour_at timestamptz not null,
 code text not null check(code in ('browser_runtime_error','browser_resource_error','browser_unhandled_rejection','react_root_render_error','react_admin_render_error','catalogue_upstream_error','catalogue_render_error','sitemap_upstream_error')),
 observations integer not null check(observations between 1 and 1000000),
 primary key(hour_at,code)
);
alter table private.system_error_hourly enable row level security;
revoke all on private.system_error_hourly from public,anon,authenticated,service_role;
create function private.record_system_error(p_code text,p_count integer)
returns void language plpgsql security definer set search_path=''
as $fn$
declare bucket timestamptz:=date_trunc('hour',statement_timestamp(),'UTC');
begin
 if current_setting('role',true) is distinct from 'service_role' then raise exception 'Service required' using errcode='42501';end if;
 if p_code is null or p_code not in ('browser_runtime_error','browser_resource_error','browser_unhandled_rejection','react_root_render_error','react_admin_render_error','catalogue_upstream_error','catalogue_render_error','sitemap_upstream_error') or p_count is null or p_count not between 1 and 1000 then
  raise exception 'Invalid error aggregate' using errcode='22023';
 end if;
 -- Serialize pruning and aggregation; bound historical data on each write.
 perform pg_advisory_xact_lock(42025,1);
 delete from private.system_error_hourly where hour_at<bucket-interval '30 days';
 insert into private.system_error_hourly(hour_at,code,observations) values(bucket,p_code,p_count)
 on conflict(hour_at,code) do update set observations=least(1000000,private.system_error_hourly.observations+excluded.observations);
end;
$fn$;
create function public.record_system_error(p_code text,p_count integer)
returns void language sql security invoker set search_path=''
as $fn$ select private.record_system_error(p_code,p_count) $fn$;
create function private.read_system_error_history(p_hours integer)
returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
begin
 if not private.admin_session_has_aal2()
 or auth.uid() is distinct from '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
 or coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' then
  raise exception 'Owner required' using errcode='42501';
 end if;
 if p_hours is null or p_hours not between 1 and 168 then raise exception 'Invalid history range' using errcode='22023';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('hour_at',hour_at,'code',code,'observations',observations) order by hour_at desc,code)
 from private.system_error_hourly where hour_at>=date_trunc('hour',statement_timestamp(),'UTC')-make_interval(hours=>p_hours-1)
 and hour_at<=date_trunc('hour',statement_timestamp(),'UTC')),'[]'::jsonb);
end;
$fn$;
create function public.read_system_error_history(p_hours integer)
returns jsonb language sql stable security invoker set search_path=''
as $fn$ select private.read_system_error_history(p_hours) $fn$;
revoke all on function private.record_system_error(text,integer),public.record_system_error(text,integer),private.read_system_error_history(integer),public.read_system_error_history(integer) from public,anon,authenticated,service_role;
grant execute on function private.record_system_error(text,integer),public.record_system_error(text,integer) to service_role;
grant execute on function private.read_system_error_history(integer),public.read_system_error_history(integer) to authenticated;
