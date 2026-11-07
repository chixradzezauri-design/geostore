-- Public storefront visitors and signed-in customers only need published snapshots.
-- Draft content is read only through an admin-verified RPC.

REVOKE SELECT ON TABLE public.storefront_config FROM PUBLIC, anon, authenticated;
GRANT SELECT (config_key, published_config, is_published)
ON TABLE public.storefront_config TO anon, authenticated;

-- Public media metadata must not disclose the administrator UUID.
REVOKE SELECT ON TABLE public.storefront_media FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, storage_path, public_url, file_name, mime_type,
  size_bytes, alt_text, folder, is_public, created_at
)
ON TABLE public.storefront_media TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_storefront_draft()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_draft jsonb;
BEGIN
  IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     OR COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' THEN
    RAISE EXCEPTION 'Not authorized to read storefront draft' USING ERRCODE = '42501';
  END IF;

  SELECT draft_config
    INTO v_draft
    FROM public.storefront_config
   WHERE config_key = 'storefront'
   LIMIT 1;

  RETURN COALESCE(v_draft, '{}'::jsonb);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_storefront_draft() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_storefront_draft() TO authenticated;
