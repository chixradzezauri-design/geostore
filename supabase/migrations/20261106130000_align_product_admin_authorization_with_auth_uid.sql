-- Keep product administration authorization consistent with App.jsx and the
-- other privileged product RPCs: trusted admin role plus the immutable primary-admin UID.
-- This removes the fragile email comparison without changing product data or pricing.

CREATE OR REPLACE FUNCTION private.admin_list_products()
RETURNS SETOF public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_jwt jsonb := (SELECT auth.jwt());
BEGIN
  IF COALESCE(v_jwt -> 'app_metadata' ->> 'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
    RAISE EXCEPTION 'Not authorized to read admin product data'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT *
    FROM public.products
    ORDER BY created_at DESC;
END;
$function$;

REVOKE ALL ON FUNCTION private.admin_list_products() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.admin_list_products() TO authenticated, service_role;

DROP POLICY IF EXISTS "Admin can insert products" ON public.products;
CREATE POLICY "Admin can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
  AND COALESCE(((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
);

DROP POLICY IF EXISTS "Admin can update products" ON public.products;
CREATE POLICY "Admin can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (
  (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
  AND COALESCE(((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
)
WITH CHECK (
  (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
  AND COALESCE(((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
);

DROP POLICY IF EXISTS "Admin can delete products" ON public.products;
CREATE POLICY "Admin can delete products"
ON public.products
FOR DELETE
TO authenticated
USING (
  (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
  AND COALESCE(((SELECT auth.jwt()) -> 'app_metadata' ->> 'role'), '') = 'admin'
);

-- Reduce client-role table privileges that bypass row-level policies or are
-- not needed by the browser. TRUNCATE is not protected by RLS.
DO $$
DECLARE
  v_table record;
BEGIN
  FOR v_table IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE %I.%I FROM anon, authenticated',
      v_table.schemaname,
      v_table.tablename
    );
  END LOOP;
END;
$$;

-- Anonymous users may submit support tickets, but must not read, edit, or
-- delete ticket records. Keep published storefront reads, not anonymous writes.
REVOKE ALL PRIVILEGES ON TABLE public.expenses FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.messages FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.storefront_versions FROM anon;
REVOKE SELECT, UPDATE, DELETE ON TABLE public.support_tickets FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.storefront_config FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.storefront_media FROM anon;
REVOKE DELETE ON TABLE public.orders FROM anon;

-- The legacy messages table has no active browser write path. Preserve existing
-- records and admin read/update/delete access, but remove anonymous/client inserts.
DROP POLICY IF EXISTS "Visitors can send chat messages" ON public.messages;
REVOKE INSERT ON TABLE public.messages FROM anon, authenticated;

-- Public support submission must not let a visitor forge an admin reply or
-- choose an arbitrary ticket status. The active form relies on the DB default
-- status ("ღია") and sends only the customer-provided fields.
DROP POLICY IF EXISTS "Visitors can submit support tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Visitors can submit validated support tickets" ON public.support_tickets;
CREATE POLICY "Visitors can submit validated support tickets"
ON public.support_tickets
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(btrim(id)) BETWEEN 1 AND 100
  AND char_length(btrim(customer_name)) BETWEEN 1 AND 100
  AND char_length(btrim(message)) BETWEEN 1 AND 5000
  AND char_length(coalesce(subject, '')) <= 160
  AND char_length(coalesce(email, '')) <= 254
  AND status = 'ღია'
  AND reply IS NULL
);

-- Prevent a privileged status RPC call with a NULL status from bypassing the
-- allowed-status check. Existing status transitions and stock restoration
-- behavior are otherwise unchanged.
CREATE OR REPLACE FUNCTION private.admin_update_order_status(p_order_id text, p_new_status text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_updated integer;
begin
  if coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'admin'
     or auth.uid() is distinct from '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid then
    raise exception 'ადმინისტრატორის უფლებები არ დადასტურდა.';
  end if;
  if p_new_status is null
     or p_new_status not in ('ახალი', 'მუშავდება', 'გაგზავნილი', 'დასრულებული', 'გაუქმებული') then
    raise exception 'შეკვეთის სტატუსი არასწორია.';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'შეკვეთა ვერ მოიძებნა.'; end if;
  if v_order.status = 'გაუქმებული' and p_new_status <> 'გაუქმებული' then
    raise exception 'გაუქმებული შეკვეთის ხელახლა გააქტიურება დაუშვებელია.';
  end if;

  if p_new_status = 'გაუქმებული'
     and v_order.status <> 'გაუქმებული'
     and v_order.stock_deducted_at is not null
     and v_order.stock_restored_at is null then
    for v_item in
      select item->>'id' as product_id,
             sum((item->>'quantity')::integer)::integer as quantity
        from jsonb_array_elements(coalesce(v_order.items, '[]'::jsonb)) as e(item)
       group by item->>'id'
       order by item->>'id'
    loop
      update public.products
         set stock = coalesce(stock, 0) + v_item.quantity
       where id = v_item.product_id;
      get diagnostics v_updated = row_count;
      if v_updated <> 1 then
        raise exception 'მარაგის აღდგენა ვერ მოხერხდა პროდუქტისთვის: %', v_item.product_id;
      end if;
    end loop;
    update public.orders set status = p_new_status, stock_restored_at = now()
     where id = p_order_id;
  else
    update public.orders set status = p_new_status where id = p_order_id;
  end if;
  return jsonb_build_object('order_id', p_order_id, 'status', p_new_status);
end;
$function$;

-- All existing orders have a valid non-empty status. Make that invariant
-- explicit so direct writes cannot leave orders in an undefined state.
ALTER TABLE public.orders
  ALTER COLUMN status SET DEFAULT 'ახალი';
ALTER TABLE public.orders
  ALTER COLUMN status SET NOT NULL;
