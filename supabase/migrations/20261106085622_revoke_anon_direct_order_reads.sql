-- Anonymous visitors use the phone + order-code tracking RPC, not table reads.
REVOKE SELECT ON TABLE public.orders FROM anon;
