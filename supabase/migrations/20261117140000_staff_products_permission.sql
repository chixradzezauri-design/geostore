-- Stage 103B: enforce the products permission while keeping purchase cost
-- visible only to staff with the separate expenses permission (or the owner).

-- Product reads are permission-gated. All mutations must use the protected
-- RPCs below so stock ledger triggers, cost masking and validation cannot be bypassed.
DROP POLICY IF EXISTS "Admin can insert products" ON public.products;
DROP POLICY IF EXISTS "Staff with products permission can insert products" ON public.products;

DROP POLICY IF EXISTS "Admin can read all products" ON public.products;
CREATE POLICY "Staff with products permission can read all products"
  ON public.products
  FOR SELECT TO authenticated
  USING (public.has_staff_permission('products'));

DROP POLICY IF EXISTS "Admin can update products" ON public.products;
DROP POLICY IF EXISTS "Staff with products permission can update products" ON public.products;

REVOKE INSERT, UPDATE ON TABLE public.products FROM authenticated;
REVOKE INSERT (purchase_cost), UPDATE (purchase_cost), SELECT (purchase_cost)
  ON TABLE public.products FROM authenticated;

-- PostgreSQL column-level grants survive a table-level REVOKE. Remove every
-- remaining authenticated INSERT/UPDATE column grant; product writes now go
-- only through the validated SECURITY DEFINER RPCs.
DO $revoke_product_column_writes$
DECLARE
  v_insert_columns text;
  v_update_columns text;
BEGIN
  SELECT string_agg(format('%I', column_name), ', ' ORDER BY column_name)
    INTO v_insert_columns
    FROM information_schema.column_privileges
   WHERE table_schema = 'public'
     AND table_name = 'products'
     AND grantee = 'authenticated'
     AND privilege_type = 'INSERT';

  SELECT string_agg(format('%I', column_name), ', ' ORDER BY column_name)
    INTO v_update_columns
    FROM information_schema.column_privileges
   WHERE table_schema = 'public'
     AND table_name = 'products'
     AND grantee = 'authenticated'
     AND privilege_type = 'UPDATE';

  IF v_insert_columns IS NOT NULL THEN
    EXECUTE format(
      'REVOKE INSERT (%s) ON TABLE public.products FROM authenticated',
      v_insert_columns
    );
  END IF;

  IF v_update_columns IS NOT NULL THEN
    EXECUTE format(
      'REVOKE UPDATE (%s) ON TABLE public.products FROM authenticated',
      v_update_columns
    );
  END IF;
END;
$revoke_product_column_writes$;

DO $staff_product_permissions$
DECLARE
  v_definition text;
  v_original text;
  v_signature text;
  v_guard_v_jwt text := E'IF COALESCE(v_jwt -> ''app_metadata'' ->> ''role'', '''') <> ''admin''\n     OR auth.uid() IS DISTINCT FROM ''1060de3d-d28a-45f8-9a64-5e0368cffc4b''::uuid THEN';
  v_guard_auth_jwt text := E'IF auth.uid() IS NULL\n     OR coalesce(auth.jwt()->''app_metadata''->>''role'', '''') <> ''admin''\n     OR auth.uid() IS DISTINCT FROM ''1060de3d-d28a-45f8-9a64-5e0368cffc4b''::uuid THEN';
  v_guard_v_jwt_lower text := E'if auth.uid() is null\n     or coalesce(v_jwt -> ''app_metadata'' ->> ''role'', '''') <> ''admin''\n     or auth.uid() is distinct from ''1060de3d-d28a-45f8-9a64-5e0368cffc4b''::uuid then';
  v_signatures text[] := ARRAY[
    'private.admin_apply_flash_sale(numeric,text,integer)',
    'private.admin_delete_product(text)',
    'private.admin_set_product_custom_variant_stocks(text,jsonb)',
    'private.admin_set_product_variant_stock_batches(text,jsonb,jsonb)',
    'private.admin_set_product_variant_stocks(text,jsonb)',
    'private.list_inventory_movements(text,bigint,integer)',
    'private.list_inventory_replenishment_settings(integer)',
    'private.save_inventory_replenishment_setting(text,text,integer,integer)'
  ];
BEGIN
  -- Create product. Product-only staff cannot set a cost on creation.
  SELECT pg_get_functiondef('private.admin_save_product(jsonb)'::regprocedure)
    INTO v_definition;
  v_original := v_definition;
  v_definition := replace(v_definition, v_guard_v_jwt,
    'IF NOT public.has_staff_permission(''products'') THEN');
  IF v_definition = v_original THEN
    RAISE EXCEPTION 'Could not locate admin_save_product authorization guard.';
  END IF;
  v_original := v_definition;
  v_definition := replace(
    v_definition,
    E'  END IF;\n\n  -- This RPC is used only for product creation.',
    E'  END IF;\n\n  IF NOT public.has_staff_permission(''expenses'') THEN\n    p_product := jsonb_set(p_product, ''{purchase_cost}'', ''null''::jsonb, true);\n  END IF;\n\n  -- This RPC is used only for product creation.'
  );
  IF v_definition = v_original THEN
    RAISE EXCEPTION 'Could not locate admin_save_product cost insertion point.';
  END IF;
  EXECUTE rtrim(v_definition, E'; \t\n\r');

  -- Update product. Without expenses permission, preserve the stored cost and
  -- remove purchase_cost from the JSON response.
  SELECT pg_get_functiondef('private.admin_update_product_with_stock(jsonb,jsonb,jsonb)'::regprocedure)
    INTO v_definition;
  v_original := v_definition;
  v_definition := replace(v_definition, v_guard_v_jwt_lower,
    'if not public.has_staff_permission(''products'') then');
  IF v_definition = v_original THEN
    RAISE EXCEPTION 'Could not locate admin_update_product_with_stock authorization guard.';
  END IF;
  v_original := v_definition;
  v_definition := replace(
    v_definition,
    E'  v_product_id := nullif(trim(p_product ->> ''id''), '''');',
    E'  v_product_id := nullif(trim(p_product ->> ''id''), '''');\n  IF NOT public.has_staff_permission(''expenses'') THEN\n    p_product := p_product - ''purchase_cost'';\n  END IF;'
  );
  IF v_definition = v_original THEN
    RAISE EXCEPTION 'Could not locate admin_update_product_with_stock input anchor.';
  END IF;
  v_original := v_definition;
  v_definition := replace(
    v_definition,
    E'  select to_jsonb(p)\n    into v_product_result\n    from public.products as p\n   where p.id = v_product_id;',
    E'  select to_jsonb(p)\n    into v_product_result\n    from public.products as p\n   where p.id = v_product_id;\n\n  IF NOT public.has_staff_permission(''expenses'') THEN\n    v_product_result := v_product_result - ''purchase_cost'';\n  END IF;'
  );
  IF v_definition = v_original THEN
    RAISE EXCEPTION 'Could not locate admin_update_product_with_stock response anchor.';
  END IF;
  EXECUTE rtrim(v_definition, E'; \t\n\r');

  -- Full product listing includes purchase_cost and is finance-only.
  SELECT pg_get_functiondef('private.admin_list_products()'::regprocedure)
    INTO v_definition;
  v_original := v_definition;
  v_definition := replace(v_definition, v_guard_v_jwt,
    'IF NOT public.has_staff_permission(''expenses'') THEN');
  IF v_definition = v_original THEN
    RAISE EXCEPTION 'Could not locate admin_list_products authorization guard.';
  END IF;
  EXECUTE rtrim(v_definition, E'; \t\n\r');

  -- Inventory and product-management RPCs return no purchase cost.
  FOREACH v_signature IN ARRAY v_signatures LOOP
    SELECT pg_get_functiondef(v_signature::regprocedure)
      INTO v_definition;
    v_original := v_definition;
    v_definition := replace(v_definition, v_guard_v_jwt,
      'IF NOT public.has_staff_permission(''products'') THEN');
    v_definition := replace(v_definition, v_guard_auth_jwt,
      'IF NOT public.has_staff_permission(''products'') THEN');
    IF v_definition = v_original THEN
      RAISE EXCEPTION 'Could not locate a products authorization guard in %.', v_signature;
    END IF;
    EXECUTE rtrim(v_definition, E'; \t\n\r');
  END LOOP;
END;
$staff_product_permissions$;


-- Optimistic, validated quick edits. This replaces direct REST PATCH requests
-- for price, stock, purchase cost and product publication state.
CREATE OR REPLACE FUNCTION private.admin_quick_update_product(
  p_product_id text,
  p_field text,
  p_expected_value jsonb,
  p_new_value jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_product public.products%ROWTYPE;
  v_updated public.products%ROWTYPE;
  v_numeric numeric;
  v_stock integer;
  v_published boolean;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_staff_permission('products') THEN
    RAISE EXCEPTION 'პროდუქტის მართვის უფლება არ გაქვთ.'
      USING ERRCODE = '42501';
  END IF;

  IF COALESCE(trim(p_product_id), '') = ''
     OR p_field NOT IN ('price_gel', 'purchase_cost', 'stock', 'is_published')
     OR p_expected_value IS NULL
     OR p_new_value IS NULL THEN
    RAISE EXCEPTION 'პროდუქტის სწრაფი ცვლილების მონაცემები არასწორია.'
      USING ERRCODE = '22023';
  END IF;

  IF p_field = 'purchase_cost'
     AND NOT public.has_staff_permission('expenses') THEN
    RAISE EXCEPTION 'თვითღირებულების შეცვლის უფლება არ გაქვთ.'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
    INTO v_product
    FROM public.products
   WHERE id = p_product_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'პროდუქტი ვერ მოიძებნა.'
      USING ERRCODE = 'P0002';
  END IF;

  IF to_jsonb(v_product) -> p_field IS DISTINCT FROM p_expected_value THEN
    RAISE EXCEPTION 'პროდუქტი პარალელურად შეიცვალა. განაახლეთ სია და სცადეთ ხელახლა.'
      USING ERRCODE = '40001';
  END IF;

  IF p_field IN ('price_gel', 'purchase_cost') THEN
    IF jsonb_typeof(p_new_value) IS DISTINCT FROM 'number' THEN
      RAISE EXCEPTION 'ფასი უნდა იყოს რიცხვი.'
        USING ERRCODE = '22023';
    END IF;

    v_numeric := (p_new_value #>> '{}')::numeric;
    IF v_numeric < 0 OR v_numeric > 1000000000
       OR v_numeric <> round(v_numeric, 2) THEN
      RAISE EXCEPTION 'ფასი უნდა იყოს 0-დან 1,000,000,000-მდე და ჰქონდეს მაქსიმუმ ორი ათწილადი.'
        USING ERRCODE = '22023';
    END IF;

    IF p_field = 'price_gel' THEN
      IF coalesce(v_product.old_price_gel, 0) > 0
         AND v_product.old_price_gel <= v_numeric THEN
        RAISE EXCEPTION 'ჯერ გაასუფთავეთ ან გაზარდეთ ძველი ფასი.'
          USING ERRCODE = '22023';
      END IF;

      IF v_product.flash_sale_ends_at IS NOT NULL
         AND v_product.flash_sale_ends_at > now() THEN
        RAISE EXCEPTION 'ფასის სწრაფი შეცვლა ფლეშ-აქციის დასრულებამდე დაუშვებელია.'
          USING ERRCODE = '22023';
      END IF;

      UPDATE public.products
         SET price_gel = v_numeric
       WHERE id = p_product_id;
    ELSE
      UPDATE public.products
         SET purchase_cost = v_numeric
       WHERE id = p_product_id;
    END IF;

  ELSIF p_field = 'stock' THEN
    IF jsonb_typeof(p_new_value) IS DISTINCT FROM 'number'
       OR coalesce(p_new_value #>> '{}', '') !~ '^[0-9]{1,7} and geostore.variant_stock_adjustment
-- transaction markers are preserved inside the function definitions.
-- The browser cannot read purchase_cost directly. Full product-cost reads
-- remain available only through admin_list_products to expenses-authorized staff.
 THEN
      RAISE EXCEPTION 'მარაგი უნდა იყოს მთელი რიცხვი.'
        USING ERRCODE = '22023';
    END IF;

    v_stock := (p_new_value #>> '{}')::integer;
    IF v_stock NOT BETWEEN 0 AND 1000000 THEN
      RAISE EXCEPTION 'მარაგი უნდა იყოს 0-დან 1,000,000-მდე.'
        USING ERRCODE = '22023';
    END IF;

    IF jsonb_typeof(coalesce(v_product.variants, '[]'::jsonb)) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'პროდუქტის ვარიანტების მონაცემები არასწორია.'
        USING ERRCODE = '22023';
    END IF;
    IF jsonb_array_length(coalesce(v_product.variants, '[]'::jsonb)) > 0 THEN
      RAISE EXCEPTION 'ვარიანტიანი პროდუქტის მარაგი შეცვალეთ თითოეული ვარიანტის მართვის ეკრანიდან.'
        USING ERRCODE = '22023';
    END IF;

    PERFORM set_config('geostore.inventory_reason', 'manual_adjustment', true);
    PERFORM set_config('geostore.inventory_order_id', '', true);
    UPDATE public.products
       SET stock = v_stock
     WHERE id = p_product_id;

  ELSE
    IF jsonb_typeof(p_new_value) IS DISTINCT FROM 'boolean' THEN
      RAISE EXCEPTION 'გამოქვეყნების სტატუსი უნდა იყოს true ან false.'
        USING ERRCODE = '22023';
    END IF;

    v_published := (p_new_value #>> '{}')::boolean;
    UPDATE public.products
       SET is_published = v_published
     WHERE id = p_product_id;
  END IF;

  SELECT *
    INTO v_updated
    FROM public.products
   WHERE id = p_product_id;

  v_result := jsonb_build_object(
    'id', v_updated.id,
    'price_gel', v_updated.price_gel,
    'stock', v_updated.stock,
    'old_price_gel', v_updated.old_price_gel,
    'is_published', v_updated.is_published
  );

  IF public.has_staff_permission('expenses') THEN
    v_result := v_result || jsonb_build_object('purchase_cost', v_updated.purchase_cost);
  END IF;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_quick_update_product(
  p_product_id text,
  p_field text,
  p_expected_value jsonb,
  p_new_value jsonb
)
RETURNS jsonb
LANGUAGE sql
SET search_path = ''
AS $function$
  SELECT private.admin_quick_update_product(
    p_product_id,
    p_field,
    p_expected_value,
    p_new_value
  );
$function$;

REVOKE ALL ON FUNCTION private.admin_quick_update_product(text, text, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.admin_quick_update_product(text, text, jsonb, jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_quick_update_product(text, text, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_quick_update_product(text, text, jsonb, jsonb) TO authenticated;

COMMENT ON FUNCTION public.admin_quick_update_product(text, text, jsonb, jsonb) IS
  'Permission-checked optimistic product quick update. Direct product table writes are disabled for authenticated clients.';

-- The existing geostore.inventory_reason and geostore.variant_stock_adjustment
-- transaction markers are preserved inside the function definitions.
-- The browser cannot read purchase_cost directly. Full product-cost reads
-- remain available only through admin_list_products to expenses-authorized staff.
