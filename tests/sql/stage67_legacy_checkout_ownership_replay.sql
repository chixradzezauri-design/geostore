-- Stage67: prove on the existing disposable PG17 checkout + staff + stock fixture
-- that replaying a historic variant migration would BREAK CHECKOUT (old SQL
-- references v_product.image without selecting it) and also revert owner/
-- gallery/inventory attribution safeguards. NEVER execute against Production.
-- All temporary auth, order, trigger, function and inventory changes ROLLBACK.
\set ON_ERROR_STOP on
\echo 'Stage67: verify original current checkout and actual Stage60 inventory ledger'
DO $check$
BEGIN
  IF to_regprocedure('private.create_order_with_stock(jsonb)') IS NULL
     OR to_regclass('private.inventory_movements') IS NULL
     OR to_regclass('auth.users') IS NULL
     OR (SELECT (e.value->>'stock')::integer
          FROM public.products p,jsonb_array_elements(p.variants) e(value)
          WHERE p.id='STG61-SHOE' AND e.value->>'id'='red-s') <> 4
  THEN RAISE EXCEPTION 'Stage67 original fixture or variant stock changed'; END IF;
  IF EXISTS (SELECT 1 FROM public.orders WHERE id LIKE 'STG67-%') THEN
    RAISE EXCEPTION 'Stage67 synthetic order ID already exists'; END IF;
END $check$;

BEGIN;
  INSERT INTO auth.users(id,email_confirmed_at)
  VALUES ('67000000-0000-4000-8000-000000000001', now());
  SAVEPOINT stage67_clean_original;

  \echo 'Stage67: current checked-out private RPC associates authenticated order with owner'
  SET ROLE authenticated;
  SET request.jwt.claim.sub='67000000-0000-4000-8000-000000000001';
  SET request.jwt.claim.jwt='{"email":"member@stage67.test"}';
  DO $current$
  DECLARE receipt jsonb;
  BEGIN
    receipt := public.create_order_with_stock(jsonb_build_object(
      'id','STG67-CURRENT-AUTH-001',
      'customer_name','Stage67 Synthetic Member',
      'phone','+995555123456','address','Fixture address 7',
      'user_email','member@stage67.test',
      'customer_email','member@stage67.test',
      'delivery_region','tbilisi',
      'items',jsonb_build_array(jsonb_build_object(
        'id','STG61-SHOE','quantity',1,'custom_variant_id','red-s',
        'selected_size','S','selected_color','Red'
      ))
    ));
    IF receipt->>'total_gel' <> '125'
       OR receipt->'items'->0->>'customVariantId' <> 'red-s'
       OR receipt->'items'->0 ?| ARRAY[
         'purchase_cost','purchaseCost','cost_price','costPrice','vendor',
         'supplier','supplierName'
       ]
    THEN RAISE EXCEPTION 'Stage67 current authenticated checkout receipt changed'; END IF;
  END $current$;
  RESET ROLE;
  RESET request.jwt.claim.sub;
  RESET request.jwt.claim.jwt;

  DO $current_assert$
  BEGIN
    IF (SELECT user_id FROM public.orders WHERE id='STG67-CURRENT-AUTH-001')
          IS DISTINCT FROM '67000000-0000-4000-8000-000000000001'::uuid
       OR (SELECT items->0->'gallery' FROM public.orders
            WHERE id='STG67-CURRENT-AUTH-001')
          IS DISTINCT FROM '["https://fixture.example/shoe.png"]'::jsonb
       OR (SELECT count(*) FROM private.inventory_movements
            WHERE related_order_id='STG67-CURRENT-AUTH-001'
              AND reason='order_deduction' AND quantity_delta=-1) <> 1
    THEN RAISE EXCEPTION 'Stage67 current function must preserve account ownership, gallery and order ledger'; END IF;
  END $current_assert$;

  -- Undo current checkout, preserving only the fake auth identity until
  -- final ROLLBACK. This guarantees equal stock and product fixtures.
  ROLLBACK TO SAVEPOINT stage67_clean_original;
  DO $clean_current$
  BEGIN
    IF EXISTS (SELECT 1 FROM public.orders WHERE id LIKE 'STG67-%')
       OR EXISTS (SELECT 1 FROM private.inventory_movements WHERE related_order_id LIKE 'STG67-%')
       OR (SELECT (e.value->>'stock')::integer
           FROM public.products p,jsonb_array_elements(p.variants) e(value)
           WHERE p.id='STG61-SHOE' AND e.value->>'id'='red-s') <> 4
    THEN RAISE EXCEPTION 'Stage67 checkout savepoint failed to restore stock/orders'; END IF;
  END $clean_current$;

  \echo 'Stage67: temporarily replay EXACT old checkout function body only'
  \i /tmp/stage67_original_legacy_variant_checkout.sql

  SET ROLE authenticated;
  SET request.jwt.claim.sub='67000000-0000-4000-8000-000000000001';
  SET request.jwt.claim.jwt='{"email":"member@stage67.test"}';
  DO $legacy$
  DECLARE
    v_error text;
    v_failed boolean := false;
  BEGIN
    BEGIN
      PERFORM public.create_order_with_stock(jsonb_build_object(
        'id','STG67-LEGACY-AUTH-001',
        'customer_name','Stage67 Synthetic Member',
        'phone','+995555123456','address','Fixture address 7',
        'user_email','member@stage67.test',
        'customer_email','member@stage67.test',
        'delivery_region','tbilisi',
        'items',jsonb_build_array(jsonb_build_object(
          'id','STG61-SHOE','quantity',1,'custom_variant_id','red-s',
          'selected_size','S','selected_color','Red'
        ))
      ));
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_error = MESSAGE_TEXT;
      -- The old query omits v_product.image from SELECT but references it
      -- later. Accept ONLY this exact runtime regression, not an unrelated
      -- authorization/stock/DDL/network failure.
      IF v_error <> 'record "v_product" has no field "image"' THEN
        RAISE EXCEPTION 'Stage67 unexpected legacy checkout failure: %', v_error;
      END IF;
      v_failed := true;
    END;
    IF NOT v_failed THEN
      RAISE EXCEPTION 'Stage67 obsolete checkout unexpectedly succeeded';
    END IF;
  END $legacy$;
  RESET ROLE;
  RESET request.jwt.claim.sub;
  RESET request.jwt.claim.jwt;

  \echo 'Stage67: original legacy checkout fails before order/stock/ledger mutation'
  DO $legacy_regression$
  BEGIN
    IF (SELECT count(*) FROM public.orders WHERE id LIKE 'STG67-%') <> 0
       OR (SELECT count(*) FROM private.inventory_movements
            WHERE related_order_id LIKE 'STG67-%') <> 0
       OR (SELECT (e.value->>'stock')::integer
            FROM public.products p,jsonb_array_elements(p.variants) e(value)
            WHERE p.id='STG61-SHOE' AND e.value->>'id'='red-s') <> 4
    THEN RAISE EXCEPTION 'Stage67 failed obsolete checkout changed orders/stock/ledger'; END IF;
    IF position('user_email, user_id, customer_email'
                 IN pg_get_functiondef('private.create_order_with_stock(jsonb)'::regprocedure)) > 0
       OR position('geostore.inventory_reason'
                 IN pg_get_functiondef('private.create_order_with_stock(jsonb)'::regprocedure)) > 0
    THEN RAISE EXCEPTION 'Stage67 function was not actually replaced with the legacy source'; END IF;
  END $legacy_regression$;

ROLLBACK;

\echo 'Stage67: verify rollback restored current function and removed synthetic account/order'
DO $after_rollback$
DECLARE def text;
BEGIN
  def := pg_get_functiondef('private.create_order_with_stock(jsonb)'::regprocedure);
  IF position('user_email, user_id, customer_email' IN def) = 0
     OR position('geostore.inventory_reason' IN def)=0
     OR position('''gallery''' IN def)=0
     OR EXISTS (SELECT 1 FROM public.orders WHERE id LIKE 'STG67-%')
     OR EXISTS (SELECT 1 FROM auth.users WHERE id='67000000-0000-4000-8000-000000000001')
     OR EXISTS (SELECT 1 FROM private.inventory_movements
                 WHERE related_order_id LIKE 'STG67-%')
     OR (SELECT (e.value->>'stock')::integer
        FROM public.products p,jsonb_array_elements(p.variants) e(value)
        WHERE p.id='STG61-SHOE' AND e.value->>'id'='red-s') <> 4
  THEN RAISE EXCEPTION 'Stage67 transaction rollback did not preserve the current checkout schema and inventory'; END IF;
END $after_rollback$;
\echo 'PASS Stage67 PG17: original obsolete checkout throws exact missing-image-field error before stock/order mutation; current ownership/gallery/ledger preserved after rollback'
