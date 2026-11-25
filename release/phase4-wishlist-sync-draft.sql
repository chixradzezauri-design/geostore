-- Phase 4Y draft, NOT an applied migration. Rehearse in disposable Supabase first.
-- No direct table permissions; owner is derived from Auth, never trusted from input.
create table private.customer_wishlist_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0 check (revision between 0 and 9007199254740991),
  product_ids text[] not null default '{}'::text[],
  constraint customer_wishlist_state_limit check (cardinality(product_ids) <= 100)
);
alter table private.customer_wishlist_state enable row level security;
revoke all on table private.customer_wishlist_state from public, anon, authenticated, service_role;

create function private.customer_wishlist_read(p_expected_owner uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_owner uuid := auth.uid(); v_revision bigint; v_ids text[];
begin
  if v_owner is null or p_expected_owner is distinct from v_owner
     or coalesce(auth.jwt()->>'is_anonymous','false') = 'true' then
    raise exception 'Wishlist authorization required' using errcode='42501';
  end if;
  select revision,product_ids into v_revision,v_ids
    from private.customer_wishlist_state where user_id=v_owner;
  return jsonb_build_object('revision',coalesce(v_revision,0),'ids',coalesce(v_ids,'{}'::text[]));
end;
$$;

create function private.customer_wishlist_change(
  p_expected_owner uuid, p_expected_revision bigint, p_product_id text, p_present boolean
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_owner uuid := auth.uid(); v_revision bigint; v_ids text[]; v_status text;
begin
  if v_owner is null or p_expected_owner is distinct from v_owner
     or coalesce(auth.jwt()->>'is_anonymous','false') = 'true' then
    raise exception 'Wishlist authorization required' using errcode='42501';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 or p_expected_revision > 9007199254740991
    or p_product_id is null or char_length(p_product_id) not between 1 and 160
    or btrim(p_product_id) <> p_product_id or p_present is null then
    raise exception 'Invalid wishlist intent' using errcode='22023';
  end if;
  insert into private.customer_wishlist_state(user_id) values(v_owner)
    on conflict (user_id) do nothing;
  select revision,product_ids into strict v_revision,v_ids
    from private.customer_wishlist_state where user_id=v_owner for update;
  if v_revision <> p_expected_revision then
    return jsonb_build_object('status','conflict','snapshot',jsonb_build_object('revision',v_revision,'ids',v_ids));
  end if;
  if p_present = (p_product_id = any(v_ids)) then
    v_status := 'unchanged';
  elsif p_present then
    if cardinality(v_ids) >= 100 then
      return jsonb_build_object('status','limit','snapshot',jsonb_build_object('revision',v_revision,'ids',v_ids));
    end if;
    if not exists (select 1 from public.products where id=p_product_id and is_published is true) then
      return jsonb_build_object('status','unavailable','snapshot',jsonb_build_object('revision',v_revision,'ids',v_ids));
    end if;
    v_ids := array_append(v_ids,p_product_id);
    v_status := 'changed';
  else
    v_ids := array_remove(v_ids,p_product_id);
    v_status := 'changed';
  end if;
  -- Consume the expected revision even for an accepted no-op. A delayed replay
  -- cannot invert a later action. Conflicts must not be blindly rebased.
  if v_revision >= 9007199254740991 then
    raise exception 'Wishlist revision exhausted' using errcode='22003';
  end if;
  v_revision := v_revision + 1;
  update private.customer_wishlist_state set revision=v_revision,product_ids=v_ids where user_id=v_owner;
  return jsonb_build_object('status',v_status,'snapshot',jsonb_build_object('revision',v_revision,'ids',v_ids));
end;
$$;

-- Public wrappers are invoker functions. Private definer functions restrict
-- their narrow elevated access to the verified owner and fixed relations.
create function public.customer_wishlist_read(p_expected_owner uuid)
returns jsonb language sql stable security invoker set search_path = ''
as $$ select private.customer_wishlist_read(p_expected_owner) $$;
create function public.customer_wishlist_change(p_expected_owner uuid,p_expected_revision bigint,p_product_id text,p_present boolean)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.customer_wishlist_change(p_expected_owner,p_expected_revision,p_product_id,p_present) $$;
revoke all on function private.customer_wishlist_read(uuid), private.customer_wishlist_change(uuid,bigint,text,boolean),
  public.customer_wishlist_read(uuid), public.customer_wishlist_change(uuid,bigint,text,boolean) from public,anon,authenticated,service_role;
grant execute on function private.customer_wishlist_read(uuid), private.customer_wishlist_change(uuid,bigint,text,boolean),
  public.customer_wishlist_read(uuid), public.customer_wishlist_change(uuid,bigint,text,boolean) to authenticated;
-- Verify private schema USAGE and non-exposure in the isolated stack; do not
-- broaden shared schema privileges in this draft.
