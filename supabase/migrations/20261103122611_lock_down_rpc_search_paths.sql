-- GEOSTORE: remove public/temporary schemas from privileged RPC search paths.
-- All table and private-function references in these routines are schema-qualified;
-- built-in functions remain available through implicit pg_catalog lookup.

ALTER FUNCTION private.create_order_with_stock(jsonb) SET search_path = '';
ALTER FUNCTION private.admin_update_order_status(text, text) SET search_path = '';
ALTER FUNCTION private.lookup_order_for_tracking(text, text) SET search_path = '';
ALTER FUNCTION private.admin_list_products() SET search_path = '';
ALTER FUNCTION private.prevent_cancellation_after_dispatch() SET search_path = '';

ALTER FUNCTION public.create_order_with_stock(jsonb) SET search_path = '';
ALTER FUNCTION public.admin_update_order_status(text, text) SET search_path = '';
ALTER FUNCTION public.lookup_order_for_tracking(text, text) SET search_path = '';
ALTER FUNCTION public.admin_list_products() SET search_path = '';
