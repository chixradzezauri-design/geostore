-- Unapplied 4AO draft. Requires 4AN. Execute in one transaction in staging only.
-- Review every exact definition; fail closed on any drift before replacing.
do $preflight$
declare entry record; target regprocedure;
begin
 for entry in select * from (values
  ('private.admin_reactivate_cancelled_order(text)','b83a84313312e64c89c61a702da335ef'),
  ('private.admin_reopen_completed_order(text)','d3f012718e950ceb8c039d381e93b162'),
  ('private.get_admin_panel_visual_design()','e6c30a62cb07d70f4e8585c927e58196'),
  ('private.get_admin_panel_visual_design_state()','1d6fd412c4d1a3aa2774c1277818762b'),
  ('private.list_admin_activity_logs(integer)','c7be0036842521467bf8eeac3aed5943'),
  ('private.read_admin_marketing_consent_summary()','efc54f2b7f22c8cef1abd13e2a8e81c7'),
  ('private.save_admin_panel_visual_design(jsonb)','c6b16772a94a9cc24f25b031b00850d2'),
  ('private.save_admin_panel_visual_design_state(jsonb,timestamp with time zone)','35711584749ce5e559dbb09a6cc217a5')
 ) as expected(signature,fingerprint) loop
  target:=to_regprocedure(entry.signature);
  if target is null then raise exception 'Missing admin function: %',entry.signature;end if;
  if md5(pg_get_functiondef(target)) is distinct from entry.fingerprint then
   raise exception 'Admin function changed; review required: %',entry.signature;
  end if;
 end loop;
end $preflight$;
CREATE OR REPLACE FUNCTION private.admin_reactivate_cancelled_order(p_order_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_updated integer;
  v_password_auth_time bigint;
begin
  IF NOT private.admin_session_has_aal2() THEN
    RAISE EXCEPTION 'Administrator MFA required' USING ERRCODE='42501';
  END IF;

  if auth.uid() is null
     or coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'admin'
     or auth.uid() is distinct from '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid then
    raise exception 'ადმინისტრატორის უფლებები არ დადასტურდა.';
  end if;

  select max((entry->>'timestamp')::bigint)
    into v_password_auth_time
    from jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) as entry
   where entry->>'method' = 'password'
     and coalesce(entry->>'timestamp', '') ~ '^[0-9]+$';

  if v_password_auth_time is null
     or extract(epoch from now())::bigint - v_password_auth_time > 300
     or v_password_auth_time > extract(epoch from now())::bigint + 30 then
    raise exception 'ხელახლა გააქტიურებისთვის საჭიროა ადმინისტრატორის პაროლის ახლიდან დადასტურება.';
  end if;

  select * into v_order
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'შეკვეთა ვერ მოიძებნა.';
  end if;
  if v_order.status <> 'გაუქმებული' then
    raise exception 'მხოლოდ გაუქმებული შეკვეთის ხელახლა გააქტიურებაა შესაძლებელი.';
  end if;
  if v_order.stock_restored_at is null then
    raise exception 'შეკვეთის მარაგის აღდგენის ჩანაწერი ვერ დადასტურდა.';
  end if;
  if v_order.stock_deducted_at is null then
    raise exception 'შეკვეთას მარაგის ჩამოჭრის ჩანაწერი არ აქვს.';
  end if;
  if jsonb_typeof(coalesce(v_order.items, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(v_order.items, '[]'::jsonb)) = 0 then
    raise exception 'შეკვეთის პროდუქტების სია ცარიელია ან არასწორია.';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(v_order.items) as e(item)
     where jsonb_typeof(e.item) is distinct from 'object'
        or coalesce(trim(e.item->>'id'), '') = ''
        or coalesce(e.item->>'quantity', '') !~ '^[0-9]{1,3}$'
        or case
             when coalesce(e.item->>'quantity', '') ~ '^[0-9]{1,3}$'
               then (e.item->>'quantity')::numeric not between 1 and 100
             else true
           end
  ) then
    raise exception 'შეკვეთის პროდუქტის ID ან რაოდენობა არასწორია.';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(v_order.items) as e(item)
     group by e.item->>'id'
    having sum((e.item->>'quantity')::numeric) > 100
  ) then
    raise exception 'ერთი პროდუქტის ჯამური რაოდენობა 100-ს არ უნდა აღემატებოდეს.';
  end if;

  perform set_config('geostore.inventory_reason', 'order_reactivation', true);
  perform set_config('geostore.inventory_order_id', p_order_id, true);
  perform set_config('geostore.variant_stock_adjustment', 'on', true);
  for v_item in
    select item->>'id' as product_id,
           nullif(trim(item->>'customVariantId'), '') as custom_variant_id,
           sum((item->>'quantity')::integer)::integer as quantity
      from jsonb_array_elements(v_order.items) as e(item)
     group by item->>'id', nullif(trim(item->>'customVariantId'), '')
     order by item->>'id', nullif(trim(item->>'customVariantId'), '')
  loop
    if v_item.custom_variant_id is null then
      update public.products set stock = coalesce(stock, 0) - v_item.quantity
       where id = v_item.product_id and coalesce(stock, 0) >= v_item.quantity;
    else
      update public.products p
         set variants = (
           select jsonb_agg(
             case when element->>'id' = v_item.custom_variant_id
               then jsonb_set(element, '{stock}', to_jsonb((element->>'stock')::integer - v_item.quantity), true)
               else element end
             order by ordinality
           )
           from jsonb_array_elements(case when jsonb_typeof(p.variants) = 'array' then p.variants else '[]'::jsonb end)
             with ordinality as variant_rows(element, ordinality)
         )
       where p.id = v_item.product_id
         and exists (select 1 from jsonb_array_elements(case when jsonb_typeof(p.variants) = 'array' then p.variants else '[]'::jsonb end) element where element->>'id' = v_item.custom_variant_id and coalesce((element->>'stock')::integer, 0) >= v_item.quantity);
    end if;

    get diagnostics v_updated = row_count;
    if v_updated <> 1 then
      raise exception 'მარაგში აღარ არის საკმარისი რაოდენობა პროდუქტისთვის ან ვარიანტისთვის: %', v_item.product_id;
    end if;
  end loop;

  -- Mark this transaction so the trigger permits reactivation only
  -- through this RPC, after stock has been atomically deducted above.
  perform set_config('geostore.order_reactivation', 'on', true);

  update public.orders
     set status = 'ახალი',
         stock_deducted_at = now(),
         stock_restored_at = null
   where id = p_order_id;

  return jsonb_build_object(
    'order_id', p_order_id,
    'status', 'ახალი',
    'stock_deducted', true,
    'reauthorized', true
  );
end;
$function$;

CREATE OR REPLACE FUNCTION private.admin_reopen_completed_order(p_order_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_order public.orders%rowtype;
  v_password_auth_time bigint;
  v_status_changed_at timestamptz;
BEGIN
  IF NOT private.admin_session_has_aal2() THEN
    RAISE EXCEPTION 'Administrator MFA required' USING ERRCODE='42501';
  END IF;

  IF auth.uid() IS NULL
     OR coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლებები არ დადასტურდა.';
  END IF;

  SELECT max((entry->>'timestamp')::bigint)
    INTO v_password_auth_time
    FROM jsonb_array_elements(coalesce(auth.jwt()->'amr', '[]'::jsonb)) AS entry
   WHERE entry->>'method' = 'password'
     AND coalesce(entry->>'timestamp', '') ~ '^[0-9]+$';

  IF v_password_auth_time IS NULL
     OR extract(epoch FROM now())::bigint - v_password_auth_time > 300
     OR v_password_auth_time > extract(epoch FROM now())::bigint + 30 THEN
    RAISE EXCEPTION 'ხელახლა გააქტიურებისთვის საჭიროა ადმინისტრატორის პაროლის ახლიდან დადასტურება.';
  END IF;

  SELECT * INTO v_order
    FROM public.orders
   WHERE id = p_order_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'შეკვეთა ვერ მოიძებნა.';
  END IF;

  IF v_order.status NOT IN ('დასრულებული', 'ჩაბარებულია') THEN
    RAISE EXCEPTION 'ეს პროცედურა მხოლოდ დასრულებული შეკვეთის ხელახლა გასააქტიურებლად გამოიყენება.';
  END IF;

  -- Completed orders have already consumed stock. Reopening must not deduct it again.
  IF v_order.stock_deducted_at IS NULL OR v_order.stock_restored_at IS NOT NULL THEN
    RAISE EXCEPTION 'შეკვეთის მარაგის ისტორია არასრულია; უსაფრთხო რეაქტივაცია ვერ შესრულდება.';
  END IF;

  PERFORM set_config('geostore.completed_order_reactivation', 'on', true);

  UPDATE public.orders
     SET status = 'ახალი',
         status_changed_at = now()
   WHERE id = p_order_id
   RETURNING status_changed_at INTO v_status_changed_at;

  RETURN jsonb_build_object(
    'order_id', p_order_id,
    'status', 'ახალი',
    'status_changed_at', v_status_changed_at,
    'stock_deducted', false,
    'stock_unchanged', true,
    'reauthorized', true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION private.get_admin_panel_visual_design()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_design jsonb;
BEGIN
  IF NOT private.admin_session_has_aal2() THEN
    RAISE EXCEPTION 'Administrator MFA required' USING ERRCODE='42501';
  END IF;

  IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     OR coalesce(auth.jwt()->'app_metadata'->>'role', '') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლება არ დადასტურდა.'
      USING ERRCODE = '42501';
  END IF;

  SELECT settings.design
    INTO v_design
    FROM private.admin_panel_visual_settings AS settings
   WHERE settings.singleton IS TRUE;

  RETURN v_design;
END;
$function$;

CREATE OR REPLACE FUNCTION private.get_admin_panel_visual_design_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_design jsonb;
  v_updated_at timestamptz;
BEGIN
  IF NOT private.admin_session_has_aal2() THEN
    RAISE EXCEPTION 'Administrator MFA required' USING ERRCODE='42501';
  END IF;

  IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     OR coalesce(auth.jwt()->'app_metadata'->>'role', '') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლება არ დადასტურდა.'
      USING ERRCODE = '42501';
  END IF;

  SELECT settings.design, settings.updated_at
    INTO v_design, v_updated_at
    FROM private.admin_panel_visual_settings AS settings
   WHERE settings.singleton IS TRUE;

  RETURN jsonb_build_object('design', v_design, 'updated_at', v_updated_at);
END;
$function$;

CREATE OR REPLACE FUNCTION private.list_admin_activity_logs(p_limit integer DEFAULT 100)
 RETURNS TABLE(id bigint, action text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF NOT private.admin_session_has_aal2() THEN
    RAISE EXCEPTION 'Administrator MFA required' USING ERRCODE='42501';
  END IF;

  IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     OR auth.jwt()->'app_metadata'->>'role' IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლება არ დადასტურდა.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT l.id, l.action, l.created_at
  FROM private.admin_activity_log AS l
  ORDER BY l.created_at DESC, l.id DESC
  LIMIT greatest(1, least(coalesce(p_limit, 100), 200));
END;
$function$;

CREATE OR REPLACE FUNCTION private.read_admin_marketing_consent_summary()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_result jsonb;
BEGIN
  IF NOT private.admin_session_has_aal2() THEN
    RAISE EXCEPTION 'Administrator MFA required' USING ERRCODE='42501';
  END IF;

 IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid OR coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
 WITH states AS (
 SELECT CASE WHEN e.event_id IS NULL THEN 'not_set' WHEN NOT e.opted_in THEN 'withdrawn'
 WHEN u.email_confirmed_at IS NULL OR coalesce(btrim(u.email),'')='' OR e.email_fingerprint IS DISTINCT FROM private.marketing_email_fingerprint(u.email) OR e.verified_email_confirmed_at IS DISTINCT FROM u.email_confirmed_at THEN 'reconfirmation_required'
 ELSE 'opted_in' END AS status
 FROM auth.users u LEFT JOIN LATERAL (SELECT * FROM private.marketing_email_consent_events WHERE user_id=u.id ORDER BY sequence_id DESC LIMIT 1) e ON true
 )
 SELECT jsonb_build_object('total',count(*)::text,'not_set',(count(*) FILTER(WHERE status='not_set'))::text,
 'withdrawn',(count(*) FILTER(WHERE status='withdrawn'))::text,'reconfirmation_required',(count(*) FILTER(WHERE status='reconfirmation_required'))::text,
 'opted_in',(count(*) FILTER(WHERE status='opted_in'))::text)
 INTO v_result FROM states;
 RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION private.save_admin_panel_visual_design(p_design jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF NOT private.admin_session_has_aal2() THEN
    RAISE EXCEPTION 'Administrator MFA required' USING ERRCODE='42501';
  END IF;

  IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     OR coalesce(auth.jwt()->'app_metadata'->>'role', '') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლება არ დადასტურდა.'
      USING ERRCODE = '42501';
  END IF;

  IF p_design IS NULL
     OR jsonb_typeof(p_design) IS DISTINCT FROM 'object'
     OR pg_column_size(p_design) > 131072 THEN
    RAISE EXCEPTION 'ადმინპანელის დიზაინის მონაცემები არასწორია ან ზედმეტად დიდია.'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO private.admin_panel_visual_settings (singleton, design, updated_by, updated_at)
  VALUES (true, p_design, auth.uid(), now())
  ON CONFLICT (singleton) DO UPDATE
    SET design = EXCLUDED.design,
        updated_by = EXCLUDED.updated_by,
        updated_at = now();

  RETURN p_design;
END;
$function$;

CREATE OR REPLACE FUNCTION private.save_admin_panel_visual_design_state(p_design jsonb, p_expected_updated_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_current_updated_at timestamptz;
  v_saved_updated_at timestamptz;
BEGIN
  IF NOT private.admin_session_has_aal2() THEN
    RAISE EXCEPTION 'Administrator MFA required' USING ERRCODE='42501';
  END IF;

  IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     OR coalesce(auth.jwt()->'app_metadata'->>'role', '') IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლება არ დადასტურდა.'
      USING ERRCODE = '42501';
  END IF;

  IF p_design IS NULL
     OR jsonb_typeof(p_design) IS DISTINCT FROM 'object'
     OR pg_column_size(p_design) > 131072 THEN
    RAISE EXCEPTION 'ადმინპანელის დიზაინის მონაცემები არასწორია ან ზედმეტად დიდია.'
      USING ERRCODE = '22023';
  END IF;

  SELECT settings.updated_at
    INTO v_current_updated_at
    FROM private.admin_panel_visual_settings AS settings
   WHERE settings.singleton IS TRUE
   FOR UPDATE;

  IF NOT FOUND THEN
    IF p_expected_updated_at IS NOT NULL THEN
      RAISE EXCEPTION 'ადმინპანელის დიზაინი სხვა მოწყობილობაზე უკვე შეიცვალა. განაახლეთ საერთო ვერსია.'
        USING ERRCODE = '40001';
    END IF;

    INSERT INTO private.admin_panel_visual_settings (singleton, design, updated_by, updated_at)
    VALUES (true, p_design, auth.uid(), clock_timestamp())
    ON CONFLICT (singleton) DO NOTHING
    RETURNING updated_at INTO v_saved_updated_at;

    IF v_saved_updated_at IS NULL THEN
      RAISE EXCEPTION 'ადმინპანელის დიზაინი პარალელურად შეიცვალა. განაახლეთ საერთო ვერსია.'
        USING ERRCODE = '40001';
    END IF;
  ELSE
    IF p_expected_updated_at IS DISTINCT FROM v_current_updated_at THEN
      RAISE EXCEPTION 'ადმინპანელის დიზაინი სხვა მოწყობილობაზე უკვე შეიცვალა. განაახლეთ საერთო ვერსია.'
        USING ERRCODE = '40001';
    END IF;

    UPDATE private.admin_panel_visual_settings
       SET design = p_design,
           updated_by = auth.uid(),
           updated_at = GREATEST(clock_timestamp(), v_current_updated_at + interval '1 microsecond')
     WHERE singleton IS TRUE
     RETURNING updated_at INTO v_saved_updated_at;
  END IF;

  RETURN jsonb_build_object('design', p_design, 'updated_at', v_saved_updated_at);
END;
$function$;
