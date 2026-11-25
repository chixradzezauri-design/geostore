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
grant usage on schema private to authenticated,service_role;
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
\ir ../../release/phase4-wardrobe-reservations-draft.sql
\ir ../../release/phase4-wardrobe-erasure-worker-draft.sql
\ir ../../release/phase4-wardrobe-remove-item-draft.sql
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","is_anonymous":false}',false);
do $test$
declare a uuid:='00000000-0000-4000-8000-000000000001'; b uuid:='00000000-0000-4000-8000-000000000002';
 p text:='00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000004.png';
 item jsonb; r jsonb; affected integer;
begin
 if exists(select 1 from storage.objects where bucket_id='customer-wardrobe-private') then raise exception 'Other photo visible';end if;
 if not exists(select 1 from storage.objects where bucket_id='storefront-media') then raise exception 'Storefront access changed';end if;
 begin insert into storage.objects values('customer-wardrobe-private',p);
 raise exception 'Unreserved upload accepted';exception when insufficient_privilege then null;end;
 if public.customer_wardrobe_reserve_photo(a,p) is distinct from '{"status":"reserved"}'::jsonb then raise exception 'Reservation failed';end if;
 if public.customer_wardrobe_reserve_photo(a,p) is distinct from '{"status":"reserved"}'::jsonb then raise exception 'Reservation replay failed';end if;
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
 if public.customer_wardrobe_reserve_photo(a,p) is distinct from '{"status":"retired"}'::jsonb then raise exception 'Retired path reserved again';end if;
 if private.customer_wardrobe_upload_allowed(p) then raise exception 'Retired path upload allowed';end if;
 for affected in 1..19 loop
  if public.customer_wardrobe_reserve_photo(a,a::text||'/00000000-0000-4000-8000-'||lpad((100+affected)::text,12,'0')||'.png') is distinct from '{"status":"reserved"}'::jsonb then raise exception 'Quota reservation failed';end if;
 end loop;
 if public.customer_wardrobe_reserve_photo(a,a::text||'/00000000-0000-4000-8000-000000000999.png') is distinct from '{"status":"limit"}'::jsonb then raise exception 'Quota exceeded';end if;
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
-- Worker roles are simulated; fixture deletion represents successful Storage API only.
do $$ begin
 if has_function_privilege('authenticated','public.customer_wardrobe_erasure_batch(integer)','EXECUTE')
 or has_function_privilege('authenticated','public.customer_wardrobe_confirm_erasure(text)','EXECUTE')
 or has_function_privilege('anon','public.customer_wardrobe_confirm_erasure(text)','EXECUTE')
 then raise exception 'Worker functions exposed';end if;
end $$;
set role service_role;
do $$ declare p text:='00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000004.png';begin
 if public.customer_wardrobe_erasure_batch(10) is distinct from jsonb_build_array(jsonb_build_object('path',p)) then raise exception 'Worker queue mismatch';end if;
 if public.customer_wardrobe_confirm_erasure(p) is distinct from '{"status":"still-present"}'::jsonb then raise exception 'Premature completion';end if;
end $$;
reset role;
-- ONLY in disposable fixture; production must use Storage API.
delete from storage.objects where bucket_id='customer-wardrobe-private' and name='00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000004.png';
set role service_role;
do $$ declare p text:='00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000004.png';begin
 if public.customer_wardrobe_confirm_erasure(p) is distinct from '{"status":"erased"}'::jsonb then raise exception 'Completion failed';end if;
 if public.customer_wardrobe_erasure_batch(10) is distinct from '[]'::jsonb then raise exception 'Completed job requeued';end if;
end $$;
reset role;
set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","is_anonymous":false}',false);
do $$ begin
 if public.customer_wardrobe_reserve_photo('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000999.png') is distinct from '{"status":"reserved"}'::jsonb then raise exception 'Verified erasure did not release quota';end if;
end $$;
reset role;
delete from auth.users where id='00000000-0000-4000-8000-000000000001';
do $$ begin if exists(select 1 from private.customer_wardrobe_state where user_id='00000000-0000-4000-8000-000000000001') then raise exception 'Metadata cascade failed';end if;end $$;
\echo 'PASS phase4 wardrobe isolated policy boundary, metadata CAS, reservations, quota and storefront compatibility'

set role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","is_anonymous":false}',false);
do $test$
declare b uuid:='00000000-0000-4000-8000-000000000002'; a uuid:='00000000-0000-4000-8000-000000000001';
 p text:=b::text||'/00000000-0000-4000-8000-000000000003.png';
 i uuid:='00000000-0000-4000-8000-000000000010'; j uuid:='00000000-0000-4000-8000-000000000011';
 item jsonb;r jsonb;
begin
 item:=jsonb_build_object('id',i::text,'name','fixture','category','','subCategory','','color','','season','','photoPath',p);
 perform public.customer_wardrobe_change(b,0,'set',item);
 perform public.customer_wardrobe_change(b,1,'set',item||jsonb_build_object('id',j::text));
 if public.customer_wardrobe_remove_item(b,1,i)->>'status'<>'conflict' then raise exception 'stale removal';end if;
 begin perform public.customer_wardrobe_remove_item(a,2,i);raise exception 'cross owner removal';exception when insufficient_privilege then null;end;
 r:=public.customer_wardrobe_remove_item(b,2,i);
 if r->>'photoErasure' is distinct from 'referenced' or (r->'snapshot'->>'revision')::integer<>3 then raise exception 'shared photo retirement';end if;
 r:=public.customer_wardrobe_remove_item(b,3,j);
 if r is distinct from '{"status":"removed","photoErasure":"pending","snapshot":{"revision":5,"items":[]}}'::jsonb then raise exception 'atomic retirement mismatch: %',r;end if;
 if not exists(select 1 from storage.objects where name=p) then raise exception 'direct photo deletion';end if;
 if public.customer_wardrobe_remove_item(b,3,j)->>'status' is distinct from 'conflict' then raise exception 'replay';end if;
end $test$;
reset role;
do $$ begin
 if has_function_privilege('anon','public.customer_wardrobe_remove_item(uuid,bigint,uuid)','EXECUTE') then raise exception 'anonymous removal';end if;
end $$;
\echo 'PASS phase4 atomic wardrobe removal and retirement'
