-- Keep anonymous support intake, but enforce least-privilege access.
-- The browser may create a ticket; only the authenticated primary-admin RLS
-- policies may read, update, or delete ticket records.
REVOKE ALL ON TABLE public.support_tickets FROM anon, authenticated;
GRANT INSERT ON TABLE public.support_tickets TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON TABLE public.support_tickets TO authenticated;

-- The legacy messages table has no active browser write path. Preserve the
-- admin read/update/delete policies and existing rows, but no client inserts.
REVOKE ALL ON TABLE public.messages FROM anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON TABLE public.messages TO authenticated;

-- Bound support payloads in the database, independently of browser validation.
ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_id_length_check
    CHECK (char_length(btrim(id)) BETWEEN 1 AND 64),
  ADD CONSTRAINT support_tickets_customer_name_length_check
    CHECK (char_length(btrim(customer_name)) BETWEEN 1 AND 100),
  ADD CONSTRAINT support_tickets_email_length_check
    CHECK (email IS NULL OR char_length(email) <= 254),
  ADD CONSTRAINT support_tickets_subject_length_check
    CHECK (subject IS NULL OR char_length(subject) <= 150),
  ADD CONSTRAINT support_tickets_message_length_check
    CHECK (char_length(btrim(message)) BETWEEN 1 AND 4000),
  ADD CONSTRAINT support_tickets_reply_length_check
    CHECK (reply IS NULL OR char_length(reply) <= 4000);

-- There must be exactly one public insert policy. Visitors cannot set an
-- arbitrary status or inject a reply that appears to come from an admin.
DROP POLICY IF EXISTS "Visitors can submit support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Visitors can submit validated support tickets" ON public.support_tickets;
CREATE POLICY "Visitors can submit validated support tickets"
ON public.support_tickets
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(btrim(id)) BETWEEN 1 AND 64
  AND char_length(btrim(customer_name)) BETWEEN 1 AND 100
  AND char_length(btrim(message)) BETWEEN 1 AND 4000
  AND (email IS NULL OR char_length(email) <= 254)
  AND (subject IS NULL OR char_length(subject) <= 150)
  AND status = 'ღია'
  AND reply IS NULL
);
