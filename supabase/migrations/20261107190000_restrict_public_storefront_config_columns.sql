-- Public storefront visitors only need the published snapshot.
-- Draft content and internal editor metadata remain available to authenticated
-- administrators through the existing RLS policy and table privileges.
REVOKE SELECT ON TABLE public.storefront_config FROM anon;

GRANT SELECT (config_key, published_config, is_published)
ON TABLE public.storefront_config TO anon;

-- Keep public media metadata usable without disclosing the administrator UUID.
REVOKE SELECT ON TABLE public.storefront_media FROM anon;

GRANT SELECT (
  id, storage_path, public_url, file_name, mime_type,
  size_bytes, alt_text, folder, is_public, created_at
)
ON TABLE public.storefront_media TO anon;
