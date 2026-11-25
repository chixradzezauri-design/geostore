-- Unapplied draft; after metadata, storage policies and reservations.
-- These endpoints are for a trusted server-only service role, never a browser.
create function private.customer_wardrobe_erasure_batch(p_limit integer)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
begin
 if current_setting('role',true) is distinct from 'service_role' then
  raise exception 'Worker authorization required' using errcode='42501';
 end if;
 if p_limit is null or p_limit not between 1 and 20 then raise exception 'Invalid batch limit' using errcode='22023';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('path',q.photo_path) order by q.requested_at,q.photo_path)
 from (select e.photo_path,e.requested_at from private.customer_wardrobe_photo_erasure e
 where e.erased_at is null
 and not exists(select 1 from private.customer_wardrobe_state s cross join lateral jsonb_array_elements(s.items) as l(item)
  where s.user_id=e.user_id and l.item->>'photoPath'=e.photo_path)
 order by e.requested_at,e.photo_path limit p_limit) q),'[]'::jsonb);
end;
$$;
create function private.customer_wardrobe_confirm_erasure(p_path text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_owner uuid;v_erased timestamptz;
begin
 if current_setting('role',true) is distinct from 'service_role' then
  raise exception 'Worker authorization required' using errcode='42501';
 end if;
 select user_id,erased_at into v_owner,v_erased from private.customer_wardrobe_photo_erasure where photo_path=p_path;
 if not found then return jsonb_build_object('status','unknown');end if;
 -- Same account lock as reservation and metadata edits, when account exists.
 perform 1 from private.customer_wardrobe_state where user_id=v_owner for update;
 if exists(select 1 from private.customer_wardrobe_state s cross join lateral jsonb_array_elements(s.items) as l(item)
  where s.user_id=v_owner and l.item->>'photoPath'=p_path) then return jsonb_build_object('status','referenced');end if;
 if exists(select 1 from storage.objects where bucket_id='customer-wardrobe-private' and name=p_path) then
  return jsonb_build_object('status','still-present');
 end if;
 if v_erased is not null then return jsonb_build_object('status','erased');end if;
 update private.customer_wardrobe_photo_erasure set erased_at=now() where photo_path=p_path and erased_at is null;
 return jsonb_build_object('status','erased');
end;
$$;
create function public.customer_wardrobe_erasure_batch(p_limit integer)
returns jsonb language sql stable security invoker set search_path=''
as $$ select private.customer_wardrobe_erasure_batch(p_limit) $$;
create function public.customer_wardrobe_confirm_erasure(p_path text)
returns jsonb language sql security invoker set search_path=''
as $$ select private.customer_wardrobe_confirm_erasure(p_path) $$;
revoke all on function private.customer_wardrobe_erasure_batch(integer),private.customer_wardrobe_confirm_erasure(text),
 public.customer_wardrobe_erasure_batch(integer),public.customer_wardrobe_confirm_erasure(text) from public,anon,authenticated,service_role;
grant execute on function private.customer_wardrobe_erasure_batch(integer),private.customer_wardrobe_confirm_erasure(text),
 public.customer_wardrobe_erasure_batch(integer),public.customer_wardrobe_confirm_erasure(text) to service_role;
-- Confirm service_role private schema usage in staging; no broad schema grants.
-- Never invoke confirmation without a trusted successful Storage API removal.
