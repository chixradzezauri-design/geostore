-- Stage87: SELECT-only Production current routine md5/grants metadata.
-- No function bodies, customer identities, passwords or business data returned.
SELECT COALESCE(jsonb_agg(jsonb_build_object(
 'signature',s.signature,
 'md5',md5(pg_get_functiondef(p.oid)),
 'securityDefiner',p.prosecdef,
 'anonExecute',has_function_privilege('anon',p.oid,'EXECUTE'),
 'authenticatedExecute',has_function_privilege('authenticated',p.oid,'EXECUTE'),
 'searchPathLocked',p.proconfig @> ARRAY['search_path=""']
) ORDER BY s.signature),'[]'::jsonb)::text AS live_rpcs
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
CROSS JOIN LATERAL (
 SELECT n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' AS signature
) s
WHERE s.signature IN (
 'private.add_support_ticket_message(p_ticket_id text, p_message text, p_access_token text)',
 'private.admin_reactivate_cancelled_order(p_order_id text)',
 'private.create_order_with_stock(p_order jsonb)',
 'private.create_support_ticket(p_id text, p_customer_name text, p_email text, p_subject text, p_message text, p_access_token text)',
 'private.get_my_order_notifications()',
 'private.get_support_ticket_messages(p_ticket_id text, p_access_token text)',
 'private.preserve_product_variant_stock()',
 'private.record_order_notification()',
 'private.save_inventory_replenishment_setting(p_product_id text, p_variant_id text, p_low_stock_threshold integer, p_target_stock integer)',
 'private.save_inventory_replenishment_setting(p_product_id text, p_variant_id text, p_low_stock_threshold integer, p_target_stock integer, p_expected_updated_at timestamp with time zone)',
 'public.add_support_ticket_message(p_ticket_id text, p_message text, p_access_token text)',
 'public.admin_reactivate_cancelled_order(p_order_id text)',
 'public.admin_save_inventory_replenishment_setting(p_product_id text, p_variant_id text, p_low_stock_threshold integer, p_target_stock integer)',
 'public.admin_save_inventory_replenishment_setting(p_product_id text, p_variant_id text, p_low_stock_threshold integer, p_target_stock integer, p_expected_updated_at timestamp with time zone)',
 'public.create_order_with_stock(p_order jsonb)',
 'public.create_support_ticket(p_id text, p_customer_name text, p_email text, p_subject text, p_message text, p_access_token text)',
 'public.get_my_order_notifications()',
 'public.get_support_ticket_messages(p_ticket_id text, p_access_token text)'
);
