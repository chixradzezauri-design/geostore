-- Unapplied release draft: atomic metadata removal + retirement queue.
-- Existing private functions retain authorization and per-owner row locking.
create function private.customer_wardrobe_remove_item(p_expected_owner uuid,p_expected_revision bigint,p_item_id uuid)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_owner uuid:=auth.uid();v_revision bigint;v_items jsonb;v_item jsonb;v_path text;v_removed jsonb;v_erase jsonb;v_status text:='none';
begin
 if v_owner is null or p_expected_owner is distinct from v_owner or coalesce(auth.jwt()->>'is_anonymous','false')='true' then
  raise exception 'Wardrobe authorization required' using errcode='42501';
 end if;
 if p_item_id is null or p_expected_revision is null or p_expected_revision not between 0 and 9007199254740991 then raise exception 'Invalid removal' using errcode='22023';end if;
 select revision,items into v_revision,v_items from private.customer_wardrobe_state where user_id=v_owner for update;
 if not found then return jsonb_build_object('status','review');end if;
 if v_revision<>p_expected_revision then return jsonb_build_object('status','conflict');end if;
 select item into v_item from jsonb_array_elements(v_items) l(item) where item->>'id'=p_item_id::text;
 if not found then return jsonb_build_object('status','review');end if;
 v_path:=v_item->>'photoPath';
 v_removed:=private.customer_wardrobe_change(v_owner,v_revision,'remove',jsonb_build_object('id',p_item_id::text));
 if v_removed->>'status' is distinct from 'accepted' then raise exception 'Removal not accepted';end if;
 v_revision:=(v_removed->'snapshot'->>'revision')::bigint;
 v_items:=v_removed->'snapshot'->'items';
 if v_path is not null then
  v_erase:=private.customer_wardrobe_request_erasure(v_owner,v_revision,v_path);
  v_status:=v_erase->>'status';
  -- Missing file is ambiguous: do not infer physical erasure or lose the reference.
  if v_status is null or v_status not in ('referenced','pending') then raise exception 'Photo retirement not confirmed';end if;
  v_revision:=(v_erase->>'revision')::bigint;
 end if;
 return jsonb_build_object('status','removed','photoErasure',v_status,'snapshot',jsonb_build_object('revision',v_revision,'items',v_items));
end;
$$;
create function public.customer_wardrobe_remove_item(p_expected_owner uuid,p_expected_revision bigint,p_item_id uuid)
returns jsonb language sql security invoker set search_path=''
as $$ select private.customer_wardrobe_remove_item(p_expected_owner,p_expected_revision,p_item_id) $$;
revoke all on function private.customer_wardrobe_remove_item(uuid,bigint,uuid),public.customer_wardrobe_remove_item(uuid,bigint,uuid) from public,anon,authenticated,service_role;
grant execute on function private.customer_wardrobe_remove_item(uuid,bigint,uuid),public.customer_wardrobe_remove_item(uuid,bigint,uuid) to authenticated;
