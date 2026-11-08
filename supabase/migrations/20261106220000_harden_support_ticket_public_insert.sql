-- Limit public support intake to customer-controlled fields only.
-- The database supplies status='ღია', reply=NULL and created_at itself.
-- This prevents visitors from setting an admin reply, changing ticket status,
-- or forging the ticket timestamp at insert time.
REVOKE INSERT ON TABLE public.support_tickets FROM PUBLIC, anon, authenticated;
GRANT INSERT (id, customer_name, email, subject, message)
ON TABLE public.support_tickets TO anon, authenticated;

-- Keep the existing validated INSERT RLS policy. Its status/reply checks remain
-- defense in depth, while column grants make those fields non-writable via REST.
