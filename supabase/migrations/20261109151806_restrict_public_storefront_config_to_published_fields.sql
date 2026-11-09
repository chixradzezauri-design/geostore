-- Public visitors may read only the published storefront snapshot.
-- Draft content remains available only through the authenticated admin session.
REVOKE SELECT ON TABLE public.storefront_config FROM anon;
GRANT SELECT (
  config_key,
  published_config,
  is_published,
  published_at
) ON TABLE public.storefront_config TO anon;
