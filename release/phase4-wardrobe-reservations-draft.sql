-- 4AI: apply only after wardrobe metadata and storage policy drafts.
-- Reservation records survive account deletion; each path is permanently unique.
alter table private.customer_wardrobe_photo_erasure add column erased_at timestamptz;
create table private.customer_wardrobe_photo_reservations (
 user_id uuid not null,
 photo_path text primary key,
 reserved_at timestamptz not null default now(),
 check(split_part(photo_path,'/',1)=user_id::text)
);
create index customer_wardrobe_reservations_owner_idx on private.customer_wardrobe_photo_reservations(user_id);
alter table private.customer_wardrobe_photo_reservations enable row level security;
revoke all on private.customer_wardrobe_photo_reservations from public,anon,authenticated,service_role;

create function private.customer_wardrobe_reserve_photo(p_expected_owner uuid,p_path text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_owner uuid:=auth.uid(); v_count integer;
begin
 if v_owner is null or p_expected_owner is distinct from v_owner
  or coalesce(auth.jwt()->>'is_anonymous','false')='true' then
  raise exception 'Wardrobe authorization required' using errcode='42501';
 end if;
 if p_path is null or p_path !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png|webp|gif)$'
  or split_part(p_path,'/',1)<>v_owner::text then
  raise exception 'Invalid photo path' using errcode='22023';
 end if;
 insert into private.customer_wardrobe_state(user_id) values(v_owner) on conflict(user_id) do nothing;
 perform 1 from private.customer_wardrobe_state where user_id=v_owner for update;
 if not found then raise exception 'Missing owner' using errcode='42501';end if;
 if exists(select 1 from private.customer_wardrobe_photo_erasure where photo_path=p_path) then
  return jsonb_build_object('status','retired');
 end if;
 if exists(select 1 from private.customer_wardrobe_photo_reservations where photo_path=p_path) then
  return jsonb_build_object('status','reserved');
 end if;
 -- Charge every reservation until the trusted worker confirms Storage removal.
 select count(*) into v_count from private.customer_wardrobe_photo_reservations r
 where r.user_id=v_owner and not exists(select 1 from private.customer_wardrobe_photo_erasure e
 where e.photo_path=r.photo_path and e.erased_at is not null);
 if v_count>=20 then return jsonb_build_object('status','limit');end if;
 insert into private.customer_wardrobe_photo_reservations(user_id,photo_path) values(v_owner,p_path);
 return jsonb_build_object('status','reserved');
end;
$$;
create function public.customer_wardrobe_reserve_photo(p_expected_owner uuid,p_path text)
returns jsonb language sql security invoker set search_path=''
as $$ select private.customer_wardrobe_reserve_photo(p_expected_owner,p_path) $$;
revoke all on function private.customer_wardrobe_reserve_photo(uuid,text),public.customer_wardrobe_reserve_photo(uuid,text) from public,anon,authenticated,service_role;
grant execute on function private.customer_wardrobe_reserve_photo(uuid,text),public.customer_wardrobe_reserve_photo(uuid,text) to authenticated;

-- Called only for inserts in the private bucket. The account row lock
-- serializes the database authorization check with metadata and retirement.
create function private.customer_wardrobe_upload_allowed(p_path text)
returns boolean language plpgsql volatile security definer set search_path=''
as $$
declare v_owner uuid:=auth.uid();
begin
 if v_owner is null or coalesce(auth.jwt()->>'is_anonymous','false')='true'
  or p_path is null or split_part(p_path,'/',1)<>v_owner::text then return false;end if;
 perform 1 from private.customer_wardrobe_state where user_id=v_owner for update;
 if not found then return false;end if;
 return exists(select 1 from private.customer_wardrobe_photo_reservations where user_id=v_owner and photo_path=p_path)
  and not exists(select 1 from private.customer_wardrobe_photo_erasure where photo_path=p_path);
end;
$$;
revoke all on function private.customer_wardrobe_upload_allowed(text) from public,anon,authenticated,service_role;
grant execute on function private.customer_wardrobe_upload_allowed(text) to authenticated,anon;
create policy "Wardrobe reserved uploads only" on storage.objects
 as restrictive for insert to public
 with check(case when bucket_id='customer-wardrobe-private'
  then private.customer_wardrobe_upload_allowed(name) else true end);
-- Physical Storage operations may have separate transactions; actual
-- Storage API races, reservation expiration and verified erasure are blockers.
