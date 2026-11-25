-- Test exact staged SQL in a disposable PostgreSQL database. Auth functions
-- emulate JWT claims; this is not a hosted Supabase or actual JWT test.
\set ON_ERROR_STOP on
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin; end if;
end $$;
create schema private;
create schema auth;
grant usage on schema private to authenticated;
grant usage on schema auth to authenticated, anon;
create table auth.users(id uuid primary key);
create function auth.jwt() returns jsonb language sql stable as $$
 select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)
$$;
create function auth.uid() returns uuid language sql stable as $$
 select nullif(auth.jwt()->>'sub','')::uuid
$$;
create table public.products(id text primary key,is_published boolean not null);
insert into auth.users values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into public.products values('p1',true),('p2',true),('hidden',false);
insert into public.products select 'bulk-'||g,true from generate_series(1,100) g;
\ir ../../release/phase4-wishlist-sync-draft.sql
do $$ begin
 if has_table_privilege('authenticated','private.customer_wishlist_state','SELECT') or
    has_table_privilege('authenticated','private.customer_wishlist_state','UPDATE') or
    has_function_privilege('anon','public.customer_wishlist_read(uuid)','EXECUTE') or
    has_function_privilege('anon','public.customer_wishlist_change(uuid,bigint,text,boolean)','EXECUTE')
 then raise exception 'Unexpected direct access'; end if;
 if not (select relrowsecurity from pg_class where oid='private.customer_wishlist_state'::regclass)
 then raise exception 'RLS disabled'; end if;
end $$;
set role anon;
do $$ begin
 begin perform public.customer_wishlist_read('00000000-0000-4000-8000-000000000001');
 raise exception 'Anonymous read was allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","is_anonymous":false}',false);
do $test$
declare a uuid:='00000000-0000-4000-8000-000000000001'; b uuid:='00000000-0000-4000-8000-000000000002'; r jsonb; i integer;
begin
 if public.customer_wishlist_read(a) <> '{"revision":0,"ids":[]}'::jsonb then raise exception 'Initial state';end if;
 begin perform public.customer_wishlist_read(b); raise exception 'Other owner read allowed'; exception when insufficient_privilege then null; end;
 begin perform public.customer_wishlist_change(b,0,'p1',true); raise exception 'Other owner write allowed'; exception when insufficient_privilege then null; end;
 begin perform product_ids from private.customer_wishlist_state; raise exception 'Direct table access allowed'; exception when insufficient_privilege then null;end;
 r:=public.customer_wishlist_change(a,0,'hidden',true);
 if r->>'status' is distinct from 'unavailable' then raise exception 'Unpublished product accepted';end if;
 r:=public.customer_wishlist_change(a,0,'p1',true);
 if r is distinct from '{"status":"changed","snapshot":{"revision":1,"ids":["p1"]}}'::jsonb then raise exception 'Add mismatch: %',r;end if;
 r:=public.customer_wishlist_change(a,0,'p2',true);
 if r->>'status' is distinct from 'conflict' then raise exception 'Stale device accepted';end if;
 r:=public.customer_wishlist_change(a,1,'p1',true);
 if r is distinct from '{"status":"unchanged","snapshot":{"revision":2,"ids":["p1"]}}'::jsonb then raise exception 'No-op revision';end if;
 r:=public.customer_wishlist_change(a,2,'p1',false);
 if r is distinct from '{"status":"changed","snapshot":{"revision":3,"ids":[]}}'::jsonb then raise exception 'Remove mismatch';end if;
 r:=public.customer_wishlist_change(a,0,'p1',true);
 if r is distinct from '{"status":"conflict","snapshot":{"revision":3,"ids":[]}}'::jsonb then raise exception 'Replay resurrected item';end if;
 for i in 1..100 loop
  r:=public.customer_wishlist_change(a,i+2,'bulk-'||i,true);
  if r->>'status' is distinct from 'changed' then raise exception 'Bulk addition failed';end if;
 end loop;
 r:=public.customer_wishlist_change(a,103,'p2',true);
 if r->>'status' is distinct from 'limit' or jsonb_array_length(r->'snapshot'->'ids')<>100 then raise exception 'Limit mismatch';end if;
end $test$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","is_anonymous":false}',false);
do $$ begin
 if public.customer_wishlist_read('00000000-0000-4000-8000-000000000002') is distinct from '{"revision":0,"ids":[]}'::jsonb then raise exception 'Cross-account leak'; end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","is_anonymous":true}',false);
do $$ begin
 begin perform public.customer_wishlist_change('00000000-0000-4000-8000-000000000002',0,'p1',true);
 raise exception 'Anonymous Auth user accepted'; exception when insufficient_privilege then null;end;
end $$;
reset role;
delete from auth.users where id='00000000-0000-4000-8000-000000000001';
do $$ begin
 if exists(select 1 from private.customer_wishlist_state where user_id='00000000-0000-4000-8000-000000000001') then raise exception 'Account deletion failed to cascade';end if;
end $$;
\echo 'PASS phase4 wishlist isolated SQL authorization, CAS, replay, limit and cascade'
