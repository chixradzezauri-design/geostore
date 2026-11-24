-- Local only; extend synthetic Stage88 tables AFTER its tests, not Production.
\set ON_ERROR_STOP on
TRUNCATE public.support_ticket_messages;
ALTER TABLE public.support_tickets
 ADD COLUMN email text,
 ADD COLUMN customer_user_id uuid REFERENCES auth.users(id),
 ADD COLUMN access_token_hash text,
 ADD COLUMN subject text,
 ADD COLUMN reply text,
 ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.support_ticket_messages
 DROP COLUMN id,
 ADD COLUMN id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 ADD COLUMN ticket_id text,
 ADD COLUMN sender_role text,
 ADD COLUMN sender_name text,
 ADD COLUMN request_id uuid,
 ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
 ADD COLUMN customer_read_at timestamptz,
 ADD COLUMN admin_read_at timestamptz;
CREATE UNIQUE INDEX stage89_request_id_unique ON public.support_ticket_messages(request_id) WHERE request_id IS NOT NULL;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
GRANT ALL ON public.support_tickets,public.support_ticket_messages TO service_role;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
\ir stage89-live-support-rpcs.sql
NOTIFY pgrst, 'reload schema';
