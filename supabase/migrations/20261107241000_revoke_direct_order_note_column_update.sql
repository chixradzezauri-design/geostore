-- Admin order notes are written through the validated SECURITY DEFINER RPC.
-- Remove the leftover direct column grant so authenticated clients cannot bypass it.
REVOKE UPDATE (admin_note) ON TABLE public.orders FROM authenticated;
