-- Atomically update product metadata and explicit variant stock changes.
-- Additive only: no existing rows are modified by creating these functions.

create or replace function private.admin_update_product_with_stock(
  p_product jsonb,
  p_size_color_stocks jsonb,
  p_custom_variant_stocks jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_jwt jsonb := (select auth.jwt());
  v_product_id text;
  v_existing public.products;
  v_updated public.products;
  v_stock_result jsonb;
  v_product_result jsonb;
  v_size_count integer := 0;
  v_custom_count integer := 0;
begin
  if auth.uid() is null
     or coalesce(v_jwt -> 'app_metadata' ->> 'role', '') <> 'admin'
     or auth.uid() is distinct from '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid then
    raise exception 'Not authorized to update products' using errcode = '42501';
  end if;

  if p_product is null or jsonb_typeof(p_product) is distinct from 'object' then
    raise exception 'Invalid product payload' using errcode = '22023';
  end if;

  v_product_id := nullif(trim(p_product ->> 'id'), '');
  if v_product_id is null
     or coalesce(trim(p_product ->> 'name'), '') = ''
     or nullif(p_product ->> 'price_gel', '') is null
     or (p_product ->> 'price_gel')::numeric < 0 then
    raise exception 'Invalid product payload' using errcode = '22023';
  end if;

  if nullif(p_product ->> 'stock', '') is not null
     and (p_product ->> 'stock') !~ '^[0-9]+$' then
    raise exception 'Invalid product stock' using errcode = '22023';
  end if;

  if nullif(p_product ->> 'stock', '') is not null
     and (p_product ->> 'stock')::numeric > 1000000 then
    raise exception 'Invalid product stock' using errcode = '22023';
  end if;

  if p_size_color_stocks is not null
     and jsonb_typeof(p_size_color_stocks) is distinct from 'array' then
    raise exception 'Invalid size/color stock list' using errcode = '22023';
  end if;

  if p_custom_variant_stocks is not null
     and jsonb_typeof(p_custom_variant_stocks) is distinct from 'array' then
    raise exception 'Invalid custom variant stock list' using errcode = '22023';
  end if;

  v_size_count := coalesce(jsonb_array_length(p_size_color_stocks), 0);
  v_custom_count := coalesce(jsonb_array_length(p_custom_variant_stocks), 0);

  select p.*
    into v_existing
    from public.products as p
   where p.id = v_product_id
   for update;

  if not found then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;

  -- Use the locked current row as the base so omitted fields stay unchanged.
  -- Existing database triggers preserve stock for variants not explicitly edited.
  v_updated := jsonb_populate_record(v_existing, p_product - 'id' - 'created_at');

  -- Stock is never edited through the product form. Preserve the latest locked
  -- database value so a checkout committed while the form was open cannot be
  -- undone by a stale product snapshot. Variant stock is changed only below
  -- through the explicit, validated stock batch RPC; the aggregate trigger
  -- recalculates products that have variants.
  v_updated.stock := v_existing.stock;

  update public.products as p
     set (
       sku, name, category, brand, vendor, price_gel, old_price_gel, stock,
       image, description, available_sizes, available_colors, material,
       durability, purchase_cost, gallery, variants, tags, model, cpu, ram,
       storage, gpu, screen_size, os, is_featured, is_published
     ) = (
       v_updated.sku, v_updated.name, v_updated.category, v_updated.brand,
       v_updated.vendor, v_updated.price_gel, v_updated.old_price_gel,
       v_updated.stock, v_updated.image, v_updated.description,
       v_updated.available_sizes, v_updated.available_colors, v_updated.material,
       v_updated.durability, v_updated.purchase_cost, v_updated.gallery,
       v_updated.variants, v_updated.tags, v_updated.model, v_updated.cpu,
       v_updated.ram, v_updated.storage, v_updated.gpu, v_updated.screen_size,
       v_updated.os, v_updated.is_featured, v_updated.is_published
     )
   where p.id = v_product_id;

  if v_size_count > 0 or v_custom_count > 0 then
    v_stock_result := private.admin_set_product_variant_stock_batches(
      v_product_id,
      coalesce(p_size_color_stocks, '[]'::jsonb),
      coalesce(p_custom_variant_stocks, '[]'::jsonb)
    );
  else
    v_stock_result := jsonb_build_object(
      'product_id', v_product_id,
      'size_color', null,
      'custom', null
    );
  end if;

  select to_jsonb(p)
    into v_product_result
    from public.products as p
   where p.id = v_product_id;

  return jsonb_build_object(
    'product', v_product_result,
    'stock', v_stock_result
  );
end;
$function$;

revoke all on function private.admin_update_product_with_stock(jsonb, jsonb, jsonb) from public, anon;
grant execute on function private.admin_update_product_with_stock(jsonb, jsonb, jsonb) to authenticated;

create or replace function public.admin_update_product_with_stock(
  p_product jsonb,
  p_size_color_stocks jsonb,
  p_custom_variant_stocks jsonb
)
returns jsonb
language sql
set search_path to ''
as $function$
  select private.admin_update_product_with_stock(
    p_product,
    p_size_color_stocks,
    p_custom_variant_stocks
  );
$function$;

revoke all on function public.admin_update_product_with_stock(jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.admin_update_product_with_stock(jsonb, jsonb, jsonb) to authenticated;

comment on function public.admin_update_product_with_stock(jsonb, jsonb, jsonb)
is 'Atomically updates product fields and explicit variant stock changes in one transaction.';
