-- Stage84: install original ownership, guest-email and status-time triggers
-- only into the disposable local Supabase instance, before Stage80 checkout.
\set ON_ERROR_STOP on
\i /tmp/stage84-original-order-triggers.sql
DO $stage84$
BEGIN
 IF (SELECT count(*) FROM pg_trigger WHERE tgrelid='public.orders'::regclass
      AND NOT tgisinternal AND tgenabled='O' AND tgname IN (
        'orders_bind_auth_user_before_insert',
        'orders_require_valid_guest_checkout_email',
        'orders_set_status_changed_at'))<>3 THEN
  RAISE EXCEPTION 'Stage84 3 authentic order triggers were not installed';
 END IF;
END;
$stage84$;
NOTIFY pgrst, 'reload schema';
