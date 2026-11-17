-- Stage 103B: enforce the products permission while keeping purchase cost
-- visible only to staff with the separate expenses permission (or the owner).

DROP POLICY IF EXISTS "Admin can insert products" ON public.products;
CREATE POLICY "Staff with products permission can insert products"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_staff_permission('products'));

DROP POLICY IF EXISTS "Admin can read all products" ON public.products;
CREATE POLICY "Staff with products permission can read all products"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (public.has_staff_permission('products'));

DROP POLICY IF EXISTS "Admin can update products" ON public.products;
CREATE POLICY "Staff with products permission can update products"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (public.has_staff_permission('products'))
  WITH CHECK (public.has_staff_permission('products'));

-- Remove table-level write grants so a module permission cannot be used to
-- bypass the protected product RPCs. Keep the existing safe column grants,
-- but explicitly deny direct access to purchase_cost.
REVOKE INSERT, UPDATE ON TABLE public.products FROM authenticated;
REVOKE INSERT (purchase_cost), UPDATE (purchase_cost), SELECT (purchase_cost)
  ON TABLE public.products FROM authenticated;


DO $staff_product_permissions$
DECLARE
  v_definition text;
  v_original text;
  v_guard_v_jwt text := E'IF COALESCE(v_jwt -> ''app_metadata'' ->> ''role'', '''') <> ''admin''\n     OR auth.uid() IS DISTINCT FROM ''1060de3d-d28a-45f8-9a64-5e0368cffc4b''::uuid THEN';
  v_guard_auth_jwt text := E'IF auth.uid() IS NULL\n     OR coalesce(auth.jwt()->''app_metadata''->>''role'', '''') <> ''admin''\n     OR auth.uid() IS DISTINCT FROM ''1060de3d-d28a-45f8-9a64-5e0368cffc4b''::uuid THEN';
  v_guard_v_jwt_lower text := E'if auth.uid() is null\n     or coalesce(v_jwt -> ''app_metadata'' ->> ''role'', '''') <> ''admin''\n     or auth.uid() is distinct from ''1060de3d-d28a-45f8-9a64-5e0368cffc4b''::uuid then';
BEGIN
  -- Product creation: require products permission and ignore client-supplied
  -- purchase cost unless the caller also has finance/expenses permission.
  SELECT pg_get_functiondef('private.admin_save_product(jsonb)'::regprocedure)
    INTO v_definition;
  v_original := v_definition;
  v_definition := replace(v_definition, v_guard_v_jwt,
    'IF NOT public.has_staff_permission(''products'') THEN');
  IF v_definition = v_original THEN
    RAISE EXCEPTION 'Could not locate admin_save_product authorization guard.';
  END IF;
  v_definition := replace(
    v_definition,
    E'  END IF;\n\n  -- This RPC is used only for product creation.',
    E'  END IF;\n\n  IF NOT public.has_staff_permission(''expenses'') THEN\n    p_product := jsonb_set(p_product, ''{purchase_cost}'', ''null''::jsonb, true);\n  END IF;\n\n  -- This RPC is used only for product creation.'
  );
  EXECUTE regexp_replace(v_definition, ';[[:space:]]*

  -- Product update: preserve the existing cost for product-only staff and
  -- remove that field from the JSON response so it cannot leak via the RPC.
  SELECT pg_get_functiondef('private.admin_update_product_with_stock(jsonb,jsonb,jsonb)'::regprocedure)
    INTO v_definition;
  v_original := v_definition;
  v_definition := replace(v_definition, v_guard_v_jwt_lower,
    'if not public.has_staff_permission(''products'') then');
  IF v_definition = v_original THEN
    RAISE EXCEPTION 'Could not locate admin_update_product_with_stock authorization guard.';
  END IF;
  v_definition := replace(
    v_definition,
    E'  v_product_id := nullif(trim(p_product ->> ''id''), '''');',
    E'  v_product_id := nullif(trim(p_product ->> ''id''), '''');\n  IF NOT public.has_staff_permission(''expenses'') THEN\n    p_product := p_product - ''purchase_cost'';\n  END IF;'
  );
  v_definition := replace(
    v_definition,
    E'  select to_jsonb(p)\n    into v_product_result\n    from public.products as p\n   where p.id = v_product_id;',
    E'  select to_jsonb(p)\n    into v_product_result\n    from public.products as p\n   where p.id = v_product_id;\n\n  IF NOT public.has_staff_permission(''expenses'') THEN\n    v_product_result := v_product_result - ''purchase_cost'';\n  END IF;'
  );
  EXECUTE v_definition;

  -- The full product listing contains purchase_cost and is therefore a
  -- finance-only endpoint, not a general products-module endpoint.
  SELECT pg_get_functiondef('private.admin_list_products()'::regprocedure)
    INTO v_definition;
  v_original := v_definition;
  v_definition := replace(v_definition, v_guard_v_jwt,
    'IF NOT public.has_staff_permission(''expenses'') THEN');
  IF v_definition = v_original THEN
    RAISE EXCEPTION 'Could not locate admin_list_products authorization guard.';
  END IF;
  EXECUTE v_definition;

  -- The remaining product and inventory functions return no purchase cost.
  -- Replace their exact owner-only checks with the products module permission.
  FOR v_definition IN
    SELECT pg_get_functiondef(p.oid)
      FROM pg_proc AS p
      JOIN pg_namespace AS n ON n.oid = p.pronamespace
     WHERE n.nspname = 'private'
       AND (
         (p.proname = 'admin_delete_product' AND pg_get_function_identity_arguments(p.oid) = 'p_product_id text')
         OR (p.proname = 'admin_set_product_custom_variant_stocks' AND pg_get_function_identity_arguments(p.oid) = 'p_product_id text, p_variant_stocks jsonb')
         OR (p.proname = 'admin_set_product_variant_stock_batches' AND pg_get_function_identity_arguments(p.oid) = 'p_product_id text, p_size_color_stocks jsonb, p_custom_variant_stocks jsonb')
         OR (p.proname = 'admin_set_product_variant_stocks' AND pg_get_function_identity_arguments(p.oid) = 'p_product_id text, p_variant_stocks jsonb')
         OR (p.proname = 'list_inventory_movements' AND pg_get_function_identity_arguments(p.oid) = 'p_product_id text, p_before_id bigint, p_limit integer')
         OR (p.proname = 'list_inventory_replenishment_settings' AND pg_get_function_identity_arguments(p.oid) = 'p_limit integer')
         OR (p.proname = 'save_inventory_replenishment_setting' AND pg_get_function_identity_arguments(p.oid) = 'p_product_id text, p_variant_id text, p_low_stock_threshold integer, p_target_stock integer')
       )
  LOOP
    v_original := v_definition;
    v_definition := replace(v_definition, v_guard_v_jwt,
      'IF NOT public.has_staff_permission(''products'') THEN');
    v_definition := replace(v_definition, v_guard_auth_jwt,
      'IF NOT public.has_staff_permission(''products'') THEN');
    IF v_definition = v_original THEN
      RAISE EXCEPTION 'Could not locate a product authorization guard in a protected product/inventory function.';
    END IF;
    EXECUTE v_definition;
  END LOOP;
END;
$staff_product_permissions$;

-- The browser cannot read purchase_cost directly. Full product-cost reads
-- remain available only through admin_list_products to expenses-authorized staff.
, '');

  -- Product update: preserve the existing cost for product-only staff and
  -- remove that field from the JSON response so it cannot leak via the RPC.
  SELECT pg_get_functiondef('private.admin_update_product_with_stock(jsonb,jsonb,jsonb)'::regprocedure)
    INTO v_definition;
  v_original := v_definition;
  v_definition := replace(v_definition, v_guard_v_jwt_lower,
    'if not public.has_staff_permission(''products'') then');
  IF v_definition = v_original THEN
    RAISE EXCEPTION 'Could not locate admin_update_product_with_stock authorization guard.';
  END IF;
  v_definition := replace(
    v_definition,
    E'  v_product_id := nullif(trim(p_product ->> ''id''), '''');',
    E'  v_product_id := nullif(trim(p_product ->> ''id''), '''');\n  IF NOT public.has_staff_permission(''expenses'') THEN\n    p_product := p_product - ''purchase_cost'';\n  END IF;'
  );
  v_definition := replace(
    v_definition,
    E'  select to_jsonb(p)\n    into v_product_result\n    from public.products as p\n   where p.id = v_product_id;',
    E'  select to_jsonb(p)\n    into v_product_result\n    from public.products as p\n   where p.id = v_product_id;\n\n  IF NOT public.has_staff_permission(''expenses'') THEN\n    v_product_result := v_product_result - ''purchase_cost'';\n  END IF;'
  );
  EXECUTE regexp_replace(v_definition, ';[[:space:]]*

  -- The full product listing contains purchase_cost and is therefore a
  -- finance-only endpoint, not a general products-module endpoint.
  SELECT pg_get_functiondef('private.admin_list_products()'::regprocedure)
    INTO v_definition;
  v_original := v_definition;
  v_definition := replace(v_definition, v_guard_v_jwt,
    'IF NOT public.has_staff_permission(''expenses'') THEN');
  IF v_definition = v_original THEN
    RAISE EXCEPTION 'Could not locate admin_list_products authorization guard.';
  END IF;
  EXECUTE v_definition;

  -- The remaining product and inventory functions return no purchase cost.
  -- Replace their exact owner-only checks with the products module permission.
  FOR v_definition IN
    SELECT pg_get_functiondef(p.oid)
      FROM pg_proc AS p
      JOIN pg_namespace AS n ON n.oid = p.pronamespace
     WHERE n.nspname = 'private'
       AND (
         (p.proname = 'admin_delete_product' AND pg_get_function_identity_arguments(p.oid) = 'p_product_id text')
         OR (p.proname = 'admin_set_product_custom_variant_stocks' AND pg_get_function_identity_arguments(p.oid) = 'p_product_id text, p_variant_stocks jsonb')
         OR (p.proname = 'admin_set_product_variant_stock_batches' AND pg_get_function_identity_arguments(p.oid) = 'p_product_id text, p_size_color_stocks jsonb, p_custom_variant_stocks jsonb')
         OR (p.proname = 'admin_set_product_variant_stocks' AND pg_get_function_identity_arguments(p.oid) = 'p_product_id text, p_variant_stocks jsonb')
         OR (p.proname = 'list_inventory_movements' AND pg_get_function_identity_arguments(p.oid) = 'p_product_id text, p_before_id bigint, p_limit integer')
         OR (p.proname = 'list_inventory_replenishment_settings' AND pg_get_function_identity_arguments(p.oid) = 'p_limit integer')
         OR (p.proname = 'save_inventory_replenishment_setting' AND pg_get_function_identity_arguments(p.oid) = 'p_product_id text, p_variant_id text, p_low_stock_threshold integer, p_target_stock integer')
       )
  LOOP
    v_original := v_definition;
    v_definition := replace(v_definition, v_guard_v_jwt,
      'IF NOT public.has_staff_permission(''products'') THEN');
    v_definition := replace(v_definition, v_guard_auth_jwt,
      'IF NOT public.has_staff_permission(''products'') THEN');
    IF v_definition = v_original THEN
      RAISE EXCEPTION 'Could not locate a product authorization guard in a protected product/inventory function.';
    END IF;
    EXECUTE v_definition;
  END LOOP;
END;
$staff_product_permissions$;

-- The browser cannot read purchase_cost directly. Full product-cost reads
-- remain available only through admin_list_products to expenses-authorized staff.
, '');

  -- The full product listing contains purchase_cost and is therefore a
  -- finance-only endpoint, not a general products-module endpoint.
  SELECT pg_get_functiondef('private.admin_list_products()'::regprocedure)
    INTO v_definition;
  v_original := v_definition;
  v_definition := replace(v_definition, v_guard_v_jwt,
    'IF NOT public.has_staff_permission(''expenses'') THEN');
  IF v_definition = v_original THEN
    RAISE EXCEPTION 'Could not locate admin_list_products authorization guard.';
  END IF;
  EXECUTE regexp_replace(v_definition, ';[[:space:]]*

  -- The remaining product and inventory functions return no purchase cost.
  -- Replace their exact owner-only checks with the products module permission.
  FOR v_definition IN
    SELECT pg_get_functiondef(p.oid)
      FROM pg_proc AS p
      JOIN pg_namespace AS n ON n.oid = p.pronamespace
     WHERE n.nspname = 'private'
       AND (
         (p.proname = 'admin_delete_product' AND pg_get_function_identity_arguments(p.oid) = 'p_product_id text')
         OR (p.proname = 'admin_set_product_custom_variant_stocks' AND pg_get_function_identity_arguments(p.oid) = 'p_product_id text, p_variant_stocks jsonb')
         OR (p.proname = 'admin_set_product_variant_stock_batches' AND pg_get_function_identity_arguments(p.oid) = 'p_product_id text, p_size_color_stocks jsonb, p_custom_variant_stocks jsonb')
         OR (p.proname = 'admin_set_product_variant_stocks' AND pg_get_function_identity_arguments(p.oid) = 'p_product_id text, p_variant_stocks jsonb')
         OR (p.proname = 'list_inventory_movements' AND pg_get_function_identity_arguments(p.oid) = 'p_product_id text, p_before_id bigint, p_limit integer')
         OR (p.proname = 'list_inventory_replenishment_settings' AND pg_get_function_identity_arguments(p.oid) = 'p_limit integer')
         OR (p.proname = 'save_inventory_replenishment_setting' AND pg_get_function_identity_arguments(p.oid) = 'p_product_id text, p_variant_id text, p_low_stock_threshold integer, p_target_stock integer')
       )
  LOOP
    v_original := v_definition;
    v_definition := replace(v_definition, v_guard_v_jwt,
      'IF NOT public.has_staff_permission(''products'') THEN');
    v_definition := replace(v_definition, v_guard_auth_jwt,
      'IF NOT public.has_staff_permission(''products'') THEN');
    IF v_definition = v_original THEN
      RAISE EXCEPTION 'Could not locate a product authorization guard in a protected product/inventory function.';
    END IF;
    EXECUTE v_definition;
  END LOOP;
END;
$staff_product_permissions$;

-- The browser cannot read purchase_cost directly. Full product-cost reads
-- remain available only through admin_list_products to expenses-authorized staff.
, '');

  -- The remaining product and inventory functions return no purchase cost.
  -- Replace their exact owner-only checks with the products module permission.
  FOR v_definition IN
    SELECT pg_get_functiondef(p.oid)
      FROM pg_proc AS p
      JOIN pg_namespace AS n ON n.oid = p.pronamespace
     WHERE n.nspname = 'private'
       AND (
         (p.proname = 'admin_delete_product' AND pg_get_function_identity_arguments(p.oid) = 'p_product_id text')
         OR (p.proname = 'admin_set_product_custom_variant_stocks' AND pg_get_function_identity_arguments(p.oid) = 'p_product_id text, p_variant_stocks jsonb')
         OR (p.proname = 'admin_set_product_variant_stock_batches' AND pg_get_function_identity_arguments(p.oid) = 'p_product_id text, p_size_color_stocks jsonb, p_custom_variant_stocks jsonb')
         OR (p.proname = 'admin_set_product_variant_stocks' AND pg_get_function_identity_arguments(p.oid) = 'p_product_id text, p_variant_stocks jsonb')
         OR (p.proname = 'list_inventory_movements' AND pg_get_function_identity_arguments(p.oid) = 'p_product_id text, p_before_id bigint, p_limit integer')
         OR (p.proname = 'list_inventory_replenishment_settings' AND pg_get_function_identity_arguments(p.oid) = 'p_limit integer')
         OR (p.proname = 'save_inventory_replenishment_setting' AND pg_get_function_identity_arguments(p.oid) = 'p_product_id text, p_variant_id text, p_low_stock_threshold integer, p_target_stock integer')
       )
  LOOP
    v_original := v_definition;
    v_definition := replace(v_definition, v_guard_v_jwt,
      'IF NOT public.has_staff_permission(''products'') THEN');
    v_definition := replace(v_definition, v_guard_auth_jwt,
      'IF NOT public.has_staff_permission(''products'') THEN');
    IF v_definition = v_original THEN
      RAISE EXCEPTION 'Could not locate a product authorization guard in a protected product/inventory function.';
    END IF;
    EXECUTE regexp_replace(v_definition, ';[[:space:]]*
  END LOOP;
END;
$staff_product_permissions$;

-- The browser cannot read purchase_cost directly. Full product-cost reads
-- remain available only through admin_list_products to expenses-authorized staff.
, '');
  END LOOP;
END;
$staff_product_permissions$;

-- The browser cannot read purchase_cost directly. Full product-cost reads
-- remain available only through admin_list_products to expenses-authorized staff.
