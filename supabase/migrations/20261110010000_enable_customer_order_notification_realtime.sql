-- Allow each signed-in customer to receive only their own order notification events.
-- Existing RPCs remain the source of truth for notification payloads.
GRANT SELECT ON TABLE public.order_notifications TO authenticated;

DROP POLICY IF EXISTS "Customers can read their own order notifications" ON public.order_notifications;
CREATE POLICY "Customers can read their own order notifications"
  ON public.order_notifications
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = recipient_user_id);

DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'order_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_notifications;
  END IF;
END
$migration$;
