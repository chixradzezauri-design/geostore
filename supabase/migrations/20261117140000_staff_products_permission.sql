-- Stage 103B: enforce the products permission while keeping purchase cost
-- visible only to staff with the separate expenses permission (or the owner).

DROP POLICY IF EXISTS "Admin can insert products" ON public.products;
CREATE POLICY "Staff with products permission can insert products"
  ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (public.has_staff_permission('products'));

DROP POLICY IF EXISTS "Admin can read all products" ON public.products;
CREATE POLICY "Staff with products permission can read all products"
  ON public.products
  FOR SELECT TO authenticated
  USING (public.has_staff_permission('products'));

DROP POLICY IF EXISTS "Admin can update products" ON public.products;
CREATE POLICY "Staff with products permission can update products"
  ON public.products
  FOR UPDATE TO authenticated
  USING (public.has_staff_permission('products'))
  WITH CHECK (public.has_staff_permission('products'));

-- Remove table-level grants and deny direct purchase_cost access. Existing
-- non-sensitive column grants remain available under the products RLS policy.
REVOKE INSERT, UPDATE ON TABLE public.products FROM authenticated;
REVOKE INSERT (purchase_cost), UPDATE (purchase_cost), SELECT (purchase_cost)
  ON TABLE public.products FROM authenticated;

DO $staff_product_permissions$
DECLARE
  v_definition text;
  v_original text;
  v_signature text;
  v_guard_v_jwt text := E'IF COALESCE(v_jwt -> ''app_metadata'' ->> ''role'', '''') <> ''admin''\n     OR auth.uid() IS DISTINCT FROM ''1060de3d-d28a-45f8-9a64-5e0368cffc4b''::uuid THEN';
  v_guard_auth_jwt text := E'IF auth.uid() IS NULL\n     OR coalesce(auth.jwt()->''app_metadata''->>''role'', '''') <> ''admin''\n     OR auth.uid() IS DISTINCT FROM ''1060de3d-d28a-45f8-9a64-5e0368cffc4b''::uuid THEN';
  v_guard_v_jwt_lower text := E'if auth.uid() is null\n     or coalesce(v_jwt -> ''app_metadata'' ->> ''role'', '''') <> ''admin''\n     or auth.uid() is distinct from ''1060de3d-d28a-45f8-9a64-5e0368cffc4b''::uuid then';
  v_signatures text[] := ARRAY[
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

-- The existing geostore.inventory_reason and geostore.variant_stock_adjustment
-- transaction markers are preserved inside the function definitions.
-- The browser cannot read purchase_cost directly. Full product-cost reads
-- remain available only through admin_list_products to expenses-authorized staff.
