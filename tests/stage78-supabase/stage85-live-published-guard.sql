-- Stage85: fixture-only snapshot of read-only effective Production function,
-- PostgreSQL catalog as of 2026-11-23. No user/order/product data read.
-- The source was NOT located in the tracked historical migration files.
-- Never apply this file to Production or treat it as migration history repair.
CREATE OR REPLACE FUNCTION private.reject_unpublished_products_in_new_orders()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(NEW.items) = 'array' THEN NEW.items ELSE '[]'::jsonb END
    ) AS item
    JOIN public.products AS product
      ON product.id = item.value ->> 'id'
    WHERE product.is_published = false
  ) THEN
    RAISE EXCEPTION 'ეს პროდუქტი ამჟამად გაყიდვაში არ არის.'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.reject_unpublished_products_in_new_orders() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER reject_unpublished_products_in_new_orders BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION private.reject_unpublished_products_in_new_orders();
