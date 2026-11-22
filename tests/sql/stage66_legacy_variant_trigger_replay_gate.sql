-- Stage66: demonstrate a concrete migration replay incompatibility in the
-- EXISTING disposable PG17 database, after real Stage61/62 custom-variant tests.
-- This must never connect to Supabase Production or use real customer/stock rows.
-- Intentionally execute the ORIGINAL legacy variant trigger SQL inside a
-- transaction that is rolled back, proving why blind db push is unsafe.
\set ON_ERROR_STOP on

\echo 'Stage66: verify newer custom variants exist and obsolete trigger is absent'
DO $check$
BEGIN
  IF to_regprocedure('private.create_order_with_stock(jsonb)') IS NULL
     OR to_regclass('public.orders') IS NULL
     OR (SELECT count(*) FROM public.products WHERE id='STG61-SHOE') <> 1
     OR EXISTS (
       SELECT 1 FROM pg_trigger
       WHERE tgrelid='public.orders'::regclass
         AND tgname='orders_validate_item_variants'
         AND NOT tgisinternal
     )
  THEN RAISE EXCEPTION 'Stage66 incompatible fixture baseline or old trigger already installed'; END IF;
  IF (SELECT (v.value->>'stock')::integer
      FROM public.products p,
           jsonb_array_elements(p.variants) v(value)
      WHERE p.id='STG61-SHOE' AND v.value->>'id'='red-s') <> 4
  THEN RAISE EXCEPTION 'Stage66 Stage62 red-s inventory baseline changed'; END IF;
END $check$;

\echo 'Stage66: use an atomic scratch transaction; all changes MUST rollback'
BEGIN;
  UPDATE public.products
     SET available_sizes='[]'::jsonb, available_colors='[]'::jsonb
   WHERE id='STG61-SHOE';
  -- The modern catalog permits variant-defined S/Red even when legacy
  -- available_sizes/available_colors arrays are empty. Do not alter variants.
  SAVEPOINT stage66_before_valid_checkout;

  SET ROLE anon;
  SET request.jwt.claim.sub='';
  SET request.jwt.claim.jwt='{}';
  DO $valid$
  DECLARE
    v_request jsonb;
    v_receipt jsonb;
  BEGIN
    v_request := jsonb_build_object(
      'id','STG66-VALID-RED-S-001',
      'customer_name','Stage66 Synthetic Customer',
      'phone','+995555123456','address','Fixture address 7',
      'user_email','guest','customer_email','guest@stage66.test',
      'delivery_region','tbilisi',
      'items',jsonb_build_array(
        jsonb_build_object(
          'id','STG61-SHOE','quantity',1,'custom_variant_id','red-s',
          'selected_size','S','selected_color','Red'
        )
      )
    );
    -- Call the REAL Stage61 private checkout behind the REAL Stage51 redacting
    -- public wrapper, not a fixture-implemented version.
    v_receipt := public.create_order_with_stock(v_request);
    IF v_receipt->>'stock_deducted' <> 'true'
       OR v_receipt->'items'->0->>'customVariantId' <> 'red-s'
       OR v_receipt->'items'->0->>'selectedSize' <> 'S'
       OR v_receipt->'items'->0->>'selectedColor' <> 'Red'
       OR v_receipt->'items'->0 ?| ARRAY[
         'purchase_cost','purchaseCost','cost_price','costPrice',
         'vendor','supplier','supplierName'
       ]
    THEN RAISE EXCEPTION 'Stage66 modern variant checkout was not accepted and redacted'; END IF;
  END $valid$;

  RESET ROLE;
  RESET request.jwt.claim.sub;
  RESET request.jwt.claim.jwt;

  -- Undo test checkout, stock changes and inventory ledger, but retain the
  -- temporary catalog shape to test the old trigger against the same request.
  ROLLBACK TO SAVEPOINT stage66_before_valid_checkout;

  DO $no_writes$
  BEGIN
    IF EXISTS (SELECT 1 FROM public.orders WHERE id='STG66-VALID-RED-S-001')
       OR EXISTS (SELECT 1 FROM private.inventory_movements
                  WHERE related_order_id='STG66-VALID-RED-S-001')
    THEN RAISE EXCEPTION 'Stage66 pre-trigger checkout savepoint failed to roll back'; END IF;
  END $no_writes$;

  \echo 'Stage66: install exact obsolete trigger only inside ROLLBACK transaction'
  \ir ../../supabase/migrations/20261106120000_validate_order_item_variants.sql

  DO $installed$
  BEGIN
    IF NOT EXISTS (
       SELECT 1 FROM pg_trigger
       WHERE tgrelid='public.orders'::regclass
         AND tgname='orders_validate_item_variants' AND NOT tgisinternal
    ) THEN RAISE EXCEPTION 'Stage66 original legacy trigger SQL not installed in disposable tx'; END IF;
  END $installed$;

  SET ROLE anon;
  SET request.jwt.claim.sub='';
  SET request.jwt.claim.jwt='{}';

  DO $legacy$
  DECLARE
    v_request jsonb;
    v_error text;
    v_rejected boolean := false;
  BEGIN
    v_request := jsonb_build_object(
      'id','STG66-LEGACY-REPLAY-001',
      'customer_name','Stage66 Synthetic Customer',
      'phone','+995555123456','address','Fixture address 7',
      'user_email','guest','customer_email','guest@stage66.test',
      'delivery_region','tbilisi',
      'items',jsonb_build_array(
        jsonb_build_object(
          'id','STG61-SHOE','quantity',1,'custom_variant_id','red-s',
          'selected_size','S','selected_color','Red'
        )
      )
    );
    BEGIN
      PERFORM public.create_order_with_stock(v_request);
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_error = MESSAGE_TEXT;
      -- Do not accept a missing-permission, bad fixture, or stock error as
      -- proof. Require specifically the obsolete size-catalog rejection.
      IF v_error NOT LIKE '%არჩეული ზომა ამ პროდუქტისთვის ხელმისაწვდომი არ არის%' THEN
        RAISE EXCEPTION 'Stage66 unexpected error instead of legacy incompatibility: %',v_error;
      END IF;
      v_rejected := true;
    END;
    IF NOT v_rejected THEN
      RAISE EXCEPTION 'Stage66 legacy variant trigger unexpectedly accepted catalog-only custom variant';
    END IF;
  END $legacy$;

  RESET ROLE;
  RESET request.jwt.claim.sub;
  RESET request.jwt.claim.jwt;

  DO $invariant$
  BEGIN
    IF EXISTS (SELECT 1 FROM public.orders WHERE id LIKE 'STG66-%')
       OR EXISTS (SELECT 1 FROM private.inventory_movements
                  WHERE related_order_id LIKE 'STG66-%')
       OR (SELECT (v.value->>'stock')::integer
           FROM public.products p, jsonb_array_elements(p.variants) v(value)
           WHERE p.id='STG61-SHOE' AND v.value->>'id'='red-s') <> 4
    THEN RAISE EXCEPTION 'Stage66 rejected legacy checkout modified orders, stock or ledger'; END IF;
  END $invariant$;

ROLLBACK;

\echo 'Stage66: verify old trigger, catalog edit and every test order disappeared'
DO $clean$
BEGIN
  IF EXISTS (
     SELECT 1 FROM pg_trigger
      WHERE tgrelid='public.orders'::regclass
        AND tgname='orders_validate_item_variants' AND NOT tgisinternal
  )
     OR to_regprocedure('private.validate_order_item_variants()') IS NOT NULL
     OR EXISTS (SELECT 1 FROM public.orders WHERE id LIKE 'STG66-%')
     OR EXISTS (SELECT 1 FROM private.inventory_movements
                WHERE related_order_id LIKE 'STG66-%')
     OR (SELECT available_sizes FROM public.products WHERE id='STG61-SHOE')
          IS DISTINCT FROM '["S","M"]'::jsonb
  THEN RAISE EXCEPTION 'Stage66 rollback did not restore original isolated schema/data'; END IF;
END $clean$;
\echo 'PASS Stage66: unmodified legacy variant trigger rejects a VALID modern custom-variant checkout; no schema, stock or order changes persist'
