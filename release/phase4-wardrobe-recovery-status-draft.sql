-- Unapplied: owner-only observation of reserved capacity and a single private path.
create function private.customer_wardrobe_recovery_status(p_expected_owner uuid,p_path text)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_owner uuid:=auth.uid();v_reserved integer;v_pending integer;v_state text:='none';v_snapshot jsonb;
begin
 if v_owner is null or p_expected_owner is distinct from v_owner or coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception 'Wardrobe authorization required' using errcode='42501';end if;
 if p_path is not null and (split_part(p_path,'/',1)<>v_owner::text or p_path !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png|webp|gif)$') then raise exception 'Invalid path' using errcode='22023';end if;
 select count(*) into v_reserved from private.customer_wardrobe_photo_reservations r where r.user_id=v_owner and not exists(select 1 from private.customer_wardrobe_photo_erasure e where e.photo_path=r.photo_path and e.erased_at is not null);
 select count(*) into v_pending from private.customer_wardrobe_photo_erasure where user_id=v_owner and erased_at is null;
 if p_path is not null then
  if exists(select 1 from private.customer_wardrobe_photo_erasure where user_id=v_owner and photo_path=p_path and erased_at is not null) then v_state:='erased';
  elsif exists(select 1 from private.customer_wardrobe_photo_erasure where user_id=v_owner and photo_path=p_path) then v_state:='pending';
  elsif exists(select 1 from storage.objects where bucket_id='customer-wardrobe-private' and name=p_path) then v_state:='present';
  elsif exists(select 1 from private.customer_wardrobe_photo_reservations where user_id=v_owner and photo_path=p_path) then v_state:='reserved';
  else v_state:='unknown';end if;
 end if;
 v_snapshot:=private.customer_wardrobe_read(v_owner);
 return jsonb_build_object('snapshot',v_snapshot,'photoState',v_state,'reserved',v_reserved,'pending',v_pending);
end;
$$;
create function public.customer_wardrobe_recovery_status(p_expected_owner uuid,p_path text)
returns jsonb language sql stable security invoker set search_path=''
as $$ select private.customer_wardrobe_recovery_status(p_expected_owner,p_path) $$;
revoke all on function private.customer_wardrobe_recovery_status(uuid,text),public.customer_wardrobe_recovery_status(uuid,text) from public,anon,authenticated,service_role;
grant execute on function private.customer_wardrobe_recovery_status(uuid,text),public.customer_wardrobe_recovery_status(uuid,text) to authenticated;
