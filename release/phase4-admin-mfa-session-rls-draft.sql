-- 4AQ unapplied draft; apply after 4AN/4AO/4AP only in a reviewed transaction.
-- Validate the verified JWT against its current Auth session. Do not grant
-- direct access to auth.sessions. Actual hosted Auth AAL lifecycle is a gate.
create or replace function private.admin_session_has_aal2()
returns boolean language plpgsql stable security definer set search_path=''
as $guard$
declare v_user uuid:=auth.uid(); v_session text:=auth.jwt()->>'session_id';
begin
 if v_user is null or coalesce(auth.jwt()->>'is_anonymous','false')='true'
 or coalesce(auth.jwt()->>'aal','')<>'aal2'
 or v_session is null or v_session !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
  return false;
 end if;
 return exists(select 1 from auth.sessions s where s.id=v_session::uuid and s.user_id=v_user
  and s.aal::text='aal2' and (s.not_after is null or s.not_after>statement_timestamp()));
end;
$guard$;
revoke all on function private.admin_session_has_aal2() from public,anon,authenticated,service_role;
grant execute on function private.admin_session_has_aal2() to authenticated;
-- Owner-only tables: restrictive policies cannot widen existing permission rules.
create policy "Phase4 admin MFA boundary" on public.admin_purchase_lines
 as restrictive for all to authenticated
 using ((select private.admin_session_has_aal2()))
 with check ((select private.admin_session_has_aal2()));
create policy "Phase4 admin MFA boundary" on public.admin_purchase_orders
 as restrictive for all to authenticated
 using ((select private.admin_session_has_aal2()))
 with check ((select private.admin_session_has_aal2()));
create policy "Phase4 admin MFA boundary" on public.admin_purchase_receipts
 as restrictive for all to authenticated
 using ((select private.admin_session_has_aal2()))
 with check ((select private.admin_session_has_aal2()));
create policy "Phase4 admin MFA boundary" on public.admin_suppliers
 as restrictive for all to authenticated
 using ((select private.admin_session_has_aal2()))
 with check ((select private.admin_session_has_aal2()));
-- Only DELETE; preserve the independent published storefront SELECT policy.
create policy "Phase4 storefront delete MFA boundary" on public.storefront_config
 as restrictive for delete to authenticated
 using ((select private.admin_session_has_aal2()));
-- Self-only boolean for the privileged staff Edge endpoint. The user's
-- bearer JWT (not the service-role token) must invoke this RPC.
create function public.admin_staff_mfa_verified()
returns boolean language sql stable security invoker set search_path=''
as $check$
 select auth.uid()='1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
 and coalesce(auth.jwt()->'app_metadata'->>'role','')='admin'
 and private.admin_session_has_aal2()
$check$;
revoke all on function public.admin_staff_mfa_verified() from public,anon,authenticated,service_role;
grant execute on function public.admin_staff_mfa_verified() to authenticated;
