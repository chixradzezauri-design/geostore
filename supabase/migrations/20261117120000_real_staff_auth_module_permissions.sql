-- GEOSTORE staff Auth and module authorization.
-- Staff access is stored server-side and checked on every protected request.
-- Existing primary-admin privileges remain unchanged.

CREATE TABLE IF NOT EXISTS public.admin_staff (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role_label text NOT NULL DEFAULT 'თანამშრომელი',
  permissions jsonb NOT NULL DEFAULT '{"products":false,"orders":false,"analytics":false,"expenses":false,"crm":false,"settings":false}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  previous_app_role text,
  invited_at timestamptz,
  activated_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_staff_permissions_object CHECK (jsonb_typeof(permissions) = 'object'),
  CONSTRAINT admin_staff_permissions_keys CHECK (
    permissions - ARRAY['products','orders','analytics','expenses','crm','settings'] = '{}'::jsonb
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_staff_email_lower_idx
  ON public.admin_staff (lower(email));

CREATE INDEX IF NOT EXISTS admin_staff_active_idx
  ON public.admin_staff (is_active, created_at DESC);

ALTER TABLE public.admin_staff ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_staff FROM PUBLIC, anon;
-- Authenticated users have table privileges only so the Data API exposes the
-- table; with RLS enabled and no user policies they cannot read or mutate it.
-- The server-side Edge Function uses service_role and bypasses RLS.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_staff TO authenticated, service_role;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.has_admin_permission(p_module text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_permission boolean := false;
BEGIN
  IF auth.uid() IS NULL
     OR p_module NOT IN ('products', 'orders', 'analytics', 'expenses', 'crm', 'settings') THEN
    RETURN false;
  END IF;

  IF auth.uid() = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     AND coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin' THEN
    RETURN true;
  END IF;

  IF coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'staff' THEN
    RETURN false;
  END IF;

  SELECT coalesce((s.permissions ->> p_module) = 'true', false)
    INTO v_permission
    FROM public.admin_staff AS s
   WHERE s.user_id = auth.uid()
     AND s.is_active = true;

  RETURN coalesce(v_permission, false);
END;
$function$;

CREATE OR REPLACE FUNCTION private.has_any_admin_permission()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF auth.uid() = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     AND coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin' THEN
    RETURN true;
  END IF;

  IF coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'staff' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
      FROM public.admin_staff AS s
      CROSS JOIN LATERAL jsonb_each(s.permissions) AS permission_entry(key, value)
     WHERE s.user_id = auth.uid()
       AND s.is_active = true
       AND permission_entry.value = 'true'::jsonb
  );
END;
$function$;

CREATE OR REPLACE FUNCTION private.get_my_admin_access()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_staff public.admin_staff%rowtype;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('authorized', false);
  END IF;

  IF auth.uid() = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
     AND coalesce(auth.jwt()->'app_metadata'->>'role', '') = 'admin' THEN
    RETURN jsonb_build_object(
      'authorized', true,
      'role', 'admin',
      'display_name', coalesce(auth.jwt()->'user_metadata'->>'full_name', auth.jwt()->'user_metadata'->>'name', 'მთავარი ადმინისტრატორი'),
      'role_label', 'მთავარი ადმინისტრატორი',
      'permissions', jsonb_build_object(
        'products', true, 'orders', true, 'analytics', true,
        'expenses', true, 'crm', true, 'settings', true
      )
    );
  END IF;

  IF coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'staff' THEN
    RETURN jsonb_build_object('authorized', false);
  END IF;

  SELECT *
    INTO v_staff
    FROM public.admin_staff
   WHERE user_id = auth.uid()
     AND is_active = true
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('authorized', false);
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM jsonb_each(v_staff.permissions) AS permission_entry(key, value)
     WHERE permission_entry.value = 'true'::jsonb
  ) THEN
    RETURN jsonb_build_object('authorized', false);
  END IF;

  UPDATE public.admin_staff
     SET activated_at = coalesce(activated_at, now()),
         last_login_at = now(),
         updated_at = now()
   WHERE user_id = auth.uid();

  RETURN jsonb_build_object(
    'authorized', true,
    'role', 'staff',
    'user_id', v_staff.user_id,
    'display_name', v_staff.full_name,
    'email', v_staff.email,
    'role_label', v_staff.role_label,
    'permissions', v_staff.permissions
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_admin_access()
RETURNS jsonb
LANGUAGE sql
SET search_path = ''
AS $function$
  SELECT private.get_my_admin_access();
$function$;

REVOKE ALL ON FUNCTION private.has_admin_permission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_admin_permission(text) TO authenticated;
REVOKE ALL ON FUNCTION private.has_any_admin_permission() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_any_admin_permission() TO authenticated;
REVOKE ALL ON FUNCTION private.get_my_admin_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.get_my_admin_access() TO authenticated;
REVOKE ALL ON FUNCTION public.get_my_admin_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_admin_access() TO authenticated;

-- Recreate protected RPCs with module-specific server checks.
CREATE OR REPLACE FUNCTION private.add_support_ticket_message(p_ticket_id text, p_message text, p_access_token text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_ticket public.support_tickets%rowtype;
  v_is_admin boolean;
  v_is_customer boolean;
  v_message text := btrim(coalesce(p_message, ''));
  v_sender_role text;
  v_sender_name text;
  v_message_id bigint;
  v_created_at timestamptz;
BEGIN
  IF coalesce(length(v_message), 0) NOT BETWEEN 1 AND 4000 THEN
    RAISE EXCEPTION 'შეტყობინება უნდა შეიცავდეს 1-4000 სიმბოლოს.';
  END IF;
  SELECT t.* INTO v_ticket FROM public.support_tickets AS t WHERE t.id = p_ticket_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'მხარდაჭერის მოთხოვნა ვერ მოიძებნა.'; END IF;
  v_is_admin := private.has_admin_permission('crm');
  v_is_customer :=
    (v_ticket.customer_user_id IS NOT NULL AND auth.uid() = v_ticket.customer_user_id)
    OR (auth.uid() IS NOT NULL AND v_ticket.email IS NOT NULL
      AND lower(v_ticket.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    OR (coalesce(p_access_token, '') ~ '^[A-Fa-f0-9]{64}$'
      AND v_ticket.access_token_hash IS NOT NULL
      AND v_ticket.access_token_hash = encode(extensions.digest(lower(p_access_token), 'sha256'), 'hex'));
  IF v_is_admin IS NOT TRUE AND v_is_customer IS NOT TRUE THEN
    RAISE EXCEPTION 'მიმოწერაში პასუხის დამატების უფლება არ გაქვთ.' USING ERRCODE = '42501';
  END IF;
  v_sender_role := CASE WHEN v_is_admin IS TRUE THEN 'admin' ELSE 'customer' END;
  v_sender_name := CASE WHEN v_is_admin IS TRUE THEN 'GEOSTORE' ELSE v_ticket.customer_name END;
  INSERT INTO public.support_ticket_messages(ticket_id, ticket_ref, sender_role, sender_name, message)
    VALUES (p_ticket_id, p_ticket_id, v_sender_role, v_sender_name, v_message)
    RETURNING id, created_at INTO v_message_id, v_created_at;
  IF v_is_admin IS TRUE THEN
    UPDATE public.support_tickets SET reply = v_message, status = 'მუშავდება' WHERE id = p_ticket_id;
  ELSE
    UPDATE public.support_tickets SET status = 'ღია' WHERE id = p_ticket_id;
  END IF;
  RETURN jsonb_build_object('message_id', v_message_id, 'ticket_id', p_ticket_id,
    'sender_role', v_sender_role, 'created_at', v_created_at);
END;
$function$


CREATE OR REPLACE FUNCTION private.add_support_ticket_message_idempotent(p_ticket_id text, p_message text, p_access_token text, p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ticket public.support_tickets%rowtype;
  v_existing public.support_ticket_messages%rowtype;
  v_is_admin boolean;
  v_is_customer boolean;
  v_message text := btrim(coalesce(p_message, ''));
  v_sender_role text;
  v_sender_name text;
  v_message_id bigint;
  v_created_at timestamptz;
  v_inserted boolean := false;
begin
  if p_request_id is null then
    raise exception 'შეტყობინების მოთხოვნის იდენტიფიკატორი სავალდებულოა.';
  end if;
  if coalesce(length(v_message), 0) not between 1 and 4000 then
    raise exception 'შეტყობინება უნდა შეიცავდეს 1-4000 სიმბოლოს.';
  end if;
  select t.* into v_ticket from public.support_tickets as t where t.id = p_ticket_id for update;
  if not found then raise exception 'მხარდაჭერის მოთხოვნა ვერ მოიძებნა.'; end if;
  v_is_admin := private.has_admin_permission('crm');
  v_is_customer :=
    (v_ticket.customer_user_id is not null and auth.uid() = v_ticket.customer_user_id)
    or (auth.uid() is not null and v_ticket.email is not null
      and lower(v_ticket.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    or (coalesce(p_access_token, '') ~ '^[A-Fa-f0-9]{64}$'
      and v_ticket.access_token_hash is not null
      and v_ticket.access_token_hash = encode(extensions.digest(lower(p_access_token), 'sha256'), 'hex'));
  if v_is_admin is not true and v_is_customer is not true then
    raise exception 'მიმოწერაში პასუხის დამატების უფლება არ გაქვთ.' using errcode = '42501';
  end if;
  v_sender_role := case when v_is_admin then 'admin' else 'customer' end;
  v_sender_name := case when v_is_admin then 'GEOSTORE' else v_ticket.customer_name end;
  insert into public.support_ticket_messages
    (ticket_id, ticket_ref, sender_role, sender_name, message, request_id)
  values (p_ticket_id, p_ticket_id, v_sender_role, v_sender_name, v_message, p_request_id)
  on conflict (request_id) where request_id is not null do nothing
  returning id, created_at into v_message_id, v_created_at;
  v_inserted := found;
  if not v_inserted then
    select m.* into v_existing from public.support_ticket_messages as m where m.request_id = p_request_id;
    if not found or v_existing.ticket_ref is distinct from p_ticket_id
      or v_existing.sender_role is distinct from v_sender_role
      or v_existing.message is distinct from v_message then
      raise exception 'ეს მოთხოვნის იდენტიფიკატორი უკვე გამოყენებულია სხვა შეტყობინებისთვის.';
    end if;
    v_message_id := v_existing.id;
    v_created_at := v_existing.created_at;
  else
    if v_is_admin then
      update public.support_tickets set reply = v_message, status = 'მუშავდება' where id = p_ticket_id;
    else
      update public.support_tickets set status = 'ღია' where id = p_ticket_id;
    end if;
  end if;
  return jsonb_build_object('message_id', v_message_id, 'ticket_id', p_ticket_id,
    'sender_role', v_sender_role, 'created_at', v_created_at, 'idempotent_replay', not v_inserted);
end;
$function$


CREATE OR REPLACE FUNCTION private.admin_apply_flash_sale(p_discount_percent numeric, p_category text, p_duration_hours integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_jwt jsonb := (SELECT auth.jwt());
  v_updated integer;
  v_started_at timestamptz := now();
  v_ends_at timestamptz;
BEGIN
  IF NOT private.has_admin_permission('products') THEN
    RAISE EXCEPTION 'Not authorized to apply flash sale' USING ERRCODE = '42501';
  END IF;

  IF p_discount_percent IS NULL
     OR p_discount_percent <= 0
     OR p_discount_percent >= 100
     OR p_discount_percent <> round(p_discount_percent, 2) THEN
    RAISE EXCEPTION 'Discount percent must be greater than 0, less than 100, and have at most 2 decimal places'
      USING ERRCODE = '22023';
  END IF;

  IF COALESCE(trim(p_category), '') = '' THEN
    RAISE EXCEPTION 'Category is required' USING ERRCODE = '22023';
  END IF;

  IF p_duration_hours IS NULL OR p_duration_hours NOT IN (1, 3, 6, 12, 24, 48) THEN
    RAISE EXCEPTION 'Flash sale duration must be one of 1, 3, 6, 12, 24, or 48 hours'
      USING ERRCODE = '22023';
  END IF;

  v_ends_at := v_started_at + make_interval(hours => p_duration_hours);

  UPDATE public.products
     SET old_price_gel = CASE
           WHEN old_price_gel > price_gel THEN old_price_gel
           ELSE price_gel
         END,
         price_gel = ROUND(
           (CASE WHEN old_price_gel > price_gel THEN old_price_gel ELSE price_gel END)
           * (1 - p_discount_percent / 100),
           2
         ),
         flash_sale_started_at = v_started_at,
         flash_sale_ends_at = v_ends_at,
         flash_sale_percent = p_discount_percent
   WHERE (p_category = 'ყველა' OR category = p_category)
     AND COALESCE(variants, '[]'::jsonb) = '[]'::jsonb
     AND ROUND(
           (CASE WHEN old_price_gel > price_gel THEN old_price_gel ELSE price_gel END)
           * (1 - p_discount_percent / 100),
           2
         ) < (CASE WHEN old_price_gel > price_gel THEN old_price_gel ELSE price_gel END);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$function$


CREATE OR REPLACE FUNCTION private.admin_delete_product(p_product_id text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_jwt jsonb := (SELECT auth.jwt());
  v_deleted integer;
BEGIN
  IF NOT private.has_admin_permission('products') THEN
    RAISE EXCEPTION 'Not authorized to delete products' USING ERRCODE = '42501';
  END IF;

  IF COALESCE(trim(p_product_id), '') = '' THEN
    RAISE EXCEPTION 'პროდუქტის ID არასწორია.' USING ERRCODE = '22023';
  END IF;

  -- Serialize deletion with checkout/product updates before checking history.
  PERFORM 1
    FROM public.products
   WHERE id = p_product_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Orders store product snapshots in JSONB rather than a foreign key.
  -- Keep catalog records referenced by any order, including cancelled orders.
  -- Support both current "id" and legacy "product_id" snapshot keys.
  IF EXISTS (
    SELECT 1
      FROM public.orders AS o
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(o.items) = 'array' THEN o.items
          ELSE '[]'::jsonb
        END
      ) AS order_item(item)
     WHERE order_item.item->>'id' = p_product_id
        OR order_item.item->>'product_id' = p_product_id
  ) THEN
    RAISE EXCEPTION 'პროდუქტი შეკვეთების ისტორიაში გამოიყენება და მისი წაშლა დაუშვებელია. შეკვეთების ისტორიის შესანარჩუნებლად პროდუქტი კატალოგში დატოვეთ.';
  END IF;

  DELETE FROM public.products
   WHERE id = p_product_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted = 1;
END;
$function$


CREATE OR REPLACE FUNCTION private.admin_list_products()
 RETURNS SETOF products
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_jwt jsonb := (SELECT auth.jwt());
BEGIN
  IF NOT (private.has_admin_permission('products') OR private.has_admin_permission('analytics')) THEN
    RAISE EXCEPTION 'Not authorized to read admin product data'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT *
    FROM public.products
    ORDER BY created_at DESC NULLS LAST, id ASC;
END;
$function$


CREATE OR REPLACE FUNCTION private.admin_save_order_note(p_order_id text, p_admin_note text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF NOT private.has_admin_permission('orders') THEN
    RAISE EXCEPTION 'Not authorized to save order note' USING ERRCODE = '42501';
  END IF;

  UPDATE public.orders
     SET admin_note = left(COALESCE(p_admin_note, ''), 5000)
   WHERE id::text = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN true;
END;
$function$


CREATE OR REPLACE FUNCTION private.admin_save_product(p_product jsonb)
 RETURNS products
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_jwt jsonb := (SELECT auth.jwt());
  v_product public.products;
BEGIN
  IF NOT private.has_admin_permission('products') THEN
    RAISE EXCEPTION 'Not authorized to save products' USING ERRCODE = '42501';
  END IF;

  IF p_product IS NULL
     OR COALESCE(trim(p_product ->> 'id'), '') = ''
     OR COALESCE(trim(p_product ->> 'name'), '') = ''
     OR NULLIF(p_product ->> 'price_gel', '') IS NULL
     OR (p_product ->> 'price_gel')::numeric < 0
     OR COALESCE((p_product ->> 'stock')::integer, 0) < 0 THEN
    RAISE EXCEPTION 'Invalid product payload' USING ERRCODE = '22023';
  END IF;

  -- This RPC is used only for product creation. Never turn an ID collision
  -- into an update: an upsert could overwrite stock changed by checkout.
  -- Override any client value with the database timestamp for deterministic
  -- newest-first catalogue ordering and a verifiable server response.
  INSERT INTO public.products
  SELECT (
    jsonb_populate_record(
      NULL::public.products,
      p_product || jsonb_build_object('created_at', now())
    )
  ).*
  RETURNING * INTO v_product;

  RETURN v_product;
END;
$function$


CREATE OR REPLACE FUNCTION private.admin_set_product_custom_variant_stocks(p_product_id text, p_variant_stocks jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_variants jsonb;
  v_total_stock integer;
BEGIN
  IF NOT private.has_admin_permission('products') THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლებები არ დადასტურდა.';
  END IF;

  IF coalesce(trim(p_product_id), '') = ''
     OR p_variant_stocks IS NULL
     OR jsonb_typeof(p_variant_stocks) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_variant_stocks) NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'ინდივიდუალური ვარიანტების მარაგის მონაცემები არასწორია.';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_variant_stocks) AS entry(item)
     WHERE jsonb_typeof(entry.item) IS DISTINCT FROM 'object'
        OR coalesce(trim(entry.item->>'id'), '') = ''
        OR length(entry.item->>'id') > 120
        OR coalesce(entry.item->>'stock', '') !~ '^[0-9]{1,7}$'
        OR (entry.item->>'stock')::integer NOT BETWEEN 0 AND 1000000
  ) THEN
    RAISE EXCEPTION 'ინდივიდუალური ვარიანტის მარაგი უნდა იყოს მთელი რიცხვი 0-დან 1,000,000-მდე.';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_variant_stocks) AS entry(item)
     GROUP BY entry.item->>'id'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'ინდივიდუალური ვარიანტების ID დუბლირებულია.';
  END IF;

  SELECT variants
    INTO v_variants
    FROM public.products
   WHERE id = p_product_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'პროდუქტი ვერ მოიძებნა.';
  END IF;
  IF jsonb_typeof(coalesce(v_variants, '[]'::jsonb)) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'პროდუქტის ვარიანტების მონაცემები არასწორია.';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_variant_stocks) AS requested(item)
     WHERE NOT EXISTS (
       SELECT 1
         FROM jsonb_array_elements(coalesce(v_variants, '[]'::jsonb)) AS current_variant(item)
        WHERE current_variant.item->>'id' = requested.item->>'id'
          AND coalesce(current_variant.item->>'variantType', 'custom') <> 'size_color'
     )
  ) THEN
    RAISE EXCEPTION 'მარაგის ID პროდუქტში არსებულ ინდივიდუალურ ვარიანტს არ ემთხვევა.';
  END IF;

  PERFORM set_config('geostore.inventory_reason', 'manual_adjustment', true);
  PERFORM set_config('geostore.inventory_order_id', '', true);
  PERFORM set_config('geostore.variant_stock_adjustment', 'on', true);

  UPDATE public.products AS p
     SET variants = (
       SELECT jsonb_agg(
         CASE
           WHEN patch.stock_value IS NOT NULL
             THEN jsonb_set(variant.value, '{stock}', patch.stock_value, true)
           ELSE variant.value
         END
         ORDER BY variant.ordinality
       )
         FROM jsonb_array_elements(coalesce(p.variants, '[]'::jsonb))
           WITH ORDINALITY AS variant(value, ordinality)
         LEFT JOIN LATERAL (
           SELECT requested.item->'stock' AS stock_value
             FROM jsonb_array_elements(p_variant_stocks) AS requested(item)
            WHERE requested.item->>'id' = variant.value->>'id'
            LIMIT 1
         ) AS patch ON true
     )
   WHERE p.id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ინდივიდუალური ვარიანტის მარაგის შენახვა ვერ მოხერხდა.';
  END IF;

  SELECT coalesce(sum((entry.item->>'stock')::integer), 0)::integer
    INTO v_total_stock
    FROM public.products AS p
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(p.variants, '[]'::jsonb)) AS entry(item)
   WHERE p.id = p_product_id;

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'updated', jsonb_array_length(p_variant_stocks),
    'stock', v_total_stock
  );
END;
$function$


CREATE OR REPLACE FUNCTION private.admin_set_product_variant_stock_batches(p_product_id text, p_size_color_stocks jsonb, p_custom_variant_stocks jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_size_result jsonb := NULL;
  v_custom_result jsonb := NULL;
  v_size_count integer := 0;
  v_custom_count integer := 0;
BEGIN
  IF NOT private.has_admin_permission('products') THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლებები არ დადასტურდა.';
  END IF;

  IF coalesce(trim(p_product_id), '') = '' THEN
    RAISE EXCEPTION 'პროდუქტის ID არასწორია.';
  END IF;

  IF p_size_color_stocks IS NOT NULL
     AND jsonb_typeof(p_size_color_stocks) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'ზომისა და ფერის მარაგის სია არასწორია.';
  END IF;
  IF p_custom_variant_stocks IS NOT NULL
     AND jsonb_typeof(p_custom_variant_stocks) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'ინდივიდუალური ვარიანტების მარაგის სია არასწორია.';
  END IF;

  v_size_count := coalesce(jsonb_array_length(p_size_color_stocks), 0);
  v_custom_count := coalesce(jsonb_array_length(p_custom_variant_stocks), 0);

  IF v_size_count = 0 AND v_custom_count = 0 THEN
    RAISE EXCEPTION 'მარაგის შესაცვლელი ვარიანტები მითითებული არ არის.';
  END IF;

  IF v_size_count > 0 THEN
    v_size_result := private.admin_set_product_variant_stocks(
      p_product_id,
      p_size_color_stocks
    );
  END IF;

  IF v_custom_count > 0 THEN
    v_custom_result := private.admin_set_product_custom_variant_stocks(
      p_product_id,
      p_custom_variant_stocks
    );
  END IF;

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'size_color', v_size_result,
    'custom', v_custom_result
  );
END;
$function$


CREATE OR REPLACE FUNCTION private.admin_set_product_variant_stocks(p_product_id text, p_variant_stocks jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_variants jsonb;
  v_updated integer;
  v_total_stock integer;
BEGIN
  IF NOT private.has_admin_permission('products') THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლებები არ დადასტურდა.';
  END IF;

  IF coalesce(trim(p_product_id), '') = ''
     OR p_variant_stocks IS NULL
     OR jsonb_typeof(p_variant_stocks) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'ზომისა და ფერის მარაგის მონაცემები არასწორია.';
  END IF;
  IF jsonb_array_length(p_variant_stocks) NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'მარაგის ცვლილებები უნდა იყოს 1-დან 50-მდე.';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_variant_stocks) AS entry(item)
     WHERE jsonb_typeof(entry.item) IS DISTINCT FROM 'object'
        OR coalesce(trim(entry.item->>'id'), '') = ''
        OR length(entry.item->>'id') > 120
        OR coalesce(entry.item->>'stock', '') !~ '^[0-9]{1,7}$'
        OR (entry.item->>'stock')::integer NOT BETWEEN 0 AND 1000000
  ) THEN
    RAISE EXCEPTION 'ზომისა და ფერის მარაგის რაოდენობა არასწორია.';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_variant_stocks) AS entry(item)
     GROUP BY entry.item->>'id'
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'ზომისა და ფერის მარაგში დუბლირებული ID აღმოჩნდა.';
  END IF;

  SELECT variants
    INTO v_variants
    FROM public.products
   WHERE id = p_product_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'პროდუქტი ვერ მოიძებნა.';
  END IF;
  IF jsonb_typeof(coalesce(v_variants, '[]'::jsonb)) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'პროდუქტის ვარიანტების მონაცემები არასწორია.';
  END IF;

  -- Accept only the explicitly changed inventory IDs. Unlisted variants are
  -- deliberately left untouched so a stale admin form cannot restore stock
  -- already consumed by a concurrent checkout.
  IF EXISTS (
    SELECT 1
      FROM jsonb_array_elements(p_variant_stocks) AS requested(item)
     WHERE NOT EXISTS (
       SELECT 1
         FROM jsonb_array_elements(coalesce(v_variants, '[]'::jsonb)) AS current_variant(item)
        WHERE current_variant.item->>'id' = requested.item->>'id'
          AND current_variant.item->>'variantType' = 'size_color'
     )
  ) THEN
    RAISE EXCEPTION 'მარაგის ID პროდუქტში არსებულ ზომისა და ფერის კომბინაციას არ ემთხვევა.';
  END IF;

  PERFORM set_config('geostore.inventory_reason', 'manual_adjustment', true);
  PERFORM set_config('geostore.inventory_order_id', '', true);
  PERFORM set_config('geostore.variant_stock_adjustment', 'on', true);

  UPDATE public.products AS p
     SET variants = (
       SELECT jsonb_agg(
         CASE
           WHEN patch.stock_value IS NOT NULL
             THEN jsonb_set(variant.value, '{stock}', patch.stock_value, true)
           ELSE variant.value
         END
         ORDER BY variant.ordinality
       )
         FROM jsonb_array_elements(coalesce(p.variants, '[]'::jsonb))
           WITH ORDINALITY AS variant(value, ordinality)
         LEFT JOIN LATERAL (
           SELECT requested.item->'stock' AS stock_value
             FROM jsonb_array_elements(p_variant_stocks) AS requested(item)
            WHERE requested.item->>'id' = variant.value->>'id'
            LIMIT 1
         ) AS patch ON true
     )
   WHERE p.id = p_product_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated <> 1 THEN
    RAISE EXCEPTION 'ზომებისა და ფერის მარაგის შენახვა ვერ მოხერხდა.';
  END IF;

  SELECT coalesce(sum((entry.item->>'stock')::integer), 0)::integer
    INTO v_total_stock
    FROM public.products AS p
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(p.variants, '[]'::jsonb)) AS entry(item)
   WHERE p.id = p_product_id
     AND entry.item->>'variantType' = 'size_color';

  RETURN jsonb_build_object(
    'product_id', p_product_id,
    'updated', jsonb_array_length(p_variant_stocks),
    'stock', v_total_stock
  );
END;
$function$


CREATE OR REPLACE FUNCTION private.admin_update_order_status(p_order_id text, p_new_status text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_updated integer;
begin
  IF NOT private.has_admin_permission('orders') THEN
    raise exception 'ადმინისტრატორის უფლებები არ დადასტურდა.';
  end if;

  if p_new_status is null
     or p_new_status not in ('ახალი', 'მუშავდება', 'გაგზავნილი', 'დასრულებული', 'გაუქმებული') then
    raise exception 'შეკვეთის სტატუსი არასწორია.';
  end if;

  select * into v_order
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'შეკვეთა ვერ მოიძებნა.';
  end if;

  if v_order.status in ('დასრულებული', 'ჩაბარებულია')
     and p_new_status not in ('დასრულებული', 'ჩაბარებულია') then
    raise exception 'ჩაბარებული შეკვეთა დასრულებულად რჩება. სტატუსის უკუსვლა დაუშვებელია.';
  end if;

  if v_order.status in ('გაგზავნილი', 'გზაშია')
     and p_new_status not in ('გაგზავნილი', 'გზაშია', 'დასრულებული', 'ჩაბარებულია') then
    raise exception 'გაგზავნილი შეკვეთის წინა სტატუსზე დაბრუნება ან გაუქმება დაუშვებელია.';
  end if;

  if v_order.status = 'გაუქმებული' and p_new_status <> 'გაუქმებული' then
    raise exception 'გაუქმებული შეკვეთის ხელახლა გააქტიურება დაუშვებელია.';
  end if;

  if p_new_status = 'გაუქმებული'
     and v_order.status <> 'გაუქმებული'
     and v_order.stock_deducted_at is not null
     and v_order.stock_restored_at is null then
    perform set_config('geostore.inventory_reason', 'order_cancellation', true);
    perform set_config('geostore.inventory_order_id', p_order_id, true);
    if jsonb_typeof(coalesce(v_order.items, '[]'::jsonb)) <> 'array'
       or jsonb_array_length(coalesce(v_order.items, '[]'::jsonb)) = 0 then
      raise exception 'შეკვეთის პროდუქტების სია ცარიელია ან არასწორია.';
    end if;

    -- Validate each raw line before aggregation. This prevents a negative or
    -- malformed quantity from being hidden by another line for the same SKU.
    if exists (
      select 1
        from jsonb_array_elements(v_order.items) as e(item)
       where jsonb_typeof(e.item) is distinct from 'object'
          or coalesce(trim(e.item->>'id'), '') = ''
          or coalesce(e.item->>'quantity', '') !~ ('^[0-9]+' || chr(36))
          or case
               when coalesce(e.item->>'quantity', '') ~ ('^[0-9]+' || chr(36))
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

    perform set_config('geostore.variant_stock_adjustment', 'on', true);
    for v_item in
      select item->>'id' as product_id,
             nullif(trim(item->>'customVariantId'), '') as custom_variant_id,
             sum((item->>'quantity')::integer)::integer as quantity
        from jsonb_array_elements(v_order.items) as e(item)
       group by item->>'id', nullif(trim(item->>'customVariantId'), '')
       order by item->>'id', nullif(trim(item->>'customVariantId'), '')
    loop
      if coalesce(trim(v_item.product_id), '') = '' or v_item.quantity is null or v_item.quantity <= 0 then
        raise exception 'შეკვეთის პროდუქტის ID ან რაოდენობა არასწორია.';
      end if;

      if v_item.custom_variant_id is null then
        update public.products set stock = coalesce(stock, 0) + v_item.quantity
         where id = v_item.product_id;
      else
        update public.products p
           set variants = (
             select jsonb_agg(
               case when element->>'id' = v_item.custom_variant_id
                 then jsonb_set(element, '{stock}', to_jsonb((element->>'stock')::integer + v_item.quantity), true)
                 else element end
               order by ordinality
             )
             from jsonb_array_elements(case when jsonb_typeof(p.variants) = 'array' then p.variants else '[]'::jsonb end)
               with ordinality as variant_rows(element, ordinality)
           )
         where p.id = v_item.product_id
           and exists (select 1 from jsonb_array_elements(case when jsonb_typeof(p.variants) = 'array' then p.variants else '[]'::jsonb end) element where element->>'id' = v_item.custom_variant_id);
      end if;

      get diagnostics v_updated = row_count;
      if v_updated <> 1 then raise exception 'მარაგის აღდგენა ვერ მოხერხდა პროდუქტისთვის ან ვარიანტისთვის: %', v_item.product_id; end if;
    end loop;

    update public.orders
       set status = p_new_status,
           stock_restored_at = now()
     where id = p_order_id;
  else
    update public.orders
       set status = p_new_status
     where id = p_order_id;
  end if;

  return jsonb_build_object('order_id', p_order_id, 'status', p_new_status);
end;
$function$


CREATE OR REPLACE FUNCTION private.admin_update_product_with_stock(p_product jsonb, p_size_color_stocks jsonb, p_custom_variant_stocks jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_jwt jsonb := (select auth.jwt());
  v_product_id text;
  v_existing public.products;
  v_updated public.products;
  v_stock_result jsonb;
  v_product_result jsonb;
  v_size_count integer := 0;
  v_custom_count integer := 0;
begin
  IF NOT private.has_admin_permission('products') THEN
    raise exception 'Not authorized to update products' using errcode = '42501';
  end if;

  if p_product is null or jsonb_typeof(p_product) is distinct from 'object' then
    raise exception 'Invalid product payload' using errcode = '22023';
  end if;

  v_product_id := nullif(trim(p_product ->> 'id'), '');
  if v_product_id is null
     or coalesce(trim(p_product ->> 'name'), '') = ''
     or nullif(p_product ->> 'price_gel', '') is null
     or (p_product ->> 'price_gel')::numeric < 0 then
    raise exception 'Invalid product payload' using errcode = '22023';
  end if;

  if nullif(p_product ->> 'stock', '') is not null
     and (p_product ->> 'stock') !~ '^[0-9]+$' then
    raise exception 'Invalid product stock' using errcode = '22023';
  end if;

  if nullif(p_product ->> 'stock', '') is not null
     and (p_product ->> 'stock')::numeric > 1000000 then
    raise exception 'Invalid product stock' using errcode = '22023';
  end if;

  if p_size_color_stocks is not null
     and jsonb_typeof(p_size_color_stocks) is distinct from 'array' then
    raise exception 'Invalid size/color stock list' using errcode = '22023';
  end if;

  if p_custom_variant_stocks is not null
     and jsonb_typeof(p_custom_variant_stocks) is distinct from 'array' then
    raise exception 'Invalid custom variant stock list' using errcode = '22023';
  end if;

  v_size_count := coalesce(jsonb_array_length(p_size_color_stocks), 0);
  v_custom_count := coalesce(jsonb_array_length(p_custom_variant_stocks), 0);

  select p.*
    into v_existing
    from public.products as p
   where p.id = v_product_id
   for update;

  if not found then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;

  -- Use the locked current row as the base so omitted fields stay unchanged.
  -- Existing database triggers preserve stock for variants not explicitly edited.
  v_updated := jsonb_populate_record(v_existing, p_product - 'id' - 'created_at');

  perform set_config('geostore.inventory_reason', 'manual_adjustment', true);
  perform set_config('geostore.inventory_order_id', '', true);
  update public.products as p
     set (
       sku, name, category, brand, vendor, price_gel, old_price_gel, stock,
       image, description, available_sizes, available_colors, material,
       durability, purchase_cost, gallery, variants, tags, model, cpu, ram,
       storage, gpu, screen_size, os, is_featured, is_published
     ) = (
       v_updated.sku, v_updated.name, v_updated.category, v_updated.brand,
       v_updated.vendor, v_updated.price_gel, v_updated.old_price_gel,
       v_updated.stock, v_updated.image, v_updated.description,
       v_updated.available_sizes, v_updated.available_colors, v_updated.material,
       v_updated.durability, v_updated.purchase_cost, v_updated.gallery,
       v_updated.variants, v_updated.tags, v_updated.model, v_updated.cpu,
       v_updated.ram, v_updated.storage, v_updated.gpu, v_updated.screen_size,
       v_updated.os, v_updated.is_featured, v_updated.is_published
     )
   where p.id = v_product_id;

  if v_size_count > 0 or v_custom_count > 0 then
    v_stock_result := private.admin_set_product_variant_stock_batches(
      v_product_id,
      coalesce(p_size_color_stocks, '[]'::jsonb),
      coalesce(p_custom_variant_stocks, '[]'::jsonb)
    );
  else
    v_stock_result := jsonb_build_object(
      'product_id', v_product_id,
      'size_color', null,
      'custom', null
    );
  end if;

  select to_jsonb(p)
    into v_product_result
    from public.products as p
   where p.id = v_product_id;

  return jsonb_build_object(
    'product', v_product_result,
    'stock', v_stock_result
  );
end;
$function$


CREATE OR REPLACE FUNCTION private.get_support_ticket_messages(p_ticket_id text, p_access_token text DEFAULT NULL::text)
 RETURNS TABLE(id bigint, sender_role text, sender_name text, message text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_ticket public.support_tickets%rowtype;
  v_is_admin boolean;
  v_is_customer boolean;
BEGIN
  SELECT t.* INTO v_ticket FROM public.support_tickets AS t WHERE t.id = p_ticket_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'მხარდაჭერის მოთხოვნა ვერ მოიძებნა.'; END IF;
  v_is_admin := private.has_admin_permission('crm');
  v_is_customer :=
    (v_ticket.customer_user_id IS NOT NULL AND auth.uid() = v_ticket.customer_user_id)
    OR (auth.uid() IS NOT NULL AND v_ticket.email IS NOT NULL
      AND lower(v_ticket.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
    OR (coalesce(p_access_token, '') ~ '^[A-Fa-f0-9]{64}$'
      AND v_ticket.access_token_hash IS NOT NULL
      AND v_ticket.access_token_hash = encode(extensions.digest(lower(p_access_token), 'sha256'), 'hex'));
  IF v_is_admin IS NOT TRUE AND v_is_customer IS NOT TRUE THEN
    RAISE EXCEPTION 'მიმოწერის ნახვის უფლება არ გაქვთ.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT m.id, m.sender_role, m.sender_name, m.message, m.created_at
    FROM public.support_ticket_messages AS m
    WHERE m.ticket_ref = p_ticket_id ORDER BY m.created_at, m.id;
END;
$function$


CREATE OR REPLACE FUNCTION private.list_inventory_movements(p_product_id text DEFAULT NULL::text, p_before_id bigint DEFAULT NULL::bigint, p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_result jsonb;
BEGIN
  IF NOT private.has_admin_permission('products') THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლებები არ დადასტურდა.'
      USING ERRCODE = '42501';
  END IF;

  WITH page AS (
    SELECT m.*
      FROM private.inventory_movements AS m
     WHERE (p_product_id IS NULL OR m.product_id = p_product_id)
       AND (p_before_id IS NULL OR m.id < p_before_id)
     ORDER BY m.id DESC
     LIMIT v_limit + 1
  ),
  visible_page AS (
    SELECT *
      FROM page
     ORDER BY id DESC
     LIMIT v_limit
  )
  SELECT jsonb_build_object(
    'items', coalesce(
      (SELECT jsonb_agg(to_jsonb(v) ORDER BY v.id DESC) FROM visible_page AS v),
      '[]'::jsonb
    ),
    'has_more', (SELECT count(*) > v_limit FROM page),
    'next_cursor', CASE
      WHEN (SELECT count(*) > v_limit FROM page)
        THEN (SELECT min(id) FROM visible_page)
      ELSE NULL
    END
  )
  INTO v_result;

  RETURN v_result;
END;
$function$


CREATE OR REPLACE FUNCTION private.list_inventory_replenishment_settings(p_limit integer DEFAULT 500)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_limit integer := least(greatest(coalesce(p_limit, 500), 1), 1000);
  v_items jsonb;
  v_has_more boolean;
BEGIN
  IF NOT private.has_admin_permission('products') THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლებები არ დადასტურდა.'
      USING ERRCODE = '42501';
  END IF;

  WITH page AS (
    SELECT s.*
      FROM private.inventory_replenishment_settings AS s
     ORDER BY s.product_id, coalesce(s.variant_id, '')
     LIMIT v_limit + 1
  )
  SELECT
    coalesce(jsonb_agg(to_jsonb(items) ORDER BY items.product_id, coalesce(items.variant_id, ''))
      FILTER (WHERE items.row_number <= v_limit), '[]'::jsonb),
    count(*) > v_limit
    INTO v_items, v_has_more
    FROM (
      SELECT page.*, row_number() OVER (ORDER BY product_id, coalesce(variant_id, '')) AS row_number
        FROM page
    ) AS items;

  RETURN jsonb_build_object('items', v_items, 'has_more', v_has_more);
END;
$function$


CREATE OR REPLACE FUNCTION private.publish_storefront_config(p_snapshot jsonb, p_version_label text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_admin_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_version_id uuid;
  v_category_count integer;
  v_banner_count integer;
  v_bad_count integer;
begin
  if not private.has_admin_permission('settings') then
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

  insert into public.storefront_config (
    config_key, draft_config, published_config, is_published,
    draft_updated_at, published_at, updated_by
  )
  values ('storefront', p_snapshot, p_snapshot, true, v_now, v_now, v_admin_id)
  on conflict (config_key) do update
  set draft_config = excluded.draft_config,
      published_config = excluded.published_config,
      is_published = true,
      draft_updated_at = excluded.draft_updated_at,
      published_at = excluded.published_at,
      updated_by = excluded.updated_by;

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

  return jsonb_build_object('version_id', v_version_id, 'published_at', v_now);
end;
$function$


CREATE OR REPLACE FUNCTION private.save_inventory_replenishment_setting(p_product_id text, p_variant_id text, p_low_stock_threshold integer, p_target_stock integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_product public.products%ROWTYPE;
  v_variant_name text;
  v_saved private.inventory_replenishment_settings%ROWTYPE;
BEGIN
  IF NOT private.has_admin_permission('products') THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლებები არ დადასტურდა.'
      USING ERRCODE = '42501';
  END IF;

  IF coalesce(trim(p_product_id), '') = ''
     OR p_variant_id IS NOT NULL AND trim(p_variant_id) = ''
     OR p_low_stock_threshold IS NULL
     OR p_low_stock_threshold < 0 OR p_low_stock_threshold > 100000
     OR p_target_stock IS NULL
     OR p_target_stock <= p_low_stock_threshold OR p_target_stock > 1000000 THEN
    RAISE EXCEPTION 'მარაგის ზღვარი ან სამიზნე რაოდენობა არასწორია.'
      USING ERRCODE = '22023';
  END IF;

  SELECT p.* INTO v_product
    FROM public.products AS p
   WHERE p.id = p_product_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'პროდუქტი ვერ მოიძებნა.'
      USING ERRCODE = 'P0002';
  END IF;

  IF p_variant_id IS NOT NULL THEN
    SELECT coalesce(nullif(v.item->>'name', ''), nullif(v.item->>'label', ''))
      INTO v_variant_name
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(coalesce(v_product.variants, '[]'::jsonb)) = 'array'
          THEN coalesce(v_product.variants, '[]'::jsonb) ELSE '[]'::jsonb END
      ) AS v(item)
     WHERE v.item->>'id' = p_variant_id
     LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'პროდუქტის მითითებული ვარიანტი აღარ არსებობს.'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  INSERT INTO private.inventory_replenishment_settings (
    product_id, variant_id, product_name, variant_name,
    low_stock_threshold, target_stock, updated_by
  ) VALUES (
    p_product_id, p_variant_id, coalesce(v_product.name, p_product_id), v_variant_name,
    p_low_stock_threshold, p_target_stock, auth.uid()
  )
  ON CONFLICT (product_id, (coalesce(variant_id, '')))
  DO UPDATE SET
    product_name = EXCLUDED.product_name,
    variant_name = EXCLUDED.variant_name,
    low_stock_threshold = EXCLUDED.low_stock_threshold,
    target_stock = EXCLUDED.target_stock,
    updated_by = EXCLUDED.updated_by,
    updated_at = clock_timestamp()
  RETURNING * INTO v_saved;

  RETURN jsonb_build_object('success', true, 'setting', to_jsonb(v_saved));
END;
$function$


CREATE OR REPLACE FUNCTION private.write_admin_activity_log(p_action text)
 RETURNS TABLE(id bigint, action text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_action text := btrim(coalesce(p_action, ''));
BEGIN
  IF NOT private.has_any_admin_permission() THEN
    RAISE EXCEPTION 'ადმინისტრატორის უფლება არ დადასტურდა.' USING ERRCODE = '42501';
  END IF;

  IF char_length(v_action) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'აქტივობის ჩანაწერი უნდა იყოს 1-500 სიმბოლო.';
  END IF;

  RETURN QUERY
  INSERT INTO private.admin_activity_log (actor_id, action)
  VALUES (auth.uid(), v_action)
  RETURNING private.admin_activity_log.id, private.admin_activity_log.action, private.admin_activity_log.created_at;
END;
$function$


CREATE OR REPLACE FUNCTION public.get_support_ticket_status(p_ticket_id text, p_access_token text DEFAULT NULL::text)
 RETURNS TABLE(status text, created_at timestamp with time zone, last_message_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ticket public.support_tickets%rowtype;
  v_is_admin boolean;
  v_is_customer boolean;
begin
  if coalesce(btrim(p_ticket_id), '') = '' then
    raise exception 'მხარდაჭერის მოთხოვნის ნომერი სავალდებულოა.';
  end if;

  select t.* into v_ticket
  from public.support_tickets as t
  where t.id = p_ticket_id;

  if not found then
    raise exception 'მხარდაჭერის მოთხოვნა ვერ მოიძებნა.';
  end if;

  v_is_admin := private.has_admin_permission('crm');

  v_is_customer :=
    (v_ticket.customer_user_id is not null and auth.uid() = v_ticket.customer_user_id)
    or (
      auth.uid() is not null
      and v_ticket.email is not null
      and lower(v_ticket.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    or (
      coalesce(p_access_token, '') ~ '^[A-Fa-f0-9]{64}$'
      and v_ticket.access_token_hash is not null
      and v_ticket.access_token_hash =
        encode(extensions.digest(lower(p_access_token), 'sha256'), 'hex')
    );

  if v_is_admin is not true and v_is_customer is not true then
    raise exception 'მიმართვის სტატუსის ნახვის უფლება არ გაქვთ.'
      using errcode = '42501';
  end if;

  return query
  select
    v_ticket.status::text,
    v_ticket.created_at,
    coalesce(
      (select max(m.created_at)
       from public.support_ticket_messages as m
       where m.ticket_ref = p_ticket_id),
      v_ticket.created_at
    );
end;
$function$


CREATE OR REPLACE FUNCTION public.get_support_ticket_unread_counts()
 RETURNS TABLE(ticket_id text, unread_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not private.has_admin_permission('crm') then
    raise exception 'მხარდაჭერის სტატისტიკის ნახვის უფლება არ გაქვთ.'
      using errcode = '42501';
  end if;

  return query
  select m.ticket_ref, count(*)::bigint
  from public.support_ticket_messages as m
  where m.sender_role = 'customer'
    and m.admin_read_at is null
  group by m.ticket_ref;
end;
$function$


CREATE OR REPLACE FUNCTION public.mark_support_ticket_messages_read(p_ticket_id text, p_access_token text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_ticket public.support_tickets%rowtype;
  v_is_admin boolean;
  v_is_customer boolean;
  v_updated integer := 0;
begin
  if coalesce(btrim(p_ticket_id), '') = '' then
    raise exception 'მხარდაჭერის მოთხოვნის ნომერი სავალდებულოა.';
  end if;

  select t.* into v_ticket
  from public.support_tickets as t
  where t.id = p_ticket_id;

  if not found then
    raise exception 'მხარდაჭერის მოთხოვნა ვერ მოიძებნა.';
  end if;

  v_is_admin := private.has_admin_permission('crm');

  v_is_customer :=
    (v_ticket.customer_user_id is not null and auth.uid() = v_ticket.customer_user_id)
    or (
      auth.uid() is not null
      and v_ticket.email is not null
      and lower(v_ticket.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    or (
      coalesce(p_access_token, '') ~ '^[A-Fa-f0-9]{64}$'
      and v_ticket.access_token_hash is not null
      and v_ticket.access_token_hash =
        encode(extensions.digest(lower(p_access_token), 'sha256'), 'hex')
    );

  if v_is_admin is not true and v_is_customer is not true then
    raise exception 'მიმოწერის წაკითხვის უფლება არ გაქვთ.'
      using errcode = '42501';
  end if;

  if v_is_admin then
    update public.support_ticket_messages
    set admin_read_at = now()
    where ticket_ref = p_ticket_id
      and sender_role = 'customer'
      and admin_read_at is null;
  else
    update public.support_ticket_messages
    set customer_read_at = now()
    where ticket_ref = p_ticket_id
      and sender_role = 'admin'
      and customer_read_at is null;
  end if;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$function$


-- Additive RLS policies; the existing primary-admin and customer policies remain intact.
CREATE POLICY "Staff can read authorized orders"
  ON public.orders FOR SELECT TO authenticated
  USING (private.has_admin_permission('orders') OR private.has_admin_permission('analytics'));

CREATE POLICY "Staff can read authorized products"
  ON public.products FOR SELECT TO authenticated
  USING (private.has_admin_permission('products') OR private.has_admin_permission('analytics'));

CREATE POLICY "Staff can manage expenses"
  ON public.expenses FOR ALL TO authenticated
  USING (private.has_admin_permission('expenses'))
  WITH CHECK (private.has_admin_permission('expenses'));

CREATE POLICY "Staff analytics can read expenses"
  ON public.expenses FOR SELECT TO authenticated
  USING (private.has_admin_permission('analytics'));

CREATE POLICY "Staff can read CRM messages"
  ON public.messages FOR SELECT TO authenticated
  USING (private.has_admin_permission('crm'));

CREATE POLICY "Staff can update CRM messages"
  ON public.messages FOR UPDATE TO authenticated
  USING (private.has_admin_permission('crm'))
  WITH CHECK (private.has_admin_permission('crm'));

CREATE POLICY "Staff can delete CRM messages"
  ON public.messages FOR DELETE TO authenticated
  USING (private.has_admin_permission('crm'));

CREATE POLICY "Staff can read support tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (private.has_admin_permission('crm'));

CREATE POLICY "Staff can update support tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (private.has_admin_permission('crm'))
  WITH CHECK (private.has_admin_permission('crm'));

CREATE POLICY "Staff can read support ticket messages"
  ON public.support_ticket_messages FOR SELECT TO authenticated
  USING (private.has_admin_permission('crm'));

CREATE POLICY "Staff can manage store coupons"
  ON public.store_coupons FOR ALL TO authenticated
  USING (private.has_admin_permission('products'))
  WITH CHECK (private.has_admin_permission('products'));

CREATE POLICY "Staff can read all store coupons"
  ON public.store_coupons FOR SELECT TO authenticated
  USING (private.has_admin_permission('products') OR private.has_admin_permission('settings'));

CREATE POLICY "Staff can insert delivery fees"
  ON public.store_delivery_fees FOR INSERT TO authenticated
  WITH CHECK (private.has_admin_permission('settings'));

CREATE POLICY "Staff can update delivery fees"
  ON public.store_delivery_fees FOR UPDATE TO authenticated
  USING (private.has_admin_permission('settings'))
  WITH CHECK (private.has_admin_permission('settings'));

CREATE POLICY "Staff can manage storefront config"
  ON public.storefront_config FOR ALL TO authenticated
  USING (private.has_admin_permission('settings'))
  WITH CHECK (private.has_admin_permission('settings'));

CREATE POLICY "Staff can manage storefront media"
  ON public.storefront_media FOR ALL TO authenticated
  USING (private.has_admin_permission('settings'))
  WITH CHECK (private.has_admin_permission('settings'));

CREATE POLICY "Staff can read storefront versions"
  ON public.storefront_versions FOR SELECT TO authenticated
  USING (private.has_admin_permission('settings'));

CREATE POLICY "Staff can read storefront media objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'storefront-media' AND private.has_admin_permission('settings'));

CREATE POLICY "Staff can upload storefront media objects"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'storefront-media' AND private.has_admin_permission('settings'));

CREATE POLICY "Staff can update storefront media objects"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'storefront-media' AND private.has_admin_permission('settings'))
  WITH CHECK (bucket_id = 'storefront-media' AND private.has_admin_permission('settings'));

CREATE POLICY "Staff can delete storefront media objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'storefront-media' AND private.has_admin_permission('settings'));
