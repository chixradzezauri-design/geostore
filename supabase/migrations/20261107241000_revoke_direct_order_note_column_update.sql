-- All order mutations must pass through validated SECURITY DEFINER RPCs.
-- No client role needs direct table-level UPDATE; this also prevents a future
-- broad table grant from silently restoring a direct admin_note write path.
REVOKE UPDATE ON TABLE public.orders FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (admin_note) ON TABLE public.orders FROM PUBLIC, anon, authenticated;
