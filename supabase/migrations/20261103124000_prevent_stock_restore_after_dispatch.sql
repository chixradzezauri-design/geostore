-- GEOSTORE: never put dispatched or delivered stock back into sellable inventory via cancellation.
-- A return workflow must be completed separately before stock can be added back.
CREATE OR REPLACE FUNCTION private.prevent_cancellation_after_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF OLD.status IN ('გაგზავნილი', 'დასრულებული')
     AND NEW.status = 'გაუქმებული' THEN
    RAISE EXCEPTION 'გაგზავნილი ან ჩაბარებული შეკვეთის გაუქმება დაბრუნების პროცესის გარეშე დაუშვებელია.';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS prevent_cancellation_after_dispatch ON public.orders;
CREATE TRIGGER prevent_cancellation_after_dispatch
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION private.prevent_cancellation_after_dispatch();
