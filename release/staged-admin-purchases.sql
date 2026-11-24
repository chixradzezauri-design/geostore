-- STAGED CANDIDATE: requires staged-admin-suppliers.sql first.
-- No live migration or historical cost rewrite. Base and exact variant stock (06C staged backend).
BEGIN;
CREATE TABLE public.admin_purchase_orders (
 id uuid PRIMARY KEY, supplier_id uuid NOT NULL REFERENCES public.admin_suppliers(id) ON DELETE RESTRICT,
 supplier_name text NOT NULL, status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','partial','received','cancelled')),
 revision bigint NOT NULL DEFAULT 1 CHECK(revision>0), created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.admin_purchase_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), purchase_id uuid NOT NULL REFERENCES public.admin_purchase_orders(id) ON DELETE RESTRICT,
 product_id text NOT NULL, product_name text NOT NULL, variant_id text, variant_name text, variant_type text, quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 1000000),
 received_quantity integer NOT NULL DEFAULT 0 CHECK(received_quantity BETWEEN 0 AND quantity),
 unit_cost numeric(12,2) NOT NULL CHECK(unit_cost BETWEEN 0 AND 1000000000), CHECK ((variant_id IS NULL AND variant_name IS NULL AND variant_type IS NULL) OR (variant_id IS NOT NULL AND length(variant_id) BETWEEN 1 AND 120 AND variant_name IS NOT NULL AND variant_type IS NOT NULL))
);
CREATE TABLE public.admin_purchase_receipts (
 id uuid PRIMARY KEY, purchase_id uuid NOT NULL REFERENCES public.admin_purchase_orders(id) ON DELETE RESTRICT,
 line_id uuid NOT NULL REFERENCES public.admin_purchase_lines(id) ON DELETE RESTRICT,
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 1000000),
 stock_before integer NOT NULL CHECK(stock_before>=0), stock_after integer NOT NULL CHECK(stock_after<=1000000 AND stock_after=stock_before+quantity),
 unit_cost numeric(12,2) NOT NULL CHECK(unit_cost BETWEEN 0 AND 1000000000),
 actor_id uuid NOT NULL, received_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX admin_purchase_line_identity_idx ON public.admin_purchase_lines(purchase_id,product_id,coalesce(variant_id,''));
CREATE INDEX admin_purchase_orders_supplier_idx ON public.admin_purchase_orders(supplier_id,created_at DESC);
CREATE INDEX admin_purchase_receipts_purchase_idx ON public.admin_purchase_receipts(purchase_id,received_at DESC);
CREATE INDEX admin_purchase_receipts_line_idx ON public.admin_purchase_receipts(line_id);
ALTER TABLE public.admin_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_purchase_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_purchase_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_purchase_orders,public.admin_purchase_lines,public.admin_purchase_receipts FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.admin_purchase_orders,public.admin_purchase_lines,public.admin_purchase_receipts TO authenticated;
CREATE POLICY purchase_orders_owner_read ON public.admin_purchase_orders FOR SELECT TO authenticated USING ((SELECT auth.uid())='1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid AND coalesce((SELECT auth.jwt())->'app_metadata'->>'role','')='admin');
CREATE POLICY purchase_lines_owner_read ON public.admin_purchase_lines FOR SELECT TO authenticated USING ((SELECT auth.uid())='1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid AND coalesce((SELECT auth.jwt())->'app_metadata'->>'role','')='admin');
CREATE POLICY purchase_receipts_owner_read ON public.admin_purchase_receipts FOR SELECT TO authenticated USING ((SELECT auth.uid())='1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid AND coalesce((SELECT auth.jwt())->'app_metadata'->>'role','')='admin');
CREATE FUNCTION private.require_purchase_owner() RETURNS uuid LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid OR coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' THEN
   RAISE EXCEPTION 'Owner required' USING ERRCODE='42501';
 END IF;
 RETURN auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION private.require_purchase_owner() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION private.reject_purchase_receipt_mutation() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'Purchase receipts are append-only' USING ERRCODE='55000'; END;
$$;
REVOKE ALL ON FUNCTION private.reject_purchase_receipt_mutation() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER purchase_receipt_immutable BEFORE UPDATE OR DELETE ON public.admin_purchase_receipts FOR EACH ROW EXECUTE FUNCTION private.reject_purchase_receipt_mutation();

-- Validate complete variant array before selecting inventory identity.
CREATE FUNCTION private.purchase_variant(p_variants jsonb,p_id text) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path='' AS $variant$
DECLARE v_item jsonb;
BEGIN
 IF p_id IS NULL OR length(p_id) NOT BETWEEN 1 AND 120 OR jsonb_typeof(p_variants) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid variant identity' USING ERRCODE='22023'; END IF;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_variants) e(item)
  WHERE jsonb_typeof(item) IS DISTINCT FROM 'object' OR jsonb_typeof(item->'id') IS DISTINCT FROM 'string'
   OR coalesce(trim(item->>'id'),'')='' OR length(item->>'id')>120
   OR CASE WHEN coalesce(item->>'stock','') ~ '^[0-9]{1,7}$' THEN (item->>'stock')::integer NOT BETWEEN 0 AND 1000000 ELSE true END)
 OR EXISTS (SELECT 1 FROM jsonb_array_elements(p_variants) e(item) GROUP BY item->>'id' HAVING count(*)>1) THEN
  RAISE EXCEPTION 'Invalid or duplicate catalog variant' USING ERRCODE='22023';
 END IF;
 SELECT item INTO v_item FROM jsonb_array_elements(p_variants) e(item) WHERE item->>'id'=p_id;
 IF NOT FOUND OR coalesce(trim(v_item->>'name'),'')='' OR coalesce(trim(v_item->>'variantType'),'')='' THEN RAISE EXCEPTION 'Variant unavailable' USING ERRCODE='22023'; END IF;
 RETURN v_item;
END;
$variant$;
REVOKE ALL ON FUNCTION private.purchase_variant(jsonb,text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.create_admin_purchase(p_id uuid,p_supplier uuid,p_lines jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 v_actor uuid:=private.require_purchase_owner();
 v_supplier public.admin_suppliers%ROWTYPE; v_product public.products%ROWTYPE; v_item jsonb;
 v_qty integer; v_cost numeric; v_variant_id text; v_variant jsonb; v_order public.admin_purchase_orders%ROWTYPE;
BEGIN
 IF p_id IS NULL OR p_supplier IS NULL OR p_lines IS NULL OR jsonb_typeof(p_lines)<>'array' THEN RAISE EXCEPTION 'Invalid purchase' USING ERRCODE='22023'; END IF;
 IF jsonb_array_length(p_lines) NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Invalid line count' USING ERRCODE='22023'; END IF;
 SELECT * INTO v_supplier FROM public.admin_suppliers WHERE id=p_supplier FOR SHARE;
 IF NOT FOUND OR NOT v_supplier.is_active THEN RAISE EXCEPTION 'Supplier unavailable' USING ERRCODE='22023'; END IF;
 INSERT INTO public.admin_purchase_orders(id,supplier_id,supplier_name,created_by) VALUES(p_id,p_supplier,v_supplier.name,v_actor) RETURNING * INTO v_order;
 FOR v_item IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
   IF jsonb_typeof(v_item)<>'object' OR coalesce(v_item->>'product_id','')='' OR coalesce(v_item->>'quantity','') !~ '^[0-9]{1,7}$' OR coalesce(v_item->>'unit_cost','') !~ '^[0-9]{1,10}(\.[0-9]{1,2})?$' THEN RAISE EXCEPTION 'Invalid purchase line' USING ERRCODE='22023'; END IF;
   v_qty:=(v_item->>'quantity')::integer; v_cost:=(v_item->>'unit_cost')::numeric;
   IF v_qty NOT BETWEEN 1 AND 1000000 OR v_cost NOT BETWEEN 0 AND 1000000000 THEN RAISE EXCEPTION 'Invalid purchase amount' USING ERRCODE='22023'; END IF;
   SELECT * INTO v_product FROM public.products WHERE id=v_item->>'product_id';
   IF NOT FOUND OR v_product.vendor IS DISTINCT FROM v_supplier.name THEN RAISE EXCEPTION 'Product or supplier mismatch' USING ERRCODE='22023'; END IF;
   v_variant_id:=v_item->>'variant_id'; v_variant:=NULL;
   IF v_variant_id IS NULL THEN
    IF coalesce(v_product.variants,'[]'::jsonb)<>'[]'::jsonb OR v_product.stock IS NULL THEN RAISE EXCEPTION 'Base inventory unavailable' USING ERRCODE='22023'; END IF;
   ELSE
    IF jsonb_typeof(v_item->'variant_id') IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'Invalid variant ID' USING ERRCODE='22023'; END IF;
    v_variant:=private.purchase_variant(v_product.variants,v_variant_id);
   END IF;
   INSERT INTO public.admin_purchase_lines(purchase_id,product_id,product_name,variant_id,variant_name,variant_type,quantity,unit_cost) VALUES(p_id,v_product.id,v_product.name,v_variant_id,v_variant->>'name',v_variant->>'variantType',v_qty,v_cost);
 END LOOP;
 RETURN to_jsonb(v_order);
END;
$$;
CREATE FUNCTION private.transition_admin_purchase(p_id uuid,p_revision bigint,p_action text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_actor uuid:=private.require_purchase_owner(); v_order public.admin_purchase_orders%ROWTYPE; v_status text;
BEGIN
 SELECT * INTO v_order FROM public.admin_purchase_orders WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR p_revision IS DISTINCT FROM v_order.revision THEN RAISE EXCEPTION 'Purchase revision conflict' USING ERRCODE='40001'; END IF;
 IF p_action='approve' AND v_order.status='draft' THEN
   PERFORM 1 FROM public.admin_suppliers WHERE id=v_order.supplier_id AND is_active FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Supplier unavailable' USING ERRCODE='22023'; END IF;
   v_status:='approved';
 ELSIF p_action='cancel' AND v_order.status IN ('draft','approved') THEN v_status:='cancelled';
 ELSE RAISE EXCEPTION 'Invalid purchase transition' USING ERRCODE='22023'; END IF;
 UPDATE public.admin_purchase_orders SET status=v_status,revision=revision+1,updated_at=clock_timestamp() WHERE id=p_id RETURNING * INTO v_order;
 RETURN to_jsonb(v_order);
END;
$$;
CREATE FUNCTION private.receive_admin_purchase(p_id uuid,p_line uuid,p_receipt uuid,p_revision bigint,p_quantity integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_actor uuid:=private.require_purchase_owner(); v_order public.admin_purchase_orders%ROWTYPE; v_line public.admin_purchase_lines%ROWTYPE;
 v_product public.products%ROWTYPE; v_receipt public.admin_purchase_receipts%ROWTYPE; v_after integer; v_before integer; v_variant jsonb; v_updated_variants jsonb; v_previous_variant_setting text; v_previous_reason text; v_previous_order text;
BEGIN
 IF p_receipt IS NULL OR p_quantity IS NULL OR p_quantity NOT BETWEEN 1 AND 1000000 THEN RAISE EXCEPTION 'Invalid receipt' USING ERRCODE='22023'; END IF;
 SELECT * INTO v_order FROM public.admin_purchase_orders WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Purchase missing' USING ERRCODE='22023'; END IF;
 -- Retry of exactly the same receipt returns its original snapshot, even
 -- after the order advances. Reusing an ID for different data is rejected.
 SELECT * INTO v_receipt FROM public.admin_purchase_receipts WHERE id=p_receipt;
 IF FOUND THEN
   IF v_receipt.purchase_id IS DISTINCT FROM p_id OR v_receipt.line_id IS DISTINCT FROM p_line OR v_receipt.quantity IS DISTINCT FROM p_quantity THEN RAISE EXCEPTION 'Receipt identity conflict' USING ERRCODE='22023'; END IF;
   RETURN to_jsonb(v_receipt)||jsonb_build_object('idempotent_replay',true);
 END IF;
 IF p_revision IS DISTINCT FROM v_order.revision THEN RAISE EXCEPTION 'Purchase revision conflict' USING ERRCODE='40001'; END IF;
 IF v_order.status NOT IN ('approved','partial') THEN RAISE EXCEPTION 'Purchase not receivable' USING ERRCODE='22023'; END IF;
 SELECT * INTO v_line FROM public.admin_purchase_lines WHERE id=p_line AND purchase_id=p_id FOR UPDATE;
 IF NOT FOUND OR p_quantity>v_line.quantity-v_line.received_quantity THEN RAISE EXCEPTION 'Receipt exceeds outstanding quantity' USING ERRCODE='22023'; END IF;
 SELECT * INTO v_product FROM public.products WHERE id=v_line.product_id FOR UPDATE;
 IF NOT FOUND OR v_product.vendor IS DISTINCT FROM v_order.supplier_name THEN RAISE EXCEPTION 'Product inventory changed' USING ERRCODE='22023'; END IF;
 IF v_line.variant_id IS NULL THEN
  IF coalesce(v_product.variants,'[]'::jsonb)<>'[]'::jsonb THEN RAISE EXCEPTION 'Inventory model changed' USING ERRCODE='22023'; END IF;
  v_before:=v_product.stock;
 ELSE
  v_variant:=private.purchase_variant(v_product.variants,v_line.variant_id);
  IF v_variant->>'name' IS DISTINCT FROM v_line.variant_name OR v_variant->>'variantType' IS DISTINCT FROM v_line.variant_type THEN RAISE EXCEPTION 'Variant identity changed' USING ERRCODE='22023'; END IF;
  v_before:=(v_variant->>'stock')::integer;
 END IF;
 IF v_before IS NULL OR v_before<0 OR v_before>1000000-p_quantity THEN RAISE EXCEPTION 'Stock limit exceeded' USING ERRCODE='22023'; END IF;
 -- Exact receipt identity and stock before/after are recorded in immutable
 -- purchase history. Existing inventory trigger still records manual adjustment.
 -- Do not change purchase_cost, price, other variant metadata, customer orders or old costs.
 v_previous_reason:=current_setting('geostore.inventory_reason',true);
 v_previous_order:=current_setting('geostore.inventory_order_id',true);
 PERFORM set_config('geostore.inventory_reason','manual_adjustment',true);
 PERFORM set_config('geostore.inventory_order_id','',true);
 IF v_line.variant_id IS NULL THEN
  UPDATE public.products SET stock=stock+p_quantity WHERE id=v_line.product_id RETURNING stock INTO v_after;
 ELSE
  v_previous_variant_setting:=current_setting('geostore.variant_stock_adjustment',true);
  PERFORM set_config('geostore.variant_stock_adjustment','on',true);
  UPDATE public.products SET variants=(
   SELECT jsonb_agg(CASE WHEN e.item->>'id'=v_line.variant_id THEN jsonb_set(e.item,'{stock}',to_jsonb(v_before+p_quantity),true) ELSE e.item END ORDER BY e.ordinality)
   FROM jsonb_array_elements(v_product.variants) WITH ORDINALITY e(item,ordinality)
  ) WHERE id=v_line.product_id RETURNING variants INTO v_updated_variants;
  v_after:=(private.purchase_variant(v_updated_variants,v_line.variant_id)->>'stock')::integer;
  PERFORM set_config('geostore.variant_stock_adjustment',coalesce(v_previous_variant_setting,''),true);
 END IF;
 IF v_after IS DISTINCT FROM v_before+p_quantity THEN RAISE EXCEPTION 'Stock acknowledgement mismatch'; END IF;
 PERFORM set_config('geostore.inventory_reason',coalesce(v_previous_reason,''),true);
 PERFORM set_config('geostore.inventory_order_id',coalesce(v_previous_order,''),true);
 UPDATE public.admin_purchase_lines SET received_quantity=received_quantity+p_quantity WHERE id=p_line;
 INSERT INTO public.admin_purchase_receipts(id,purchase_id,line_id,quantity,stock_before,stock_after,unit_cost,actor_id) VALUES(p_receipt,p_id,p_line,p_quantity,v_before,v_after,v_line.unit_cost,v_actor) RETURNING * INTO v_receipt;
 UPDATE public.admin_purchase_orders SET status=CASE WHEN EXISTS(SELECT 1 FROM public.admin_purchase_lines WHERE purchase_id=p_id AND received_quantity<quantity) THEN 'partial' ELSE 'received' END,revision=revision+1,updated_at=clock_timestamp() WHERE id=p_id;
 RETURN to_jsonb(v_receipt)||jsonb_build_object('idempotent_replay',false);
END;
$$;
REVOKE ALL ON FUNCTION private.create_admin_purchase(uuid,uuid,jsonb),private.transition_admin_purchase(uuid,bigint,text),private.receive_admin_purchase(uuid,uuid,uuid,bigint,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.create_admin_purchase(uuid,uuid,jsonb),private.transition_admin_purchase(uuid,bigint,text),private.receive_admin_purchase(uuid,uuid,uuid,bigint,integer) TO authenticated;
CREATE FUNCTION public.admin_create_purchase(p_id uuid,p_supplier uuid,p_lines jsonb) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.create_admin_purchase(p_id,p_supplier,p_lines); $$;
CREATE FUNCTION public.admin_transition_purchase(p_id uuid,p_revision bigint,p_action text) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.transition_admin_purchase(p_id,p_revision,p_action); $$;
CREATE FUNCTION public.admin_receive_purchase(p_id uuid,p_line uuid,p_receipt uuid,p_revision bigint,p_quantity integer) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.receive_admin_purchase(p_id,p_line,p_receipt,p_revision,p_quantity); $$;
REVOKE ALL ON FUNCTION public.admin_create_purchase(uuid,uuid,jsonb),public.admin_transition_purchase(uuid,bigint,text),public.admin_receive_purchase(uuid,uuid,uuid,bigint,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_purchase(uuid,uuid,jsonb),public.admin_transition_purchase(uuid,bigint,text),public.admin_receive_purchase(uuid,uuid,uuid,bigint,integer) TO authenticated;
COMMIT;
