-- Support requests are customer records and must remain available in history.
-- No customer/admin UI delete flow is required; retain status-based lifecycle instead.
DROP POLICY IF EXISTS "Admin can delete support tickets" ON public.support_tickets;
REVOKE DELETE ON TABLE public.support_tickets FROM authenticated, anon, PUBLIC;
