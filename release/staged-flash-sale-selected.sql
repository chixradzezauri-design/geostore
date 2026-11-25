-- Release candidate only; deploy after live schema/ACL and owner MFA review.
-- New endpoint; never replaces the existing category endpoint or expiry worker.
CREATE OR REPLACE FUNCTION private.admin_apply_selected_flash_sale(p_discount_percent numeric,p_category text,p_duration_hours integer,p_product_ids text[])
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_count integer; v_started timestamptz:=now();
BEGIN
 IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid OR coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' THEN
  RAISE EXCEPTION 'Not authorized' USING ERRCODE='42501';
 END IF;
 IF p_discount_percent IS NULL OR p_discount_percent<=0 OR p_discount_percent>=100 OR p_discount_percent<>round(p_discount_percent,2)
 OR p_duration_hours IS NULL OR p_duration_hours NOT IN (1,3,6,12,24,48)
 OR coalesce(length(trim(p_category)),0) NOT BETWEEN 1 AND 200
 OR coalesce(cardinality(p_product_ids),0) NOT BETWEEN 1 AND 500
 OR array_ndims(p_product_ids) IS DISTINCT FROM 1
 OR EXISTS(SELECT 1 FROM unnest(p_product_ids) AS x(id) WHERE x.id IS NULL OR length(trim(x.id)) NOT BETWEEN 1 AND 200)
 OR (SELECT count(DISTINCT x.id) FROM unnest(p_product_ids) AS x(id))<>cardinality(p_product_ids) THEN
  RAISE EXCEPTION 'Invalid selected flash sale' USING ERRCODE='22023';
 END IF;
 -- Only the explicit IDs are locked and updated; category is an additional restriction.
 PERFORM p.id FROM public.products p WHERE p.id::text=ANY(p_product_ids) AND (trim(p_category)='ყველა' OR p.category=trim(p_category)) ORDER BY p.id FOR UPDATE;
 UPDATE public.products p SET
 old_price_gel=CASE WHEN p.old_price_gel>p.price_gel THEN p.old_price_gel ELSE p.price_gel END,
 price_gel=round((CASE WHEN p.old_price_gel>p.price_gel THEN p.old_price_gel ELSE p.price_gel END)*(1-p_discount_percent/100),2),
 flash_sale_started_at=v_started,flash_sale_ends_at=v_started+make_interval(hours=>p_duration_hours),flash_sale_percent=p_discount_percent
 WHERE p.id::text=ANY(p_product_ids)
 AND (trim(p_category)='ყველა' OR p.category=trim(p_category))
 AND coalesce(p.variants,'[]'::jsonb)='[]'::jsonb
 AND NOT EXISTS(SELECT 1 FROM public.flash_sale_items i WHERE i.product_id=p.id)
 AND round((CASE WHEN p.old_price_gel>p.price_gel THEN p.old_price_gel ELSE p.price_gel END)*(1-p_discount_percent/100),2)<(CASE WHEN p.old_price_gel>p.price_gel THEN p.old_price_gel ELSE p.price_gel END);
 GET DIAGNOSTICS v_count=ROW_COUNT;
 RETURN v_count;
END;
$fn$;
CREATE OR REPLACE FUNCTION public.admin_apply_selected_flash_sale(p_discount_percent numeric,p_category text,p_duration_hours integer,p_product_ids text[])
RETURNS integer LANGUAGE sql SECURITY INVOKER SET search_path='' AS $fn$
 SELECT private.admin_apply_selected_flash_sale(p_discount_percent,p_category,p_duration_hours,p_product_ids);
$fn$;
REVOKE ALL ON FUNCTION private.admin_apply_selected_flash_sale(numeric,text,integer,text[]) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.admin_apply_selected_flash_sale(numeric,text,integer,text[]) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION private.admin_apply_selected_flash_sale(numeric,text,integer,text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_apply_selected_flash_sale(numeric,text,integer,text[]) TO authenticated;
