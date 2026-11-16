-- Internal purchase cost must never be readable through the public products table.
-- Admin UI receives this field through the protected admin_list_products RPC.
REVOKE SELECT (purchase_cost) ON TABLE public.products FROM authenticated, anon, PUBLIC;
