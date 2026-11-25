-- Unapplied draft: cart intentions, not inventory reservation or checkout.
create table private.customer_cart_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0 check (revision between 0 and 9007199254740991),
  lines jsonb not null default '[]'::jsonb,
  constraint customer_cart_state_lines check (jsonb_typeof(lines)='array' and jsonb_array_length(lines)<=100)
);
alter table private.customer_cart_state enable row level security;
revoke all on table private.customer_cart_state from public,anon,authenticated,service_role;

create function private.customer_cart_read(p_expected_owner uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare v_owner uuid := auth.uid(); v_revision bigint; v_lines jsonb;
begin
 if v_owner is null or p_expected_owner is distinct from v_owner
    or coalesce(auth.jwt()->>'is_anonymous','false')='true' then
   raise exception 'Cart authorization required' using errcode='42501';
 end if;
 select revision,lines into v_revision,v_lines from private.customer_cart_state where user_id=v_owner;
 return jsonb_build_object('revision',coalesce(v_revision,0),'lines',coalesce(v_lines,'[]'::jsonb));
end;
$$;

create function private.customer_cart_change(p_expected_owner uuid,p_expected_revision bigint,p_action text,p_line jsonb)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_owner uuid := auth.uid(); v_revision bigint; v_lines jsonb; v_index integer;
 v_keys constant text[] := array['productId','size','color','variantId','giftWrap','vipWarranty','quantity'];
 v_field text; v_value text; v_max integer; v_quantity numeric;
begin
 if v_owner is null or p_expected_owner is distinct from v_owner
    or coalesce(auth.jwt()->>'is_anonymous','false')='true' then
   raise exception 'Cart authorization required' using errcode='42501';
 end if;
 if p_expected_revision is null or p_expected_revision not between 0 and 9007199254740991
    or p_action is null or p_action not in ('set','remove') or p_line is null
    or jsonb_typeof(p_line) <> 'object' or octet_length(p_line::text)>8192
    or not (p_line ?& v_keys) or (p_line-v_keys) <> '{}'::jsonb then
   raise exception 'Invalid cart intent' using errcode='22023';
 end if;
 foreach v_field in array array['productId','size','color','variantId'] loop
   if v_field <> 'productId' and p_line->v_field='null'::jsonb then continue; end if;
   if jsonb_typeof(p_line->v_field) <> 'string' then raise exception 'Invalid cart identity' using errcode='22023'; end if;
   v_value := p_line->>v_field;
   v_max := case v_field when 'productId' then 160 when 'variantId' then 120 else 100 end;
   if char_length(v_value) not between 1 and v_max or v_value ~ '^[[:space:]]|[[:space:]]$' then
     raise exception 'Invalid cart identity' using errcode='22023';
   end if;
 end loop;
 if jsonb_typeof(p_line->'giftWrap')<>'boolean' or jsonb_typeof(p_line->'vipWarranty')<>'boolean'
    or jsonb_typeof(p_line->'quantity')<>'number' then
   raise exception 'Invalid cart quantity or add-ons' using errcode='22023';
 end if;
 v_quantity := (p_line->>'quantity')::numeric;
 if v_quantity not between 1 and 100 or v_quantity<>trunc(v_quantity) then
   raise exception 'Invalid cart quantity' using errcode='22023';
 end if;
 p_line := jsonb_set(p_line,'{quantity}',to_jsonb(v_quantity::integer));
 insert into private.customer_cart_state(user_id) values(v_owner) on conflict(user_id) do nothing;
 select revision,lines into strict v_revision,v_lines from private.customer_cart_state where user_id=v_owner for update;
 if v_revision<>p_expected_revision then
   return jsonb_build_object('status','conflict','snapshot',jsonb_build_object('revision',v_revision,'lines',v_lines));
 end if;
 select (ord-1)::integer into v_index from jsonb_array_elements(v_lines) with ordinality as l(item,ord)
   where (item-'quantity')=(p_line-'quantity') limit 1;
 if p_action='remove' then
   if v_index is not null then v_lines:=v_lines-v_index; end if;
 else
   if not exists(select 1 from public.products where id=p_line->>'productId' and is_published is true) then
     return jsonb_build_object('status','unavailable','snapshot',jsonb_build_object('revision',v_revision,'lines',v_lines));
   end if;
   -- Variants, prices and stock are NOT authorized by this storage operation.
   -- Keep disabled until catalogue validation and checkout integration are tested.
   if v_index is not null then
     v_lines:=jsonb_set(v_lines,array[v_index::text],p_line,false);
   elsif jsonb_array_length(v_lines)>=100 then
     return jsonb_build_object('status','limit','snapshot',jsonb_build_object('revision',v_revision,'lines',v_lines));
   else
     v_lines:=v_lines||jsonb_build_array(p_line);
   end if;
 end if;
 if v_revision>=9007199254740991 then raise exception 'Cart revision exhausted' using errcode='22003';end if;
 v_revision:=v_revision+1;
 update private.customer_cart_state set revision=v_revision,lines=v_lines where user_id=v_owner;
 return jsonb_build_object('status','accepted','snapshot',jsonb_build_object('revision',v_revision,'lines',v_lines));
end;
$$;

create function public.customer_cart_read(p_expected_owner uuid)
returns jsonb language sql stable security invoker set search_path=''
as $$ select private.customer_cart_read(p_expected_owner) $$;
create function public.customer_cart_change(p_expected_owner uuid,p_expected_revision bigint,p_action text,p_line jsonb)
returns jsonb language sql security invoker set search_path=''
as $$ select private.customer_cart_change(p_expected_owner,p_expected_revision,p_action,p_line) $$;
revoke all on function private.customer_cart_read(uuid),private.customer_cart_change(uuid,bigint,text,jsonb),
 public.customer_cart_read(uuid),public.customer_cart_change(uuid,bigint,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function private.customer_cart_read(uuid),private.customer_cart_change(uuid,bigint,text,jsonb),
 public.customer_cart_read(uuid),public.customer_cart_change(uuid,bigint,text,jsonb) to authenticated;
-- No generic clear RPC. Check current schema usage and actual Auth in isolation.
