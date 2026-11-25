-- Release candidate only. Apply after isolated database and live schema review.
-- Existing immediate-discount RPC and existing expiry job remain unchanged.
CREATE TABLE IF NOT EXISTS private.flash_sale_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (length(category) BETWEEN 1 AND 200),
  discount_percent numeric(5,2) NOT NULL CHECK (discount_percent > 0 AND discount_percent < 100),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL CHECK (ends_at > starts_at),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','started','cancelled','skipped')),
  updated_count integer NOT NULL DEFAULT 0,
  outcome text,
  processed_at timestamptz
);
ALTER TABLE private.flash_sale_schedule ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.flash_sale_schedule FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS flash_sale_schedule_due_idx ON private.flash_sale_schedule(starts_at,id) WHERE status='pending';

CREATE OR REPLACE FUNCTION private.admin_schedule_flash_sale(p_category text,p_discount_percent numeric,p_duration_hours integer,p_starts_at timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_row private.flash_sale_schedule%ROWTYPE;
BEGIN
  IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid OR coalesce(auth.jwt()->'app_metadata'->>'role','') <> 'admin' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501';
  END IF;
  IF p_discount_percent IS NULL OR p_discount_percent <= 0 OR p_discount_percent >= 100 OR p_discount_percent <> round(p_discount_percent,2)
     OR p_duration_hours IS NULL OR p_duration_hours NOT IN (1,3,6,12,24,48)
     OR p_starts_at IS NULL OR p_starts_at < now()+interval '1 minute' OR p_starts_at > now()+interval '180 days'
     OR coalesce(length(trim(p_category)),0) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Invalid flash-sale schedule' USING ERRCODE='22023';
  END IF;
  PERFORM pg_advisory_xact_lock(20261125,701);
  IF EXISTS (SELECT 1 FROM private.flash_sale_schedule s WHERE s.status='pending'
      AND s.starts_at < p_starts_at+make_interval(hours=>p_duration_hours) AND s.ends_at > p_starts_at
      AND (s.category=trim(p_category) OR s.category='ყველა' OR trim(p_category)='ყველა')) THEN
    RAISE EXCEPTION 'An overlapping schedule already exists' USING ERRCODE='23505';
  END IF;
  INSERT INTO private.flash_sale_schedule(category,discount_percent,starts_at,ends_at,created_by)
    VALUES(trim(p_category),p_discount_percent,p_starts_at,p_starts_at+make_interval(hours=>p_duration_hours),auth.uid())
    RETURNING * INTO v_row;
  RETURN to_jsonb(v_row)-'created_by';
END;
$fn$;

CREATE OR REPLACE FUNCTION private.admin_list_flash_sale_schedule()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
  IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid OR coalesce(auth.jwt()->'app_metadata'->>'role','') <> 'admin' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501';
  END IF;
  RETURN coalesce((SELECT jsonb_agg(to_jsonb(s)-'created_by' ORDER BY s.starts_at DESC,s.id) FROM
    (SELECT * FROM private.flash_sale_schedule ORDER BY (status='pending') DESC, starts_at DESC,id LIMIT 100) s),'[]'::jsonb);
END;
$fn$;

CREATE OR REPLACE FUNCTION private.admin_cancel_flash_sale_schedule(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
  IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid OR coalesce(auth.jwt()->'app_metadata'->>'role','') <> 'admin' THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501';
  END IF;
  UPDATE private.flash_sale_schedule SET status='cancelled',processed_at=clock_timestamp(),outcome='cancelled_by_admin'
    WHERE id=p_id AND status='pending';
  RETURN FOUND;
END;
$fn$;

CREATE OR REPLACE FUNCTION private.run_due_flash_sale_schedule()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE s private.flash_sale_schedule%ROWTYPE; v_count integer; v_processed integer:=0; v_now timestamptz:=clock_timestamp();
BEGIN
  IF NOT pg_try_advisory_xact_lock(20261125,701) THEN RETURN 0; END IF;
  FOR s IN SELECT * FROM private.flash_sale_schedule WHERE status='pending' AND starts_at<=v_now
    ORDER BY starts_at,id LIMIT 20 FOR UPDATE SKIP LOCKED
  LOOP
    v_count:=0;
    IF s.ends_at<=v_now THEN
      UPDATE private.flash_sale_schedule SET status='skipped',outcome='missed_window',processed_at=v_now WHERE id=s.id;
    ELSE
      -- Lock all existing eligible category rows; concurrent manual updates serialize.
      PERFORM p.id FROM public.products p WHERE (s.category='ყველა' OR p.category=s.category)
        ORDER BY p.id FOR UPDATE;
      -- Do not replace an existing promotion or change an already marked-down item.
      -- Product-level expiry remains the sole price restoration path.
      UPDATE public.products p SET old_price_gel=p.price_gel,
        price_gel=round(p.price_gel*(1-s.discount_percent/100),2),
        flash_sale_started_at=s.starts_at,flash_sale_ends_at=s.ends_at,flash_sale_percent=s.discount_percent
        WHERE (s.category='ყველა' OR p.category=s.category)
          AND coalesce(p.variants,'[]'::jsonb)='[]'::jsonb
          AND p.flash_sale_ends_at IS NULL
          AND (p.old_price_gel IS NULL OR p.old_price_gel<=p.price_gel)
          AND p.price_gel>0 AND round(p.price_gel*(1-s.discount_percent/100),2)<p.price_gel
          AND NOT EXISTS (SELECT 1 FROM public.flash_sale_items i WHERE i.product_id=p.id);
      GET DIAGNOSTICS v_count=ROW_COUNT;
      UPDATE private.flash_sale_schedule SET status=CASE WHEN v_count>0 THEN 'started' ELSE 'skipped' END,
        updated_count=v_count, outcome=CASE WHEN v_count>0 THEN 'applied' ELSE 'no_eligible_products' END,processed_at=v_now
        WHERE id=s.id;
    END IF;
    v_processed:=v_processed+1;
  END LOOP;
  RETURN v_processed;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.admin_schedule_flash_sale(p_category text,p_discount_percent numeric,p_duration_hours integer,p_starts_at timestamptz)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$
 SELECT private.admin_schedule_flash_sale(p_category,p_discount_percent,p_duration_hours,p_starts_at);
$fn$;
CREATE OR REPLACE FUNCTION public.admin_list_flash_sale_schedule()
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$
 SELECT private.admin_list_flash_sale_schedule();
$fn$;
CREATE OR REPLACE FUNCTION public.admin_cancel_flash_sale_schedule(p_id uuid)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$
 SELECT private.admin_cancel_flash_sale_schedule(p_id);
$fn$;
REVOKE ALL ON FUNCTION private.run_due_flash_sale_schedule() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION private.admin_schedule_flash_sale(text,numeric,integer,timestamptz) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION private.admin_schedule_flash_sale(text,numeric,integer,timestamptz) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_schedule_flash_sale(text,numeric,integer,timestamptz) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_schedule_flash_sale(text,numeric,integer,timestamptz) TO authenticated;
REVOKE ALL ON FUNCTION private.admin_list_flash_sale_schedule() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION private.admin_list_flash_sale_schedule() TO authenticated;
REVOKE ALL ON FUNCTION public.admin_list_flash_sale_schedule() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_flash_sale_schedule() TO authenticated;
REVOKE ALL ON FUNCTION private.admin_cancel_flash_sale_schedule(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION private.admin_cancel_flash_sale_schedule(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_cancel_flash_sale_schedule(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_cancel_flash_sale_schedule(uuid) TO authenticated;
-- Scheduling is an explicit separate cutover, after database contracts pass.
