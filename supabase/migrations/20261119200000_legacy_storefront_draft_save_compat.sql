-- Keep the currently deployed storefront editor working until the
-- timestamp-aware client is deployed. The compatibility overload reads the
-- current server timestamp, then delegates to the protected RPC.
-- Older clients cannot detect stale local snapshots, so remove this overload
-- after all deployed clients use the two-argument RPC.
CREATE OR REPLACE FUNCTION public.save_storefront_draft(
  p_snapshot jsonb
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT private.save_storefront_draft(
    p_snapshot,
    (
      SELECT config.draft_updated_at
        FROM public.storefront_config AS config
       WHERE config.config_key = 'storefront'
    )
  );
$function$;

REVOKE ALL ON FUNCTION public.save_storefront_draft(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_storefront_draft(jsonb) TO authenticated;

COMMENT ON FUNCTION public.save_storefront_draft(jsonb) IS
  'Temporary compatibility for deployed pre-concurrency storefront clients. Delegates to the permission-checked save RPC using the current server timestamp; remove after all clients use the two-argument signature.';
