-- Preserve products referenced by either current or legacy order item snapshots.
-- This only updates the deletion guard; it does not modify existing order data.

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
  IF COALESCE(v_jwt -> 'app_metadata' ->> 'role', '') <> 'admin'
     OR auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid THEN
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
$function$;
