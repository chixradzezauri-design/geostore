-- Disposable PostgreSQL fixture, NOT hosted Storage or actual JWT.
\set ON_ERROR_STOP on
do $$ begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin;end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin;end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin;end if;
end $$;
create schema private;
create schema auth;
create schema storage;
grant usage on schema private to authenticated;
grant usage on schema auth,storage to authenticated,anon;
create table auth.users(id uuid primary key);
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb) $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt()->>'sub','')::uuid $$;
create table storage.buckets(id text primary key,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(bucket_id text not null references storage.buckets(id),name text not null,primary key(bucket_id,name));
alter table storage.objects enable row level security;
grant select,insert,update,delete on storage.objects to authenticated,anon;
insert into auth.users values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into storage.buckets values('customer-wardrobe-private',false,5242880,array['image/jpeg','image/png','image/webp','image/gif']),('storefront-media',true,null,null);
-- Intentionally broad fixture policy to prove restrictive isolation; NOT live policy.
create policy fixture_existing_access on storage.objects for all to authenticated using(true) with check(true);
insert into storage.objects values('customer-wardrobe-private','00000000-0000-4000-8000-000000000002/00000000-0000-4000-8000-000000000003.png'),('storefront-media','products/p1.png');
\ir ../../release/phase4-wardrobe-storage-draft.sql
\ir ../../release/phase4-wardrobe-items-draft.sql
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","is_anonymous":false}',false);
do $test$
declare a uuid:='00000000-0000-4000-8000-000000000001'; b uuid:='00000000-0000-4000-8000-000000000002';
 p text:='00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000004.png';
 item jsonb; r jsonb; affected integer;
begin
 if exists(select 1 from storage.objects where bucket_id='customer-wardrobe-private') then raise exception 'Other photo visible';end if;
 if not exists(select 1 from storage.objects where bucket_id='storefront-media') then raise exception 'Storefront access changed';end if;
 insert into storage.objects values('customer-wardrobe-private',p);
 begin insert into storage.objects values('customer-wardrobe-private',b::text||'/00000000-0000-4000-8000-000000000004.png');
 raise exception 'Cross-owner upload';exception when insufficient_privilege then null;end;
 begin insert into storage.objects values('customer-wardrobe-private',a::text||'/------------------------------------.png');
 raise exception 'Malformed path accepted';exception when insufficient_privilege then null;end;
 update storage.objects set name=a::text||'/00000000-0000-4000-8000-000000000005.png' where bucket_id='customer-wardrobe-private';
 get diagnostics affected=row_count;if affected<>0 then raise exception 'Immutable photo updated';end if;
 delete from storage.objects where bucket_id='customer-wardrobe-private';
 get diagnostics affected=row_count;if affected<>0 then raise exception 'Immutable photo deleted';end if;
 update storage.objects set name='products/p2.png' where bucket_id='storefront-media';
 get diagnostics affected=row_count;if affected<>1 then raise exception 'Storefront update broken';end if;
 if public.customer_wardrobe_read(a) is distinct from '{"revision":0,"items":[]}'::jsonb then raise exception 'Initial state';end if;
 begin perform public.customer_wardrobe_read(b);raise exception 'Cross-owner metadata read';exception when insufficient_privilege then null;end;
 item:=jsonb_build_object('id','00000000-0000-4000-8000-000000000006','name','Fixture coat','category','clothes','subCategory','coat','color','black','season','winter','photoPath',p);
 begin perform public.customer_wardrobe_change(a,0,'set',item||jsonb_build_object('photoPath',b::text||'/00000000-0000-4000-8000-000000000003.png'));
 raise exception 'Cross-owner photo reference';exception when invalid_parameter_value then null;end;
 begin perform public.customer_wardrobe_change(a,0,'set',item||jsonb_build_object('image','data:image/png;base64,private'));
 raise exception 'Raw image accepted';exception when invalid_parameter_value then null;end;
 r:=public.customer_wardrobe_change(a,0,'set',item);
 if r is distinct from jsonb_build_object('status','accepted','snapshot',jsonb_build_object('revision',1,'items',jsonb_build_array(item))) then raise exception 'Set mismatch: %',r;end if;
 r:=public.customer_wardrobe_request_erasure(a,1,p);
 if r is distinct from '{"status":"referenced","revision":1}'::jsonb then raise exception 'Referenced photo erasure allowed';end if;
 r:=public.customer_wardrobe_change(a,1,'remove',jsonb_build_object('id',item->>'id'));
 if r->'snapshot' is distinct from '{"revision":2,"items":[]}'::jsonb then raise exception 'Remove mismatch';end if;
 r:=public.customer_wardrobe_change(a,0,'set',item);
 if r->>'status' is distinct from 'conflict' then raise exception 'Stale metadata replay accepted';end if;
 if not exists(select 1 from storage.objects where name=p) then raise exception 'Metadata remove deleted file';end if;
 r:=public.customer_wardrobe_request_erasure(a,1,p);
 if r->>'status' is distinct from 'conflict' then raise exception 'Stale erase accepted';end if;
 r:=public.customer_wardrobe_request_erasure(a,2,p);
 if r is distinct from '{"status":"pending","revision":3}'::jsonb then raise exception 'Erasure request mismatch';end if;
 r:=public.customer_wardrobe_request_erasure(a,3,p);
 if r is distinct from '{"status":"pending","revision":3}'::jsonb then raise exception 'Erasure replay mismatch';end if;
 begin perform public.customer_wardrobe_change(a,3,'set',item);raise exception 'Retired photo reattached';exception when invalid_parameter_value then null;end;
 begin perform public.customer_wardrobe_request_erasure(a,3,b::text||'/00000000-0000-4000-8000-000000000003.png');raise exception 'Cross-owner erasure accepted';exception when invalid_parameter_value then null;end;
 if not exists(select 1 from storage.objects where name=p) then raise exception 'Request directly deleted file';end if;
end $test$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","is_anonymous":true}',false);
do $$ begin
 if exists(select 1 from storage.objects where bucket_id='customer-wardrobe-private') then raise exception 'Anonymous Auth photo read allowed';end if;
 begin perform public.customer_wardrobe_read('00000000-0000-4000-8000-000000000002');raise exception 'Anonymous Auth metadata read allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
do $$ begin
 if has_table_privilege('authenticated','private.customer_wardrobe_state','SELECT') or has_function_privilege('anon','public.customer_wardrobe_read(uuid)','EXECUTE') then raise exception 'Unsafe ACL';end if;
end $$;
delete from auth.users where id='00000000-0000-4000-8000-000000000001';
do $$ begin if exists(select 1 from private.customer_wardrobe_state where user_id='00000000-0000-4000-8000-000000000001') then raise exception 'Metadata cascade failed';end if;end $$;
\echo 'PASS phase4 wardrobe isolated policy boundary, metadata CAS, photo references and storefront compatibility'
