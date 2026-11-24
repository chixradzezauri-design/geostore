-- STAGED CANDIDATE: requires staged-admin-suppliers.sql first.
-- No live migration or historical cost rewrite. Base stock only in block 06A.
BEGIN;
CREATE TABLE public.admin_purchase_orders (
 id uuid PRIMARY KEY, supplier_id uuid NOT NULL REFERENCES public.admin_suppliers(id) ON DELETE RESTRICT,
 supplier_name text NOT NULL, status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','partial','received','cancelled')),
 revision bigint NOT NULL DEFAULT 1 CHECK(revision>0), created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.admin_purchase_lines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), purchase_id uuid NOT NULL REFERENCES public.admin_purchase_orders(id) ON DELETE RESTRICT,
 product_id text NOT NULL, product_name text NOT NULL, quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 1000000),
 received_quantity integer NOT NULL DEFAULT 0 CHECK(received_quantity BETWEEN 0 AND quantity),
 unit_cost numeric(12,2) NOT NULL CHECK(unit_cost BETWEEN 0 AND 1000000000), UNIQUE(purchase_id,product_id)
);
CREATE TABLE public.admin_purchase_receipts (
 id uuid PRIMARY KEY, purchase_id uuid NOT NULL REFERENCES public.admin_purchase_orders(id) ON DELETE RESTRICT,
 line_id uuid NOT NULL REFERENCES public.admin_purchase_lines(id) ON DELETE RESTRICT,
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 1000000),
 stock_before integer NOT NULL CHECK(stock_before>=0), stock_after integer NOT NULL CHECK(stock_after<=1000000 AND stock_after=stock_before+quantity),
 unit_cost numeric(12,2) NOT NULL CHECK(unit_cost BETWEEN 0 AND 1000000000),
 actor_id uuid NOT NULL, received_at timestamptz NOT NULL DEFAULT now()
);
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

CREATE FUNCTION private.create_admin_purchase(p_id uuid,p_supplier uuid,p_lines jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 v_actor uuid:=private.require_purchase_owner();
 v_supplier public.admin_suppliers%ROWTYPE; v_product public.products%ROWTYPE; v_item jsonb;
 v_qty integer; v_cost numeric; v_order public.admin_purchase_orders%ROWTYPE;
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
   IF NOT FOUND OR v_product.vendor IS DISTINCT FROM v_supplier.name OR coalesce(v_product.variants,'[]'::jsonb)<>'[]'::jsonb OR v_product.stock IS NULL THEN RAISE EXCEPTION 'Base product or supplier mismatch' USING ERRCODE='22023'; END IF;
   INSERT INTO public.admin_purchase_lines(purchase_id,product_id,product_name,quantity,unit_cost) VALUES(p_id,v_product.id,v_product.name,v_qty,v_cost);
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
 v_product public.products%ROWTYPE; v_receipt public.admin_purchase_receipts%ROWTYPE; v_after integer; v_previous_reason text; v_previous_order text;
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
 IF NOT FOUND OR v_product.vendor IS DISTINCT FROM v_order.supplier_name OR coalesce(v_product.variants,'[]'::jsonb)<>'[]'::jsonb OR v_product.stock IS NULL OR v_product.stock<0 OR v_product.stock>1000000-p_quantity THEN RAISE EXCEPTION 'Product inventory changed or exceeds limit' USING ERRCODE='22023'; END IF;
 -- Exact receipt identity and stock before/after are recorded in immutable
 -- purchase history. Existing inventory trigger still records manual adjustment.
 -- Do not change purchase_cost, price, variants, customer orders or old costs.
 v_previous_reason:=current_setting('geostore.inventory_reason',true);
 v_previous_order:=current_setting('geostore.inventory_order_id',true);
 PERFORM set_config('geostore.inventory_reason','manual_adjustment',true);
 PERFORM set_config('geostore.inventory_order_id','',true);
 UPDATE public.products SET stock=stock+p_quantity WHERE id=v_line.product_id RETURNING stock INTO v_after;
 IF v_after IS DISTINCT FROM v_product.stock+p_quantity THEN RAISE EXCEPTION 'Stock acknowledgement mismatch'; END IF;
 PERFORM set_config('geostore.inventory_reason',coalesce(v_previous_reason,''),true);
 PERFORM set_config('geostore.inventory_order_id',coalesce(v_previous_order,''),true);
 UPDATE public.admin_purchase_lines SET received_quantity=received_quantity+p_quantity WHERE id=p_line;
 INSERT INTO public.admin_purchase_receipts(id,purchase_id,line_id,quantity,stock_before,stock_after,unit_cost,actor_id) VALUES(p_receipt,p_id,p_line,p_quantity,v_product.stock,v_after,v_line.unit_cost,v_actor) RETURNING * INTO v_receipt;
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
