-- Stage66: prove whether the obsolete 20261106210000 INSERT validator can
-- safely be replayed on the current real private checkout in disposable PG17.
-- NO live Supabase connection, real checkout, production migration, or charges.
-- Source SQL is applied without its own BEGIN/COMMIT (extracted verbatim)
-- INSIDE this disposable ROLLBACK transaction only.
\set ON_ERROR_STOP on
\echo 'Stage66: begin rollback-only legacy checkout insert compatibility test'

DO $before$
BEGIN
  IF to_regprocedure('private.create_order_with_stock(jsonb)') IS NULL
     OR to_regprocedure('private.validate_order_checkout_input()') IS NOT NULL
     OR EXISTS (
       SELECT 1 FROM pg_trigger
        WHERE tgrelid='public.orders'::regclass
          AND tgname='validate_order_checkout_input_before_insert'
          AND NOT tgisinternal
     )
  THEN RAISE EXCEPTION 'Stage66 real checkout fixture missing or obsolete trigger already installed'; END IF;
  IF (SELECT (e.value->>'stock')::integer
      FROM public.products p, jsonb_array_elements(p.variants) e(value)
      WHERE p.id='STG61-SHOE' AND e.value->>'id'='red-s') <> 4
  THEN RAISE EXCEPTION 'Stage66 expected Stage62 variant stock baseline missing'; END IF;
END $before$;

BEGIN;
  SAVEPOINT stage66_clean_baseline;

  \echo 'Stage66: current real checkout accepts a valid guest WITHOUT optional email'
  SET ROLE anon;
  SET request.jwt.claim.sub='';
  SET request.jwt.claim.jwt='{}';
  DO $existing$
  DECLARE v_receipt jsonb;
  BEGIN
    v_receipt := public.create_order_with_stock(jsonb_build_object(
      'id','STG66-NO-EMAIL-BASELINE',
      'customer_name','Stage66 Synthetic Guest',
      'phone','+995555123456','address','Fixture address 7',
      'user_email','guest',
      -- customer_email absent by design: valid for the existing real RPC.
      'delivery_region','tbilisi',
      'items',jsonb_build_array(jsonb_build_object(
        'id','STG61-SHOE','quantity',1,'custom_variant_id','red-s',
        'selected_size','S','selected_color','Red'
      ))
    ));
    IF v_receipt->>'stock_deducted' <> 'true'
       OR v_receipt->>'total_gel' <> '125'
       OR v_receipt->'items'->0->>'customVariantId' <> 'red-s'
       OR v_receipt->'items'->0->>'selectedSize' <> 'S'
       OR v_receipt->'items'->0 ?| ARRAY[
         'purchase_cost','purchaseCost','cost_price','costPrice','vendor',
         'supplier','supplierName'
       ]
    THEN RAISE EXCEPTION 'Stage66 live-compatible guest checkout changed or leaked finance'; END IF;
  END $existing$;
  RESET ROLE;
  RESET request.jwt.claim.sub;
  RESET request.jwt.claim.jwt;

  -- Undo the successful order, variant deduction and audit ledger while
  -- keeping the same preexisting synthetic product and staff fixture.
  ROLLBACK TO SAVEPOINT stage66_clean_baseline;

  DO $baseline$
  BEGIN
    IF EXISTS (SELECT 1 FROM public.orders WHERE id LIKE 'STG66-%')
       OR EXISTS (SELECT 1 FROM private.inventory_movements
                  WHERE related_order_id LIKE 'STG66-%')
       OR (SELECT (e.value->>'stock')::integer
           FROM public.products p,jsonb_array_elements(p.variants) e(value)
           WHERE p.id='STG61-SHOE' AND e.value->>'id'='red-s') <> 4
    THEN RAISE EXCEPTION 'Stage66 baseline savepoint rollback failed'; END IF;
  END $baseline$;

  \echo 'Stage66: install ORIGINAL old migration statements within outer rollback'
  \i /tmp/stage66_original_checkout_validator_only.sql

  DO $installed$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
       WHERE tgrelid='public.orders'::regclass
         AND tgname='validate_order_checkout_input_before_insert'
         AND NOT tgisinternal
    ) THEN RAISE EXCEPTION 'Stage66 original checkout trigger failed to install in temporary transaction'; END IF;
  END $installed$;

  \echo 'Stage66: old trigger rejects current valid optional-email guest checkout'
  SET ROLE anon;
  SET request.jwt.claim.sub='';
  SET request.jwt.claim.jwt='{}';
  DO $incompatible$
  DECLARE
    v_message text;
    v_denied boolean := false;
  BEGIN
    BEGIN
      PERFORM public.create_order_with_stock(jsonb_build_object(
        'id','STG66-NO-EMAIL-BLOCKED',
        'customer_name','Stage66 Synthetic Guest',
        'phone','+995555123456','address','Fixture address 7',
        'user_email','guest',
        'delivery_region','tbilisi',
        'items',jsonb_build_array(jsonb_build_object(
          'id','STG61-SHOE','quantity',1,'custom_variant_id','red-s',
          'selected_size','S','selected_color','Red'
        ))
      ));
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_message = MESSAGE_TEXT;
      IF v_message NOT LIKE '%სტუმრის შეკვეთისთვის მიუთითეთ სწორი ელფოსტა%' THEN
        RAISE EXCEPTION 'Stage66 unexpected error; cannot prove legacy email incompatibility: %', v_message;
      END IF;
      v_denied := true;
    END;
    IF NOT v_denied THEN
      RAISE EXCEPTION 'Stage66 old validator unexpectedly accepts optional-email guest checkout';
    END IF;
  END $incompatible$;

  \echo 'Stage66: old trigger does NOT block the same valid guest WITH email'
  DO $compatible$
  DECLARE receipt jsonb;
  BEGIN
    receipt := public.create_order_with_stock(jsonb_build_object(
      'id','STG66-WITH-EMAIL-VALID',
      'customer_name','Stage66 Synthetic Guest',
      'phone','+995555123456','address','Fixture address 7',
      'user_email','guest','customer_email','guest@stage66.test',
      'delivery_region','tbilisi',
      'items',jsonb_build_array(jsonb_build_object(
        'id','STG61-SHOE','quantity',1,'custom_variant_id','red-s',
        'selected_size','S','selected_color','Red'
      ))
    ));
    IF receipt->>'total_gel' <> '125'
       OR receipt->'items'->0 ? 'purchase_cost'
       OR receipt->'items'->0 ? 'vendor'
    THEN RAISE EXCEPTION 'Stage66 legacy email-positive checkout lost totals or redaction'; END IF;
  END $compatible$;

  RESET ROLE;
  RESET request.jwt.claim.sub;
  RESET request.jwt.claim.jwt;

  DO $integrity$
  BEGIN
    IF EXISTS (SELECT 1 FROM public.orders WHERE id='STG66-NO-EMAIL-BLOCKED')
       OR (SELECT count(*) FROM public.orders WHERE id='STG66-WITH-EMAIL-VALID') <> 1
       OR (SELECT (e.value->>'stock')::integer
           FROM public.products p,jsonb_array_elements(p.variants) e(value)
           WHERE p.id='STG61-SHOE' AND e.value->>'id'='red-s') <> 3
       OR (SELECT coalesce(sum(quantity_delta),0) FROM private.inventory_movements
            WHERE related_order_id='STG66-WITH-EMAIL-VALID') <> -1
    THEN RAISE EXCEPTION 'Stage66 old trigger broke atomic stock/order/ledger invariants'; END IF;
  END $integrity$;

ROLLBACK;

\echo 'Stage66: assert source migration, user/stock fixture are fully reverted'
DO $restored$
BEGIN
  IF to_regprocedure('private.validate_order_checkout_input()') IS NOT NULL
     OR EXISTS (
       SELECT 1 FROM pg_trigger WHERE tgrelid='public.orders'::regclass
          AND tgname='validate_order_checkout_input_before_insert'
          AND NOT tgisinternal
     )
     OR EXISTS (SELECT 1 FROM public.orders WHERE id LIKE 'STG66-%')
     OR EXISTS (SELECT 1 FROM private.inventory_movements
                WHERE related_order_id LIKE 'STG66-%')
     OR (SELECT (e.value->>'stock')::integer
          FROM public.products p,jsonb_array_elements(p.variants) e(value)
          WHERE p.id='STG61-SHOE' AND e.value->>'id'='red-s') <> 4
  THEN RAISE EXCEPTION 'Stage66 rollback left legacy SQL, changed inventory, order or audit record'; END IF;
END $restored$;
\echo 'PASS Stage66: unmodified old checkout validator rejects a guest checkout allowed by modern RPC; all disposable data and DDL rolled back'
