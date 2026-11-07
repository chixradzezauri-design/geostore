-- Public storefront visitors only need the published snapshot.
-- Draft content and internal editor metadata remain available to authenticated
-- administrators through the existing RLS policy and table privileges.
REVOKE SELECT ON TABLE public.storefront_config FROM anon;

GRANT SELECT (config_key, published_config, is_published)
ON TABLE public.storefront_config TO anon;
