-- Stage79: only in disposable local Supabase.
-- Exact Phase A checkout/history SQL, with explicitly mocked private writer.
\set ON_ERROR_STOP on
GRANT USAGE ON SCHEMA private TO anon;
GRANT ALL ON TABLE public.orders TO service_role;

CREATE TABLE private.stage79_checkout_receipts (
  id text PRIMARY KEY,
  receipt jsonb NOT NULL
);
REVOKE ALL ON private.stage79_checkout_receipts FROM PUBLIC, anon, authenticated;

CREATE FUNCTION private.create_order_with_stock(p_order jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fixture$
DECLARE v_result jsonb;
BEGIN
  SELECT receipt INTO v_result FROM private.stage79_checkout_receipts
  WHERE id=p_order->>'id';
  IF FOUND THEN RETURN v_result || jsonb_build_object('idempotent_replay',true); END IF;
  v_result:=jsonb_build_object(
    'order_id',p_order->>'id','total_gel',140,'subtotal_gel',140,
    'delivery_gel',0,'stock_deducted',true,
    'items',jsonb_build_array(jsonb_build_object(
      'id','ci-product','quantity',1,'price',140,'selectedSize','M',
      'purchase_cost',40,'purchaseCost',41,'cost_price',42,'costPrice',43,
      'vendor','internal-ci-vendor','supplier_name','ci-supplier','margin',90
    ))
  );
  INSERT INTO private.stage79_checkout_receipts(id,receipt)
  VALUES (p_order->>'id',v_result);
  RETURN v_result;
END;
$fixture$;
REVOKE ALL ON FUNCTION private.create_order_with_stock(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.create_order_with_stock(jsonb) TO anon, authenticated;

-- Run original reviewed Stage51 and Stage54 SQL after Stage78's original
-- exact staff foundation + additive Stage57 ledger SQL.
\ir ../../supabase/migrations/20261121170000_strip_private_costs_from_checkout_rpc.sql
\ir ../../supabase/migrations/20261121190000_redact_alternate_costs_from_order_history.sql

-- The existing live public RPC is a SECURITY INVOKER delegate to private.
-- Only this wrapper is synthetic; private.get_my_orders comes from source.
CREATE OR REPLACE FUNCTION public.get_my_orders()
RETURNS TABLE(id text,created_at timestamptz,total_gel numeric,status text,
  items jsonb,status_changed_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO ''
AS $wrapper$ SELECT * FROM private.get_my_orders(); $wrapper$;
REVOKE ALL ON FUNCTION public.get_my_orders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_orders() TO authenticated;
NOTIFY pgrst, 'reload schema';
