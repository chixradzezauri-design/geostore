-- 4AR unapplied draft, requires 4AQ. Eligibility is NOT authorization.
-- Only the caller's own boolean is returned, even at AAL1.
create function private.admin_mfa_eligible()
returns boolean language plpgsql stable security definer set search_path=''
as $eligibility$
declare v_user uuid:=auth.uid(); v_session text:=auth.jwt()->>'session_id';
begin
 if v_user is null or coalesce(auth.jwt()->>'is_anonymous','false')='true'
 or coalesce(auth.jwt()->>'aal','') not in ('aal1','aal2')
 or v_session is null or v_session !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
  return false;
 end if;
 if not exists(select 1 from auth.sessions s where s.id=v_session::uuid and s.user_id=v_user
  and (s.not_after is null or s.not_after>statement_timestamp())) then return false;end if;
 if v_user='1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
  and coalesce(auth.jwt()->'app_metadata'->>'role','')='admin' then return true;end if;
 return exists(select 1 from auth.users u join public.admin_staff_members m on m.user_id=u.id
  where u.id=v_user and u.email_confirmed_at is not null and m.is_active
  and exists(select 1 from unnest(array['products','orders','analytics','expenses','crm','support','settings']) p(key)
   where m.permissions->>p.key='true'));
end;
$eligibility$;
create function public.admin_mfa_eligible()
returns boolean language sql stable security invoker set search_path=''
as $rpc$ select private.admin_mfa_eligible() $rpc$;
revoke all on function private.admin_mfa_eligible(),public.admin_mfa_eligible() from public,anon,authenticated,service_role;
grant execute on function private.admin_mfa_eligible(),public.admin_mfa_eligible() to authenticated;
