-- Stage87: read-only catalog preflight for THREE Phase A SQL migrations.
-- No customer, order, financial, auth identities, or SQL bodies are exported.
-- Does not execute/approve migrations, schema changes or Phase B revocation.
WITH history AS (
 SELECT COUNT(*)::integer AS applied_count,
   md5(string_agg(version||':'||name,E'\n' ORDER BY version,name)) AS history_md5,
   COUNT(*) FILTER(WHERE version IN
    ('20261121170000','20261121190000','20261121210000','20261121213000'))::integer AS phased_applied_count
 FROM supabase_migrations.schema_migrations
),
expected AS (
 SELECT * FROM (VALUES
  ('id','text'),('created_at','timestamp with time zone'),
  ('customer_name','text'),('phone','text'),('address','text'),
  ('user_email','text'),('customer_email','text'),('user_id','uuid'),
  ('total_gel','numeric'),('status','text'),('admin_note','text'),
  ('status_changed_at','timestamp with time zone'),
  ('stock_deducted_at','timestamp with time zone'),
  ('stock_restored_at','timestamp with time zone'),('items','jsonb'),
  ('checkout_result','jsonb'),('checkout_request','jsonb')
 ) AS e(name,type)
),
columns AS (
 SELECT COUNT(*)::integer AS expected,
 COUNT(*) FILTER(WHERE c.column_name IS NOT NULL AND c.data_type=e.type)::integer AS matched,
 COALESCE(jsonb_agg(e.name ORDER BY e.name)
  FILTER(WHERE c.column_name IS NULL OR c.data_type<>e.type),'[]'::jsonb) AS mismatches
 FROM expected e LEFT JOIN information_schema.columns c
 ON c.table_schema='public' AND c.table_name='orders' AND c.column_name=e.name
),
functions AS (
 SELECT jsonb_agg(jsonb_build_object(
   'signature',f.signature,'exists',p.oid IS NOT NULL,
   'definition_md5',CASE WHEN p.oid IS NOT NULL THEN md5(pg_get_functiondef(p.oid)) END,
   'result',CASE WHEN p.oid IS NOT NULL THEN pg_get_function_result(p.oid) END,
   'security_definer',p.prosecdef,
   'anon_execute',CASE WHEN p.oid IS NOT NULL THEN has_function_privilege('anon',p.oid,'EXECUTE') END,
   'authenticated_execute',CASE WHEN p.oid IS NOT NULL THEN has_function_privilege('authenticated',p.oid,'EXECUTE') END,
   'search_path_locked',CASE WHEN p.oid IS NOT NULL THEN p.proconfig @> ARRAY['search_path=""'] END
 ) ORDER BY f.signature) AS entries
 FROM (VALUES
  ('private.create_order_with_stock(jsonb)'),
  ('public.create_order_with_stock(jsonb)'),
  ('private.get_my_orders()'),
  ('public.get_my_orders()'),
  ('private.has_staff_permission(text)'),
  ('public.has_staff_permission(text)'),
  ('private.admin_update_order_status(text,text)'),
  ('public.admin_update_order_status(text,text)'),
  ('public.admin_order_ledger_page(integer,integer)'),
  ('public.admin_order_image_refs_page(integer,integer)')
 ) AS f(signature) LEFT JOIN pg_proc p ON p.oid=to_regprocedure(f.signature)
)
SELECT jsonb_build_object(
 'appliedCount',history.applied_count,'historyMd5',history.history_md5,
 'phasedAppliedCount',history.phased_applied_count,
 'ordersRls',(SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.orders')),
 'staffTable',to_regclass('public.admin_staff_members') IS NOT NULL,
 'authUid',to_regprocedure('auth.uid()') IS NOT NULL,
 'expectedOrdersColumns',columns.expected,'matchedOrdersColumns',columns.matched,
 'orderColumnMismatches',columns.mismatches,
 'ordersAuthenticatedTableSelect',has_table_privilege('authenticated','public.orders','SELECT'),
 'ordersAnonTableSelect',has_table_privilege('anon','public.orders','SELECT'),
 'ordersAuthenticatedCostSnapshotSelect',jsonb_build_object(
  'items',has_column_privilege('authenticated','public.orders','items','SELECT'),
  'checkout_result',has_column_privilege('authenticated','public.orders','checkout_result','SELECT'),
  'checkout_request',has_column_privilege('authenticated','public.orders','checkout_request','SELECT')
 ),
 'functions',functions.entries
)::text AS preflight
FROM history CROSS JOIN columns CROSS JOIN functions;
