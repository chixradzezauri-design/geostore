-- Stage 63: run ONLY against an approved, fully migrated, isolated Supabase staging database.
-- Read-only catalog checks. Never use this to migrate production or replace authenticated E2E.
\set ON_ERROR_STOP on
BEGIN TRANSACTION READ ONLY;

DO $stage63$
DECLARE
  v_contract record;
  v_oid oid;
  v_def text;
BEGIN
  -- Compare against the real full schema, not the Stage52 partial-schema fixture.
  IF EXISTS (
    SELECT 1 FROM (VALUES
      ('public.orders'), ('public.products'), ('public.expenses'),
      ('public.admin_staff_members'), ('public.admin_staff_pending_invites'),
      ('private.inventory_movements')
    ) AS required(name)
    WHERE to_regclass(required.name) IS NULL
  ) THEN
    RAISE EXCEPTION 'Stage63: required order/staff/finance tables missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM (VALUES
      ('public','orders','items','jsonb'),
      ('public','orders','checkout_result','jsonb'),
      ('public','orders','checkout_request','jsonb'),
      ('public','orders','total_gel','numeric'),
      ('public','orders','user_id','uuid'),
      ('public','products','variants','jsonb'),
      ('public','products','purchase_cost','numeric'),
      ('public','expenses','amount','numeric'),
      ('public','admin_staff_members','user_id','uuid'),
      ('public','admin_staff_members','permissions','jsonb'),
      ('private','inventory_movements','variant_id','text'),
      ('private','inventory_movements','quantity_delta','integer')
    ) AS expected(schema_name,table_name,column_name,data_type)
    LEFT JOIN information_schema.columns AS actual
      ON actual.table_schema=expected.schema_name
     AND actual.table_name=expected.table_name
     AND actual.column_name=expected.column_name
    WHERE actual.column_name IS NULL OR actual.data_type<>expected.data_type
  ) THEN
    RAISE EXCEPTION 'Stage63: order/variant/staff/finance column type drift';
  END IF;

  IF EXISTS (
    SELECT 1 FROM (VALUES
      ('public.orders'), ('public.products'), ('public.expenses'),
      ('public.admin_staff_members'), ('public.admin_staff_pending_invites'),
      ('private.inventory_movements')
    ) AS required(name)
    JOIN pg_class AS c ON c.oid=to_regclass(required.name)
    WHERE NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Stage63: RLS unexpectedly disabled';
  END IF;

  FOR v_contract IN
    SELECT * FROM (VALUES
      ('public.create_order_with_stock(jsonb)',false,true,true),
      ('private.create_order_with_stock(jsonb)',true,true,true),
      ('public.get_my_orders()',false,false,true),
      ('private.get_my_orders()',true,false,true),
      ('public.has_staff_permission(text)',false,false,true),
      ('private.has_staff_permission(text)',true,false,true),
      ('public.admin_order_ledger_page(integer,integer)',false,false,true),
      ('private.admin_order_ledger_page(integer,integer)',true,false,true),
      ('public.admin_order_image_refs_page(integer,integer)',false,false,true),
      ('private.admin_order_image_refs_page(integer,integer)',true,false,true),
      ('public.admin_update_order_status(text,text)',false,false,true),
      ('private.admin_update_order_status(text,text)',true,false,true),
      ('public.admin_reactivate_cancelled_order(text)',false,false,true),
      ('private.admin_reactivate_cancelled_order(text)',true,false,true)
    ) AS expected(signature,is_definer,anon_execute,authenticated_execute)
  LOOP
    v_oid := to_regprocedure(v_contract.signature);
    IF v_oid IS NULL THEN
      RAISE EXCEPTION 'Stage63: RPC missing: %',v_contract.signature;
    END IF;
    IF (SELECT p.prosecdef FROM pg_proc p WHERE p.oid=v_oid)
       IS DISTINCT FROM v_contract.is_definer
       OR has_function_privilege('anon',v_oid,'EXECUTE')
          IS DISTINCT FROM v_contract.anon_execute
       OR has_function_privilege('authenticated',v_oid,'EXECUTE')
          IS DISTINCT FROM v_contract.authenticated_execute THEN
      RAISE EXCEPTION 'Stage63: RPC security/grants drift: %',v_contract.signature;
    END IF;
  END LOOP;

  IF has_table_privilege('anon','public.orders','SELECT')
     OR has_column_privilege('authenticated','public.orders','items','SELECT')
     OR has_column_privilege('authenticated','public.orders','checkout_result','SELECT')
     OR has_column_privilege('authenticated','public.orders','checkout_request','SELECT')
     OR NOT has_column_privilege('authenticated','public.orders','status','SELECT')
     OR NOT has_column_privilege('authenticated','public.orders','id','SELECT') THEN
    RAISE EXCEPTION 'Stage63: unsafe direct order snapshot grants or missing safe metadata grants';
  END IF;

  v_def := pg_get_functiondef(to_regprocedure('public.create_order_with_stock(jsonb)'));
  IF position('costPrice' IN v_def)=0 OR position('purchase_cost' IN v_def)=0
     OR position('private.create_order_with_stock(p_order)' IN v_def)=0 THEN
    RAISE EXCEPTION 'Stage63: public checkout redaction/delegation missing';
  END IF;
  v_def := pg_get_functiondef(to_regprocedure('private.get_my_orders()'));
  IF position('costPrice' IN v_def)=0 OR position('purchase_cost' IN v_def)=0
     OR position('o.user_id = auth.uid()' IN v_def)=0 THEN
    RAISE EXCEPTION 'Stage63: order-history ownership/redaction missing';
  END IF;
  v_def := pg_get_functiondef(to_regprocedure('private.admin_order_ledger_page(integer,integer)'));
  IF position('has_staff_permission(' IN v_def)=0 OR position('v_finance' IN v_def)=0
     OR position('costPrice' IN v_def)=0 THEN
    RAISE EXCEPTION 'Stage63: staff order/finance separation missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM (VALUES
      ('public.orders','orders_guard_status_transition'),
      ('public.orders','prevent_cancellation_after_dispatch'),
      ('public.products','preserve_product_variant_stock'),
      ('public.products','products_inventory_movement_after_change')
    ) AS required(table_name,trigger_name)
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_trigger t
      WHERE t.tgrelid=to_regclass(required.table_name)
        AND t.tgname=required.trigger_name AND NOT t.tgisinternal
        AND t.tgenabled <> 'D'
    )
  ) THEN
    RAISE EXCEPTION 'Stage63: order/stock trigger missing or disabled';
  END IF;
  RAISE NOTICE 'Stage63 read-only catalog and RPC grant contract passed; authenticated staging E2E remains mandatory';
END;
$stage63$;

ROLLBACK;
