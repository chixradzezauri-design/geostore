-- Require a valid contact email for guest checkout at the database boundary.
-- Authenticated orders may omit customer_email because the account email is
-- already bound to the authenticated session and stored separately.

CREATE OR REPLACE FUNCTION private.require_valid_guest_checkout_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $function$
DECLARE
  v_user_email text := lower(trim(coalesce(NEW.user_email, 'guest')));
  v_customer_email text := lower(trim(coalesce(NEW.customer_email, '')));
BEGIN
  IF v_user_email = 'guest' AND (
    v_customer_email = ''
    OR length(v_customer_email) > 254
    OR v_customer_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ) THEN
    RAISE EXCEPTION 'სტუმრის შეკვეთისთვის მიუთითეთ სწორი ელფოსტა.'
      USING ERRCODE = '22023';
  END IF;

  IF v_customer_email <> '' AND (
    length(v_customer_email) > 254
    OR v_customer_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ) THEN
    RAISE EXCEPTION 'ელფოსტის მისამართი არასწორია.'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.require_valid_guest_checkout_email() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_require_valid_guest_checkout_email ON public.orders;
CREATE TRIGGER orders_require_valid_guest_checkout_email
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION private.require_valid_guest_checkout_email();
