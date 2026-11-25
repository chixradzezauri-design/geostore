-- Disposable PG17, simulated JWT claims. Never run against live data.
\set ON_ERROR_STOP on
do $$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin; end if;
end $$;
create schema private;
create schema auth;
grant usage on schema private to authenticated;
grant usage on schema auth to authenticated,anon;
create table auth.users(id uuid primary key);
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb) $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt()->>'sub','')::uuid $$;
create table public.products(id text primary key,is_published boolean not null);
insert into auth.users values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into public.products values('p1',true),('hidden',false);
\ir ../../release/phase4-cart-sync-draft.sql
do $$ begin
 if has_table_privilege('authenticated','private.customer_cart_state','SELECT') or
    has_table_privilege('authenticated','private.customer_cart_state','UPDATE') or
    has_function_privilege('anon','public.customer_cart_read(uuid)','EXECUTE') or
    has_function_privilege('anon','public.customer_cart_change(uuid,bigint,text,jsonb)','EXECUTE') then raise exception 'Unexpected direct access';end if;
 if not (select relrowsecurity from pg_class where oid='private.customer_cart_state'::regclass) then raise exception 'RLS disabled';end if;
end $$;
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","is_anonymous":false}',false);
do $test$
declare a uuid:='00000000-0000-4000-8000-000000000001';b uuid:='00000000-0000-4000-8000-000000000002';
 l jsonb:='{"productId":"p1","size":"M","color":"black","variantId":null,"giftWrap":false,"vipWarranty":false,"quantity":1}';
 l2 jsonb; r jsonb; i integer;
begin
 if public.customer_cart_read(a) is distinct from '{"revision":0,"lines":[]}'::jsonb then raise exception 'Initial state';end if;
 begin perform public.customer_cart_read(b);raise exception 'Other owner read allowed';exception when insufficient_privilege then null;end;
 begin perform public.customer_cart_change(b,0,'set',l);raise exception 'Other owner write allowed';exception when insufficient_privilege then null;end;
 begin perform public.customer_cart_change(a,0,'set',l||'{"price":1}'::jsonb);raise exception 'Unexpected field allowed';exception when invalid_parameter_value then null;end;
 begin perform public.customer_cart_change(a,0,'set',l||'{"quantity":1.5}'::jsonb);raise exception 'Fractional quantity allowed';exception when invalid_parameter_value then null;end;
 begin perform public.customer_cart_change(a,0,'clear',l);raise exception 'Generic clear allowed';exception when invalid_parameter_value then null;end;
 r:=public.customer_cart_change(a,0,'set',l||'{"productId":"hidden"}'::jsonb);
 if r->>'status' is distinct from 'unavailable' then raise exception 'Hidden product accepted';end if;
 r:=public.customer_cart_change(a,0,'set',l);
 if r is distinct from jsonb_build_object('status','accepted','snapshot',jsonb_build_object('revision',1,'lines',jsonb_build_array(l))) then raise exception 'Initial add mismatch: %',r;end if;
 l2:=l||'{"size":"L"}'::jsonb;
 r:=public.customer_cart_change(a,1,'set',l2);
 if r->'snapshot'->'lines' is distinct from jsonb_build_array(l,l2) then raise exception 'Variant merged';end if;
 r:=public.customer_cart_change(a,2,'set',l||'{"quantity":3}'::jsonb);
 if r->'snapshot'->'lines' is distinct from jsonb_build_array(l||'{"quantity":3}'::jsonb,l2) then raise exception 'Quantity update mismatch';end if;
 r:=public.customer_cart_change(a,3,'remove',l);
 if r->'snapshot' is distinct from jsonb_build_object('revision',4,'lines',jsonb_build_array(l2)) then raise exception 'Wrong line removed';end if;
 r:=public.customer_cart_change(a,0,'set',l);
 if r->>'status' is distinct from 'conflict' then raise exception 'Replay allowed';end if;
 for i in 1..99 loop
  r:=public.customer_cart_change(a,i+3,'set',l||jsonb_build_object('size','fixture-'||i));
  if r->>'status' is distinct from 'accepted' then raise exception 'Bulk cart failed';end if;
 end loop;
 r:=public.customer_cart_change(a,103,'set',l);
 if r->>'status' is distinct from 'limit' or jsonb_array_length(r->'snapshot'->'lines')<>100 then raise exception 'Limit mismatch';end if;
end $test$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","is_anonymous":false}',false);
do $$ begin
 if public.customer_cart_read('00000000-0000-4000-8000-000000000002') is distinct from '{"revision":0,"lines":[]}'::jsonb then raise exception 'Cross-account leak';end if;
end $$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","is_anonymous":true}',false);
do $$ begin
 begin perform public.customer_cart_read('00000000-0000-4000-8000-000000000002');raise exception 'Anonymous Auth user accepted';exception when insufficient_privilege then null;end;
end $$;
reset role;
delete from auth.users where id='00000000-0000-4000-8000-000000000001';
do $$ begin
 if exists(select 1 from private.customer_cart_state where user_id='00000000-0000-4000-8000-000000000001') then raise exception 'Account deletion cascade failed';end if;
end $$;
\echo 'PASS phase4 cart isolated SQL owner, shape, CAS, variant identity, limit and cascade'
