-- Unapplied wardrobe metadata draft. Photos are independent immutable
-- private Storage objects; no direct Storage writes or object deletion here.
create table private.customer_wardrobe_state (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null default 0 check(revision between 0 and 9007199254740991),
 items jsonb not null default '[]'::jsonb,
 check(jsonb_typeof(items)='array' and jsonb_array_length(items)<=100)
);
alter table private.customer_wardrobe_state enable row level security;
revoke all on private.customer_wardrobe_state from public,anon,authenticated,service_role;

create function private.customer_wardrobe_read(p_expected_owner uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_owner uuid:=auth.uid(); v_revision bigint;v_items jsonb;
begin
 if v_owner is null or p_expected_owner is distinct from v_owner
  or coalesce(auth.jwt()->>'is_anonymous','false')='true' then
  raise exception 'Wardrobe authorization required' using errcode='42501';
 end if;
 select revision,items into v_revision,v_items from private.customer_wardrobe_state where user_id=v_owner;
 return jsonb_build_object('revision',coalesce(v_revision,0),'items',coalesce(v_items,'[]'::jsonb));
end;
$$;

create function private.customer_wardrobe_change(p_expected_owner uuid,p_expected_revision bigint,p_action text,p_item jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_owner uuid:=auth.uid();v_revision bigint;v_items jsonb;v_index integer;v_id text;v_path text;v_field text;
 v_keys constant text[]:=array['id','name','category','subCategory','color','season','photoPath'];
begin
 if v_owner is null or p_expected_owner is distinct from v_owner
  or coalesce(auth.jwt()->>'is_anonymous','false')='true' then
  raise exception 'Wardrobe authorization required' using errcode='42501';
 end if;
 if p_expected_revision is null or p_expected_revision not between 0 and 9007199254740991
  or p_action is null or p_action not in ('set','remove')
  or p_item is null or jsonb_typeof(p_item)<>'object' or octet_length(p_item::text)>8192 then
  raise exception 'Invalid wardrobe intent' using errcode='22023';
 end if;
 v_id:=p_item->>'id';
 if jsonb_typeof(p_item->'id') is distinct from 'string' or v_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
  raise exception 'Invalid wardrobe item ID' using errcode='22023';
 end if;
 if p_action='remove' then
  if (p_item-'id')<>'{}'::jsonb then raise exception 'Invalid removal' using errcode='22023';end if;
 else
  if not(p_item ?& v_keys) or (p_item-v_keys)<>'{}'::jsonb then raise exception 'Invalid wardrobe fields' using errcode='22023';end if;
  foreach v_field in array array['name','category','subCategory','color','season'] loop
   if jsonb_typeof(p_item->v_field) is distinct from 'string'
      or char_length(p_item->>v_field)>160
      or (v_field='name' and char_length(btrim(p_item->>v_field))=0) then
    raise exception 'Invalid wardrobe text' using errcode='22023';
   end if;
  end loop;
  if p_item->'photoPath'<>'null'::jsonb then
   v_path:=p_item->>'photoPath';
   if jsonb_typeof(p_item->'photoPath') is distinct from 'string'
    or v_path !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png|webp|gif)$' or split_part(v_path,'/',1)<>v_owner::text then
    raise exception 'Invalid private photo path' using errcode='22023';
   end if;
   if not exists(select 1 from storage.objects where bucket_id='customer-wardrobe-private' and name=v_path) then
    raise exception 'Photo missing' using errcode='22023';
   end if;
  end if;
 end if;
 insert into private.customer_wardrobe_state(user_id) values(v_owner) on conflict(user_id) do nothing;
 select revision,items into strict v_revision,v_items from private.customer_wardrobe_state where user_id=v_owner for update;
 if v_revision<>p_expected_revision then
  return jsonb_build_object('status','conflict','snapshot',jsonb_build_object('revision',v_revision,'items',v_items));
 end if;
 select (ord-1)::integer into v_index from jsonb_array_elements(v_items) with ordinality as l(item,ord) where item->>'id'=v_id limit 1;
 if p_action='remove' then
  if v_index is not null then v_items:=v_items-v_index;end if;
 elsif v_index is not null then v_items:=jsonb_set(v_items,array[v_index::text],p_item,false);
 elsif jsonb_array_length(v_items)>=100 then
  return jsonb_build_object('status','limit','snapshot',jsonb_build_object('revision',v_revision,'items',v_items));
 else v_items:=v_items||jsonb_build_array(p_item);
 end if;
 if v_revision>=9007199254740991 then raise exception 'Wardrobe revision exhausted' using errcode='22003';end if;
 v_revision:=v_revision+1;
 update private.customer_wardrobe_state set revision=v_revision,items=v_items where user_id=v_owner;
 return jsonb_build_object('status','accepted','snapshot',jsonb_build_object('revision',v_revision,'items',v_items));
end;
$$;
create function public.customer_wardrobe_read(p_expected_owner uuid)
returns jsonb language sql stable security invoker set search_path=''
as $$ select private.customer_wardrobe_read(p_expected_owner) $$;
create function public.customer_wardrobe_change(p_expected_owner uuid,p_expected_revision bigint,p_action text,p_item jsonb)
returns jsonb language sql security invoker set search_path=''
as $$ select private.customer_wardrobe_change(p_expected_owner,p_expected_revision,p_action,p_item) $$;
revoke all on function private.customer_wardrobe_read(uuid),private.customer_wardrobe_change(uuid,bigint,text,jsonb),
 public.customer_wardrobe_read(uuid),public.customer_wardrobe_change(uuid,bigint,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function private.customer_wardrobe_read(uuid),private.customer_wardrobe_change(uuid,bigint,text,jsonb),
 public.customer_wardrobe_read(uuid),public.customer_wardrobe_change(uuid,bigint,text,jsonb) to authenticated;
-- Metadata deletion does not delete the referenced file; lifecycle, quota,
-- account-erasure cleanup and actual Storage API validation are release blockers.
