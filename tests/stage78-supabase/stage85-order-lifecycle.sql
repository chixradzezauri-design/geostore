-- Stage85: complete real Production order trigger surface in disposable CI.
-- Existing Stage84 installed 3 of 8, this file adds 5.
\set ON_ERROR_STOP on

-- The 8th trigger needs the 2026-11-23 live PostgreSQL catalog definition
-- (not present in local migrations), and the product publication column.
ALTER TABLE public.products ADD COLUMN is_published boolean NOT NULL DEFAULT true;

-- Notification tables are synthetic in this minimal fixture, but use real
-- immutable user UUID and uniqueness constraints from Production.
CREATE TABLE public.order_notifications (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
 recipient_email text NOT NULL,
 recipient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 event_key text NOT NULL,
 status text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 read_at timestamptz NULL,
 CONSTRAINT order_notifications_order_event_unique UNIQUE(order_id,event_key),
 CONSTRAINT order_notifications_event_key_valid CHECK(length(trim(event_key)) BETWEEN 1 AND 80),
 CONSTRAINT order_notifications_status_valid CHECK(length(trim(status)) BETWEEN 1 AND 40)
);
ALTER TABLE public.order_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_notifications FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.order_notifications FROM PUBLIC, anon, authenticated;

\i /tmp/stage85-original-order-lifecycle.sql
\ir stage85-live-published-guard.sql

DO $checks$
BEGIN
 IF (SELECT count(*) FROM pg_trigger t
     WHERE t.tgrelid='public.orders'::regclass
       AND NOT t.tgisinternal AND t.tgenabled='O') <> 8 THEN
    RAISE EXCEPTION 'Stage85 all 8 Production order triggers not installed';
 END IF;
 IF (SELECT count(*) FROM pg_trigger t
     WHERE t.tgrelid='public.products'::regclass
       AND NOT t.tgisinternal AND t.tgenabled='O') <> 3 THEN
    RAISE EXCEPTION 'Stage85 original 3 product-stock triggers not installed';
 END IF;
END;
$checks$;
NOTIFY pgrst, 'reload schema';
