-- GEOSTORE security remediation: public storefront config column access
-- Review and apply through a versioned Supabase migration after branch reconciliation.
-- Public storefront reads only these fields; draft data must remain admin-only.

begin;

revoke select on table public.storefront_config from anon;
revoke select (draft_config, draft_updated_at, updated_by)
  on table public.storefront_config from anon;

grant select (config_key, published_config, is_published, published_at)
  on table public.storefront_config to anon;

commit;

-- Verification (run after applying):
-- select
--   has_table_privilege('anon', 'public.storefront_config', 'SELECT') as anon_table_select,
--   has_column_privilege('anon', 'public.storefront_config', 'draft_config', 'SELECT') as anon_draft_select,
--   has_column_privilege('anon', 'public.storefront_config', 'published_config', 'SELECT') as anon_published_select;
-- Expected: false, false, true.
--
-- Keep the existing SELECT RLS policy: it limits rows to published config
-- (or the authenticated primary admin). Column grants additionally prevent
-- reading draft_config even when a row is published.
