-- Stage88 original staff CRM/support RLS policies on disposable local fixtures.
-- This is intentionally NOT a full-schema support-ticket replay.
\set ON_ERROR_STOP on
CREATE TABLE public.messages(
 id text PRIMARY KEY, body text NOT NULL, status text NOT NULL DEFAULT 'ახალი'
);
CREATE TABLE public.support_tickets(
 id text PRIMARY KEY, customer_name text NOT NULL,
 status text NOT NULL DEFAULT 'ღია'
);
CREATE TABLE public.support_ticket_messages(
 id text PRIMARY KEY, ticket_ref text NOT NULL REFERENCES public.support_tickets(id),
 message text NOT NULL
);
INSERT INTO public.messages(id,body) VALUES
('STAGE88-CHAT-1','Synthetic CI customer chat'),('STAGE88-CHAT-2','Synthetic CI removable chat');
INSERT INTO public.support_tickets(id,customer_name) VALUES
('STAGE88-TICKET-1','Synthetic CI customer');
INSERT INTO public.support_ticket_messages(id,ticket_ref,message) VALUES
('STAGE88-REPLY-1','STAGE88-TICKET-1','Synthetic CI support message');
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.messages,public.support_tickets,public.support_ticket_messages
 FROM PUBLIC,anon,authenticated;
GRANT SELECT,UPDATE,DELETE ON public.messages TO authenticated;
GRANT SELECT,UPDATE ON public.support_tickets TO authenticated;
GRANT SELECT ON public.support_ticket_messages TO authenticated;
\i /tmp/stage88-authentic-staff-support-policies.sql
DO $stage88$
BEGIN
 IF (SELECT count(*) FROM pg_policies WHERE schemaname='public'
    AND tablename IN ('messages','support_tickets','support_ticket_messages'))<>6
 THEN RAISE EXCEPTION 'Stage88 six reviewed original staff policies not installed'; END IF;
 IF (SELECT count(*) FROM pg_policies WHERE tablename IN
    ('messages','support_tickets','support_ticket_messages')
    AND qual LIKE '%has_staff_permission%')<>6
 THEN RAISE EXCEPTION 'Stage88 policy authorization has diverged'; END IF;
END;
$stage88$;
NOTIFY pgrst, 'reload schema';
