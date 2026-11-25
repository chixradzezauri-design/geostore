-- Isolated mock Auth sessions following earlier AAL2 fixtures; no hosted Auth.
create table auth.sessions(id uuid primary key,user_id uuid not null,aal text,not_after timestamptz);
insert into auth.sessions values
 ('00000000-0000-4000-8000-000000000101','1060de3d-d28a-45f8-9a64-5e0368cffc4b','aal2',null),
 ('00000000-0000-4000-8000-000000000102','1060de3d-d28a-45f8-9a64-5e0368cffc4b','aal1',null),
 ('00000000-0000-4000-8000-000000000103','1060de3d-d28a-45f8-9a64-5e0368cffc4b','aal2',now()-interval '1 minute'),
 ('00000000-0000-4000-8000-000000000104','00000000-0000-4000-8000-000000000001','aal2',null);
create table public.admin_purchase_lines(id integer primary key);
alter table public.admin_purchase_lines enable row level security;
grant select on public.admin_purchase_lines to authenticated;
insert into public.admin_purchase_lines values(1);
create policy fixture_owner_read on public.admin_purchase_lines for select to authenticated using(auth.uid()='1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid and auth.jwt()->'app_metadata'->>'role'='admin');
create table public.admin_purchase_orders(id integer primary key);
alter table public.admin_purchase_orders enable row level security;
grant select on public.admin_purchase_orders to authenticated;
insert into public.admin_purchase_orders values(1);
create policy fixture_owner_read on public.admin_purchase_orders for select to authenticated using(auth.uid()='1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid and auth.jwt()->'app_metadata'->>'role'='admin');
create table public.admin_purchase_receipts(id integer primary key);
alter table public.admin_purchase_receipts enable row level security;
grant select on public.admin_purchase_receipts to authenticated;
insert into public.admin_purchase_receipts values(1);
create policy fixture_owner_read on public.admin_purchase_receipts for select to authenticated using(auth.uid()='1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid and auth.jwt()->'app_metadata'->>'role'='admin');
create table public.admin_suppliers(id integer primary key);
alter table public.admin_suppliers enable row level security;
grant select on public.admin_suppliers to authenticated;
insert into public.admin_suppliers values(1);
create policy fixture_owner_read on public.admin_suppliers for select to authenticated using(auth.uid()='1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid and auth.jwt()->'app_metadata'->>'role'='admin');
grant insert,update on public.admin_suppliers to authenticated;
create policy fixture_supplier_write on public.admin_suppliers for all to authenticated
 using(auth.uid()='1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid and auth.jwt()->'app_metadata'->>'role'='admin')
 with check(auth.uid()='1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid and auth.jwt()->'app_metadata'->>'role'='admin');
create table public.storefront_config(id integer primary key,is_published boolean);
alter table public.storefront_config enable row level security;
grant select on public.storefront_config to anon,authenticated;
grant delete on public.storefront_config to authenticated;
insert into public.storefront_config values(1,true),(2,false);
create policy fixture_public_read on public.storefront_config for select to anon,authenticated using(is_published);
create policy fixture_admin_read on public.storefront_config for select to authenticated using(public.has_staff_permission('settings'));
create policy fixture_owner_delete on public.storefront_config for delete to authenticated using(auth.uid()='1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid and auth.jwt()->'app_metadata'->>'role'='admin');
begin;
\ir ../../release/phase4-admin-mfa-session-rls-draft.sql
commit;
set role authenticated;
do $test$
declare claims jsonb; s text; n integer;
begin
 claims:=jsonb_build_object('sub','1060de3d-d28a-45f8-9a64-5e0368cffc4b','aal','aal2','app_metadata',jsonb_build_object('role','admin'));
 foreach s in array array['bad','00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000104','00000000-0000-4000-8000-000000000999'] loop
  perform set_config('request.jwt.claims',(claims||jsonb_build_object('session_id',s))::text,false);
  if private.admin_session_has_aal2() or public.admin_staff_mfa_verified() or public.has_staff_permission('orders') then raise exception 'Invalid session elevated';end if;
  if exists(select 1 from public.admin_suppliers) or exists(select 1 from public.admin_purchase_orders) or exists(select 1 from public.admin_purchase_lines) or exists(select 1 from public.admin_purchase_receipts) then raise exception 'Admin table exposed';end if;
  if (select count(*) from public.storefront_config)<>1 then raise exception 'Public storefront read regression';end if;
  delete from public.storefront_config where id=1;get diagnostics n=row_count;if n<>0 then raise exception 'Storefront deletion allowed';end if;
  begin insert into public.admin_suppliers values(2);raise exception 'Supplier insertion allowed';exception when insufficient_privilege then null;end;
 end loop;
 perform set_config('request.jwt.claims',(claims||'{"session_id":"00000000-0000-4000-8000-000000000101"}'::jsonb)::text,false);
 if not private.admin_session_has_aal2() or not public.admin_staff_mfa_verified() or not public.has_staff_permission('orders') then raise exception 'Valid session denied';end if;
 if (select count(*) from public.admin_suppliers)<>1 or (select count(*) from public.storefront_config)<>2 then raise exception 'Owner read regression';end if;
 insert into public.admin_suppliers values(2);
 delete from public.storefront_config where id=2;get diagnostics n=row_count;if n<>1 then raise exception 'Authorized delete failed';end if;
 perform set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","aal":"aal2","session_id":"00000000-0000-4000-8000-000000000104"}',false);
 if not public.has_staff_permission('orders') or public.admin_staff_mfa_verified() or exists(select 1 from public.admin_suppliers) then raise exception 'Staff role boundary changed';end if;
end $test$;
reset role;
delete from auth.sessions where id='00000000-0000-4000-8000-000000000101';
set role authenticated;
select set_config('request.jwt.claims','{"sub":"1060de3d-d28a-45f8-9a64-5e0368cffc4b","aal":"aal2","session_id":"00000000-0000-4000-8000-000000000101","app_metadata":{"role":"admin"}}',false);
do $revoked$ begin if public.admin_staff_mfa_verified() or public.has_staff_permission('orders') then raise exception 'Revoked session accepted';end if;end $revoked$;
reset role;
set role anon;
select set_config('request.jwt.claims','{}',false);
do $public$ begin if (select count(*) from public.storefront_config)<>1 then raise exception 'Guest storefront regression';end if;end $public$;
reset role;
do $acl$ begin
 if has_table_privilege('authenticated','auth.sessions','SELECT') or has_function_privilege('anon','public.admin_staff_mfa_verified()','EXECUTE') then raise exception 'Session ACL widened';end if;
end $acl$;
\echo 'PASS phase4 admin MFA session identity, revocation and direct RLS boundary'
