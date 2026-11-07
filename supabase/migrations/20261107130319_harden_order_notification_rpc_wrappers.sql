-- Keep public notification RPC wrappers SECURITY INVOKER.
-- Privilege escalation remains confined to private functions with auth checks.
CREATE OR REPLACE FUNCTION public.get_my_order_notifications()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO ''
AS $function$ SELECT private.get_my_order_notifications(); $function$;

CREATE OR REPLACE FUNCTION public.mark_my_order_notifications_read()
RETURNS integer LANGUAGE sql SECURITY INVOKER SET search_path TO ''
AS $function$ SELECT private.mark_my_order_notifications_read(); $function$;

REVOKE ALL ON FUNCTION public.get_my_order_notifications() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_my_order_notifications_read() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_order_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_my_order_notifications_read() TO authenticated;
