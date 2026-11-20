-- Stale-device protection for atomic storefront publication.
-- Tighten required JSON section checks: missing keys must not pass via SQL NULL semantics.
create or replace function private.publish_storefront_config(
  p_snapshot jsonb,
  p_version_label text,
  p_expected_draft_updated_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_admin_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_version_id uuid;
  v_current_draft_updated_at timestamptz;
  v_saved_draft_updated_at timestamptz;
  v_category_count integer;
  v_banner_count integer;
  v_bad_count integer;
begin
  if v_admin_id is null
     or v_admin_id <> '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin' then
    raise exception using errcode = '42501', message = 'Not authorized to publish storefront configuration';
  end if;

  if p_snapshot is null
     or jsonb_typeof(p_snapshot) is distinct from 'object'
     or octet_length(p_snapshot::text) > 4194304 then
    raise exception using errcode = '22023', message = 'Invalid storefront snapshot';
  end if;

  if jsonb_typeof(p_snapshot -> 'categories') is distinct from 'array'
     or jsonb_typeof(p_snapshot -> 'banners') is distinct from 'array'
     or jsonb_typeof(p_snapshot -> 'siteSettings') is distinct from 'object' then
    raise exception using errcode = '22023', message = 'Storefront snapshot is missing required sections';
  end if;

  v_category_count := jsonb_array_length(p_snapshot -> 'categories');
  v_banner_count := jsonb_array_length(p_snapshot -> 'banners');

  if v_category_count > 100 or v_banner_count > 20 then
    raise exception using errcode = '22023', message = 'Storefront snapshot exceeds supported item limits';
  end if;

  select count(*) into v_bad_count
  from jsonb_array_elements(p_snapshot -> 'categories') as c(value)
  where jsonb_typeof(c.value) is distinct from 'object'
     or coalesce(length(btrim(c.value ->> 'id')), 0) = 0
     or length(c.value ->> 'id') > 120
     or coalesce(length(btrim(c.value ->> 'name')), 0) < 2
     or length(c.value ->> 'name') > 60;
  if v_bad_count > 0 then
    raise exception using errcode = '22023', message = 'Storefront snapshot contains invalid categories';
  end if;

  if (
    select count(distinct c.value ->> 'id')
    from jsonb_array_elements(p_snapshot -> 'categories') as c(value)
  ) <> v_category_count then
    raise exception using errcode = '22023', message = 'Storefront category IDs must be unique';
  end if;

  if (
    select count(distinct lower(c.value ->> 'name'))
    from jsonb_array_elements(p_snapshot -> 'categories') as c(value)
  ) <> v_category_count then
    raise exception using errcode = '22023', message = 'Storefront category names must be unique';
  end if;

  select count(*) into v_bad_count
  from jsonb_array_elements(p_snapshot -> 'banners') as b(value)
  where jsonb_typeof(b.value) is distinct from 'object'
     or coalesce(length(btrim(b.value ->> 'id')), 0) = 0
     or length(b.value ->> 'id') > 120
     or coalesce(length(btrim(b.value ->> 'title')), 0) = 0
     or length(b.value ->> 'title') > 120
     or length(coalesce(b.value ->> 'subtitle', '')) > 240
     or (
       coalesce(b.value ->> 'link', '') <> ''
       and b.value ->> 'link' !~* '^https?://'
     );
  if v_bad_count > 0 then
    raise exception using errcode = '22023', message = 'Storefront snapshot contains invalid banners';
  end if;

  if (
    select count(distinct b.value ->> 'id')
    from jsonb_array_elements(p_snapshot -> 'banners') as b(value)
  ) <> v_banner_count then
    raise exception using errcode = '22023', message = 'Storefront banner IDs must be unique';
  end if;

  if jsonb_typeof(p_snapshot #> '{siteSettings,storeName}') is distinct from 'string'
     or length(btrim(p_snapshot #>> '{siteSettings,storeName}')) < 2
     or length(p_snapshot #>> '{siteSettings,storeName}') > 60
     or length(coalesce(p_snapshot #>> '{siteSettings,topBarText}', '')) > 160
     or length(coalesce(p_snapshot #>> '{siteSettings,heroTitle}', '')) > 120
     or length(coalesce(p_snapshot #>> '{siteSettings,heroSubtitle}', '')) > 240 then
    raise exception using errcode = '22023', message = 'Storefront snapshot contains invalid site settings';
  end if;

  if p_version_label is not null and length(p_version_label) > 200 then
    raise exception using errcode = '22023', message = 'Version label is too long';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('geostore:storefront-draft', 0));

  select config.draft_updated_at into v_current_draft_updated_at
    from public.storefront_config as config
   where config.config_key = 'storefront'
   for update;

  if not found then
    if p_expected_draft_updated_at is not null then
      raise exception 'მონახაზი სხვა მოწყობილობაზე შეიცვალა. განაახლეთ საერთო ვერსია.' using errcode = '40001';
    end if;
  elsif p_expected_draft_updated_at is distinct from v_current_draft_updated_at then
    raise exception 'მონახაზი სხვა მოწყობილობაზე შეიცვალა. განაახლეთ საერთო ვერსია.' using errcode = '40001';
  end if;

  insert into public.storefront_config (
    config_key, draft_config, published_config, is_published,
    draft_updated_at, published_at, updated_by
  )
  values ('storefront', p_snapshot, p_snapshot, true, v_now, v_now, v_admin_id)
  on conflict (config_key) do update
  set draft_config = excluded.draft_config,
      published_config = excluded.published_config,
      is_published = true,
      draft_updated_at = greatest(excluded.draft_updated_at, public.storefront_config.draft_updated_at + interval '1 microsecond'),
      published_at = excluded.published_at,
      updated_by = excluded.updated_by
  returning draft_updated_at into v_saved_draft_updated_at;

  insert into public.storefront_versions (
    config_key, snapshot, version_label, created_by
  )
  values (
    'storefront',
    p_snapshot,
    coalesce(
      nullif(btrim(p_version_label), ''),
      'GEOSTORE publish ' || to_char(v_now at time zone 'Asia/Tbilisi', 'YYYY-MM-DD HH24:MI')
    ),
    v_admin_id
  )
  returning id into v_version_id;

  return jsonb_build_object('version_id', v_version_id, 'published_at', v_now, 'draft_updated_at', v_saved_draft_updated_at);
end;
$function$;

-- Compatibility: leave the existing two-argument RPC implementations unchanged until
-- all deployed clients migrate. The legacy API remains last-write-wins.

create or replace function public.publish_storefront_config(
  p_snapshot jsonb, p_version_label text, p_expected_draft_updated_at timestamptz
)
returns jsonb language sql security invoker set search_path = ''
as $function$
  select private.publish_storefront_config(p_snapshot, p_version_label, p_expected_draft_updated_at);
$function$;

revoke all on function private.publish_storefront_config(jsonb, text) from public, anon;
revoke all on function private.publish_storefront_config(jsonb, text, timestamptz) from public, anon;
grant execute on function private.publish_storefront_config(jsonb, text, timestamptz) to authenticated;
revoke all on function public.publish_storefront_config(jsonb, text) from public, anon;
revoke all on function public.publish_storefront_config(jsonb, text, timestamptz) from public, anon;
grant execute on function public.publish_storefront_config(jsonb, text, timestamptz) to authenticated;

-- Refresh exposed PostgREST function signatures after adding the new overload.
NOTIFY pgrst, 'reload schema';
