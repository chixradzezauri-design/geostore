-- Stage81: READ-ONLY live release preflight, metadata ONLY.
-- Safe to run in Supabase SQL Editor using SELECT privileges.
-- Does not fetch a single customer, order, staff, financial or stock row.
SELECT jsonb_build_object(
  'orders_columns', (SELECT coalesce(jsonb_agg(jsonb_build_object('name',column_name,'type',data_type) ORDER BY ordinal_position),'[]'::jsonb)
    FROM information_schema.columns WHERE table_schema='public' AND table_name='orders'),
  'products_columns', (SELECT coalesce(jsonb_agg(jsonb_build_object('name',column_name,'type',data_type) ORDER BY ordinal_position),'[]'::jsonb)
    FROM information_schema.columns WHERE table_schema='public' AND table_name='products'),
  'tables',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',n.nspname||'.'||c.relname,'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity)
      ORDER BY n.nspname,c.relname),'[]'::jsonb)
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE c.relkind IN ('r','p') AND n.nspname IN ('public','private')
      AND (n.nspname||'.'||c.relname) IN
      ('public.orders','public.products','public.admin_staff_members',
      'public.admin_staff_pending_invites','public.expenses','private.inventory_movements',
      'private.inventory_replenishment_settings','public.order_notifications')),
  'rpcs',(SELECT coalesce(jsonb_agg(jsonb_build_object('signature',f.signature,'exists',p.oid IS NOT NULL,
    'return',CASE WHEN p.oid IS NULL THEN null ELSE pg_get_function_result(p.oid) END,
    'security_definer',p.prosecdef,
    'definition_md5',CASE WHEN p.oid IS NULL THEN null ELSE md5(pg_get_functiondef(p.oid)) END,
    'anon_execute',CASE WHEN p.oid IS NULL THEN null ELSE has_function_privilege('anon',p.oid,'EXECUTE') END,
    'authenticated_execute',CASE WHEN p.oid IS NULL THEN null ELSE has_function_privilege('authenticated',p.oid,'EXECUTE') END)
    ORDER BY f.signature),'[]'::jsonb)
    FROM (VALUES ('private.create_order_with_stock(jsonb)'),('public.create_order_with_stock(jsonb)'),
      ('private.get_my_orders()'),('public.get_my_orders()'),
      ('public.has_staff_permission(text)'),('private.has_staff_permission(text)'),
      ('public.admin_update_order_status(text,text)'),('private.admin_update_order_status(text,text)'),
      ('public.admin_order_ledger_page(integer,integer)'),('public.admin_order_image_refs_page(integer,integer)'))
      f(signature) LEFT JOIN pg_proc p ON p.oid=to_regprocedure(f.signature)),
  'acl',jsonb_build_object(
    'anon_order_table_read',has_table_privilege('anon','public.orders','SELECT'),
    'authenticated_order_table_read',has_table_privilege('authenticated','public.orders','SELECT'),
    'authenticated_order_items_read',has_column_privilege('authenticated','public.orders','items','SELECT'),
    'authenticated_order_request_read',has_column_privilege('authenticated','public.orders','checkout_request','SELECT'),
    'authenticated_order_result_read',has_column_privilege('authenticated','public.orders','checkout_result','SELECT'),
    'authenticated_order_status_read',has_column_privilege('authenticated','public.orders','status','SELECT'),
    'anon_private_schema_usage',has_schema_privilege('anon','private','USAGE'),
    'authenticated_private_schema_usage',has_schema_privilege('authenticated','private','USAGE')
  ),
  'order_triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',tg.tgname,'enabled',tg.tgenabled,'function',tg.tgfoid::regprocedure::text)
    ORDER BY tg.tgname),'[]'::jsonb)
    FROM pg_trigger tg WHERE tg.tgrelid='public.orders'::regclass AND NOT tg.tgisinternal),
  'product_triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',tg.tgname,'enabled',tg.tgenabled,'function',tg.tgfoid::regprocedure::text)
    ORDER BY tg.tgname),'[]'::jsonb)
    FROM pg_trigger tg WHERE tg.tgrelid='public.products'::regclass AND NOT tg.tgisinternal)
)::text AS snapshot;
