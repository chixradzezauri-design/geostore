-- Stage52: a disposable local PostgreSQL fixture for the actual Stage51
-- public checkout RPC migration. No production/staging credentials or data.
\set ON_ERROR_STOP on
\echo 'Stage52: prepare isolated checkout contract fixtures'
BEGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
CREATE SCHEMA private;
GRANT USAGE ON SCHEMA private TO anon, authenticated;

CREATE TABLE private.stage52_snapshots (
  order_id text PRIMARY KEY,
  checkout_result jsonb NOT NULL
);
REVOKE ALL ON private.stage52_snapshots FROM PUBLIC, anon, authenticated;

-- This mock replaces only the *private implementation* in an ephemeral DB.
-- It models internal cost snapshots and an idempotent replay without changing
-- stock or accessing an external Supabase instance.
CREATE FUNCTION private.create_order_with_stock(p_order jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $mock$
DECLARE
  saved jsonb;
  receipt jsonb;
BEGIN
  SELECT checkout_result INTO saved
    FROM private.stage52_snapshots WHERE order_id = p_order->>'id';
  IF FOUND THEN
    RETURN saved || jsonb_build_object('idempotent_replay', true);
  END IF;
  receipt := jsonb_build_object(
    'order_id', p_order->>'id', 'stock_deducted', true,
    'subtotal_gel', 144, 'discount_gel', 0, 'delivery_gel', 5,
    'total_gel', 149,
    'items', jsonb_build_array(
      jsonb_build_object(
        'id', 'stage52-item-one', 'name', 'Fixture A', 'price', 100,
        'quantity', 1, 'purchase_cost', 45, 'purchaseCost', 46,
        'vendor', 'internal-maker', 'unit_cost', 43, 'unitCost', 44,
        'cost', 48, 'margin', 52, 'profit', 53,
        'selectedSize', 'M'
      ),
      jsonb_build_object(
        'id', 'stage52-item-two', 'name', 'Fixture B',
        'price', 44, 'quantity', 1, 'cost_price', 15, 'costPrice', 16,
        'supplier', 'internal-supplier', 'supplier_name', 'internal-warehouse',
        'supplierName', 'internal-warehouse-name', 'gift_wrap', true
      )
    )
  );
  INSERT INTO private.stage52_snapshots (order_id, checkout_result)
  VALUES (p_order->>'id', receipt);
  RETURN receipt;
END
$mock$;
GRANT EXECUTE ON FUNCTION private.create_order_with_stock(jsonb)
  TO anon, authenticated;
COMMIT;

-- Execute the *exact* migration file in the PR, not a rewritten copy.
\ir ../../supabase/migrations/20261121170000_strip_private_costs_from_checkout_rpc.sql

\echo 'Stage52: test anonymous checkout and idempotent replay'
SET ROLE anon;
DO $test$
DECLARE
  request jsonb := jsonb_build_object(
    'id', 'STG52-GUEST-001',
    'customer_name', 'Isolated Guest',
    'phone', '+995555123456',
    'address', 'Fixture street 10',
    'user_email', 'guest', 'customer_email', 'guest@stage52.test',
    'items', jsonb_build_array(jsonb_build_object('id', 'stage52-item-one', 'quantity', 1))
  );
  result jsonb;
  replay jsonb;
BEGIN
  result := public.create_order_with_stock(request);
  IF result->>'order_id' IS DISTINCT FROM 'STG52-GUEST-001'
     OR result->>'total_gel' IS DISTINCT FROM '149'
     OR jsonb_array_length(result->'items') <> 2
     OR (result->'items'->0->>'price')::integer <> 100
     OR result->'items'->0->>'selectedSize' <> 'M'
     OR result->'items'->1->>'gift_wrap' <> 'true' THEN
    RAISE EXCEPTION 'Stage52: new checkout changed customer-visible totals/items';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(result->'items') AS line(item)
    WHERE line.item ?| ARRAY['purchase_cost','purchaseCost','cost_price','costPrice','vendor',
      'unit_cost','unitCost','cost','margin','profit','supplier','supplier_name','supplierName']
  ) THEN
    RAISE EXCEPTION 'Stage52: a new checkout exposed private financial data';
  END IF;

  replay := public.create_order_with_stock(request);
  IF replay->>'idempotent_replay' IS DISTINCT FROM 'true'
     OR (replay - 'idempotent_replay') IS DISTINCT FROM result THEN
    RAISE EXCEPTION 'Stage52: idempotent replay changed the checkout payload';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(replay->'items') AS line(item)
    WHERE line.item ?| ARRAY['purchase_cost','purchaseCost','cost_price','costPrice','vendor',
      'unit_cost','unitCost','cost','margin','profit','supplier','supplier_name','supplierName']
  ) THEN
    RAISE EXCEPTION 'Stage52: an old snapshot replay exposed finance-only data';
  END IF;
END
$test$;
RESET ROLE;

\echo 'Stage52: test authenticated role and reject invalid input before transaction'
SET ROLE authenticated;
DO $test$
DECLARE
  result jsonb;
  was_rejected boolean := false;
BEGIN
  result := public.create_order_with_stock(jsonb_build_object(
    'id','STG52-AUTH-001','customer_name','Fixture Account',
    'phone','599123456','address','Fixture street 20',
    'items',jsonb_build_array(jsonb_build_object('id','stage52-item-one','quantity',1))
  ));
  IF result->>'order_id' IS DISTINCT FROM 'STG52-AUTH-001'
     OR result->'items'->0 ? 'purchase_cost'
     OR result->'items'->1 ? 'cost_price'
     OR result->'items'->0 ? 'vendor'
     OR result->'items'->1 ? 'supplier' THEN
    RAISE EXCEPTION 'Stage52: authenticated checkout leaked private fields';
  END IF;
  BEGIN
    PERFORM public.create_order_with_stock(jsonb_build_object(
      'id','STG52-BAD-001','customer_name','Fixture',
      'phone','123','address','Fixture address',
      'items',jsonb_build_array(jsonb_build_object('id','p1','quantity',1))
    ));
  EXCEPTION WHEN OTHERS THEN
    was_rejected := true;
  END;
  IF NOT was_rejected THEN
    RAISE EXCEPTION 'Stage52: invalid phone was passed to the private writer';
  END IF;
END
$test$;
RESET ROLE;

\echo 'Stage52: assert internal accounting and private table privileges unchanged'
DO $test$
DECLARE
  total bigint;
  finance jsonb;
BEGIN
  SELECT count(*) INTO total FROM private.stage52_snapshots;
  IF total <> 2 THEN
    RAISE EXCEPTION 'Stage52: replay/invalid request created unexpected orders (%)', total;
  END IF;
  SELECT checkout_result INTO finance
  FROM private.stage52_snapshots WHERE order_id = 'STG52-GUEST-001';
  IF finance->'items'->0->>'purchase_cost' IS DISTINCT FROM '45'
     OR finance->'items'->1->>'cost_price' IS DISTINCT FROM '15'
     OR finance->'items'->0->>'vendor' IS DISTINCT FROM 'internal-maker'
     OR finance->'items'->1->>'supplier' IS DISTINCT FROM 'internal-supplier' THEN
    RAISE EXCEPTION 'Stage52: finance-only snapshot was altered';
  END IF;
  IF has_table_privilege('anon','private.stage52_snapshots','SELECT')
     OR has_table_privilege('authenticated','private.stage52_snapshots','SELECT') THEN
    RAISE EXCEPTION 'Stage52: customer roles gained access to finance-only snapshots';
  END IF;
  IF NOT has_function_privilege('anon','public.create_order_with_stock(jsonb)','EXECUTE')
     OR NOT has_function_privilege('authenticated','public.create_order_with_stock(jsonb)','EXECUTE') THEN
    RAISE EXCEPTION 'Stage52: public checkout grants regressed';
  END IF;
  IF (
    SELECT prosecdef FROM pg_proc
    WHERE oid = 'public.create_order_with_stock(jsonb)'::regprocedure
  ) THEN
    RAISE EXCEPTION 'Stage52: public checkout wrapper became security definer';
  END IF;
END
$test$;
\echo 'PASS Stage52+55 isolated PostgreSQL 17: all finance/vendor aliases redacted for new/replayed checkout, prices preserved, private finance retained, roles checked, no real orders'
