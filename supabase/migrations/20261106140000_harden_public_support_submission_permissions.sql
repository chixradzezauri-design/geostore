-- Keep public support submission available while removing unnecessary table privileges.
-- Visitors may create tickets/messages; only the authenticated primary admin policies
-- can read, update, or delete them.

REVOKE ALL ON TABLE public.support_tickets FROM anon, authenticated;
GRANT INSERT ON TABLE public.support_tickets TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON TABLE public.support_tickets TO authenticated;

REVOKE ALL ON TABLE public.messages FROM anon, authenticated;
GRANT INSERT ON TABLE public.messages TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON TABLE public.messages TO authenticated;

-- Bound public support payload sizes so anonymous inserts cannot store unbounded text.
ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_id_length_check
    CHECK (char_length(id) BETWEEN 1 AND 64),
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

-- New public tickets must start open and cannot impersonate an admin reply.
DROP POLICY IF EXISTS "Visitors can submit support tickets" ON public.support_tickets;
CREATE POLICY "Visitors can submit support tickets"
ON public.support_tickets
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(btrim(customer_name)) BETWEEN 1 AND 100
  AND char_length(btrim(message)) BETWEEN 1 AND 4000
  AND (email IS NULL OR char_length(email) <= 254)
  AND (subject IS NULL OR char_length(subject) <= 150)
  AND COALESCE(status, 'ღია') IN ('ღია', 'Open')
  AND reply IS NULL
);
