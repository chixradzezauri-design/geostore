-- Disposable database; simulated JWT only, no live Auth.
\set ON_ERROR_STOP on
do $roles$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin;end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin;end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin;end if;
end $roles$;
create schema private;
create schema auth;
grant usage on schema private to authenticated;
grant usage on schema auth to authenticated,anon;
create table auth.users(id uuid primary key,email_confirmed_at timestamptz);
create function auth.jwt() returns jsonb language sql stable as $j$ select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb) $j$;
create function auth.uid() returns uuid language sql stable as $j$ select nullif(auth.jwt()->>'sub','')::uuid $j$;
-- Reuse the original staff schema and definitions.
\ir ../../supabase/migrations/20261117231455_admin_staff_auth_foundation.sql
alter function public.has_staff_permission(text) set schema private;
alter function public.get_my_admin_access() set schema private;
create function public.has_staff_permission(p_permission text) returns boolean language sql stable security invoker set search_path='' as $fn$ select private.has_staff_permission(p_permission) $fn$;
create function public.get_my_admin_access() returns jsonb language sql stable security invoker set search_path='' as $fn$ select private.get_my_admin_access() $fn$;
revoke all on function public.has_staff_permission(text),public.get_my_admin_access() from public,anon;
grant execute on function public.has_staff_permission(text),public.get_my_admin_access() to authenticated;
create function private.require_purchase_owner() returns uuid language sql stable as $fn$ select auth.uid() $fn$;
revoke all on function private.require_purchase_owner() from public,anon;
grant execute on function private.require_purchase_owner() to authenticated;
insert into auth.users values
 ('1060de3d-d28a-45f8-9a64-5e0368cffc4b',now()),('00000000-0000-4000-8000-000000000001',now()),('00000000-0000-4000-8000-000000000002',now()),
 ('00000000-0000-4000-8000-000000000003',null),('00000000-0000-4000-8000-000000000004',now());
insert into public.admin_staff_members(user_id,email,display_name,role,permissions,is_active) values
 ('00000000-0000-4000-8000-000000000001','staff@example.invalid','Fixture staff','operator','{"orders":true}',true),
 ('00000000-0000-4000-8000-000000000003','unconfirmed@example.invalid','Fixture unconfirmed','operator','{"orders":true}',true),
 ('00000000-0000-4000-8000-000000000004','inactive@example.invalid','Fixture inactive','operator','{"orders":true}',false);
\ir ../../release/phase4-admin-mfa-guard-draft.sql
set role authenticated;
do $checks$
declare owner_id text:='1060de3d-d28a-45f8-9a64-5e0368cffc4b'; staff_id text:='00000000-0000-4000-8000-000000000001'; who text; level text;
begin
 foreach level in array array['aal1','', 'unknown'] loop
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'aal',level,'app_metadata',jsonb_build_object('role','admin'))::text,false);
  if public.has_staff_permission('orders') or (public.get_my_admin_access()->>'is_admin')::boolean then raise exception 'Owner without AAL2 allowed';end if;
  begin perform private.require_purchase_owner();raise exception 'Purchase allowed without AAL2';exception when insufficient_privilege then null;end;
 end loop;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'aal','aal2','app_metadata',jsonb_build_object('role','admin'))::text,false);
 if not public.has_staff_permission('orders') or not (public.get_my_admin_access()->>'is_admin')::boolean or private.require_purchase_owner()::text<>owner_id then raise exception 'Valid owner denied';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',staff_id,'aal','aal1')::text,false);
 if public.has_staff_permission('orders') or (public.get_my_admin_access()->>'is_staff')::boolean then raise exception 'Staff without AAL2 allowed';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',staff_id,'aal','aal2')::text,false);
 if not public.has_staff_permission('orders') or public.has_staff_permission('expenses') or not (public.get_my_admin_access()->>'is_staff')::boolean then raise exception 'Staff permission changed';end if;
 begin perform private.require_purchase_owner();raise exception 'Staff became owner';exception when insufficient_privilege then null;end;
 foreach who in array array['00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004'] loop
  perform set_config('request.jwt.claims',jsonb_build_object('sub',who,'aal','aal2','user_metadata',jsonb_build_object('role','admin'))::text,false);
  if public.has_staff_permission('orders') or (public.get_my_admin_access()->>'is_admin')::boolean or (public.get_my_admin_access()->>'is_staff')::boolean then raise exception 'Non-authorized account elevated';end if;
 end loop;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',staff_id,'aal','aal2','is_anonymous',true)::text,false);
 if public.has_staff_permission('orders') then raise exception 'Anonymous Auth elevated';end if;
 perform set_config('request.jwt.claims','{}',false);
 if public.has_staff_permission('orders') then raise exception 'Missing UID elevated';end if;
end $checks$;
reset role;
do $acl$ begin
 if has_function_privilege('anon','private.admin_session_has_aal2()','EXECUTE') or has_function_privilege('anon','public.has_staff_permission(text)','EXECUTE') then raise exception 'Anon ACL expanded';end if;
end $acl$;
\echo 'PASS phase4 admin MFA isolated owner, staff permission and AAL2 boundary'
