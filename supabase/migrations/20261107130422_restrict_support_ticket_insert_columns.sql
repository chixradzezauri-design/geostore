-- Restrict public support submissions to the exact customer-controlled fields.
-- The database supplies status='ღია', reply=NULL and created_at itself.
REVOKE INSERT ON TABLE public.support_tickets FROM PUBLIC, anon, authenticated;
GRANT INSERT (id, customer_name, email, subject, message)
ON TABLE public.support_tickets TO anon, authenticated;
