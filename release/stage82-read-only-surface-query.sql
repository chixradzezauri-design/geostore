-- Stage82 metadata-only read-only SQL; no customer/order/staff/stock rows or SQL body data.
SELECT jsonb_build_object(
'functions',(SELECT coalesce(jsonb_agg(jsonb_build_object(
 'signature',format('%s.%s(%s)',n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)),
 'result',pg_get_function_result(p.oid),'definer',p.prosecdef,
 'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),
 'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),
 'definition_md5',md5(pg_get_functiondef(p.oid)),
 'locked_search_path',coalesce('search_path=""'=ANY(p.proconfig),false))
 ORDER BY n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)),'[]'::jsonb)
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname IN ('public','private') AND
 (p.proname ILIKE '%reactivate%' OR p.proname ILIKE '%reopen%' OR
 p.proname ILIKE '%order_note%' OR p.proname ILIKE '%order_notification%' OR
 p.proname ILIKE '%support_ticket%' OR p.proname ILIKE '%replenishment%' OR
 p.proname ILIKE '%variant_stock%' OR p.proname ILIKE '%create_order_with_stock%' OR
 p.proname ILIKE '%save_order_note%' OR p.proname ILIKE '%checkout%' OR
 p.proname ILIKE '%order_status%')),
'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object(
 'table',n.nspname||'.'||c.relname,'name',t.tgname,
 'enabled',t.tgenabled,'definition_md5',md5(pg_get_triggerdef(t.oid)),
 'routine',t.tgfoid::regprocedure::text)
 ORDER BY n.nspname,c.relname,t.tgname),'[]'::jsonb)
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE (n.nspname||'.'||c.relname) IN ('public.orders','public.products') AND NOT t.tgisinternal),
'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object(
 'table',n.nspname||'.'||c.relname,'name',k.conname,
 'type',k.contype::text,'validated',k.convalidated,
 'definition_md5',md5(pg_get_constraintdef(k.oid)))
 ORDER BY n.nspname,c.relname,k.conname),'[]'::jsonb)
 FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE (n.nspname||'.'||c.relname) IN
 ('public.orders','public.products','public.order_notifications',
 'private.inventory_movements','private.inventory_replenishment_settings',
 'public.admin_staff_members','public.support_tickets','public.support_ticket_messages'))
)::text AS snapshot;
