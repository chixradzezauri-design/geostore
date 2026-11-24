-- PREPARED RELEASE SQL. Not authorization to apply. Transaction owned by migration runner.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '60s';
-- Verified staged source: release/staged-admin-suppliers.sql (bb3104c61d84ddd74e42a7245c0475783ac8295d)
CREATE TABLE public.admin_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (name = btrim(name) AND char_length(name) BETWEEN 1 AND 100),
  commission numeric(5,2) NOT NULL DEFAULT 0 CHECK (commission BETWEEN 0 AND 100),
  is_active boolean NOT NULL DEFAULT true,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX admin_suppliers_normalized_name_uidx ON public.admin_suppliers (lower(name));
ALTER TABLE public.admin_suppliers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_suppliers FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.admin_suppliers TO authenticated;
GRANT INSERT (name, commission, is_active) ON public.admin_suppliers TO authenticated;
GRANT UPDATE (commission, is_active) ON public.admin_suppliers TO authenticated;
-- Exact owner rule matches the inspected live has_staff_permission implementation.
-- Existing staff roles do not include a supplier permission; do not widen them.
CREATE POLICY admin_suppliers_owner_select ON public.admin_suppliers
  FOR SELECT TO authenticated USING (
    (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
    AND coalesce((SELECT auth.jwt())->'app_metadata'->>'role','') = 'admin'
  );
CREATE POLICY admin_suppliers_owner_insert ON public.admin_suppliers
  FOR INSERT TO authenticated WITH CHECK (
    (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
    AND coalesce((SELECT auth.jwt())->'app_metadata'->>'role','') = 'admin'
  );
CREATE POLICY admin_suppliers_owner_update ON public.admin_suppliers
  FOR UPDATE TO authenticated USING (
    (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
    AND coalesce((SELECT auth.jwt())->'app_metadata'->>'role','') = 'admin'
  ) WITH CHECK (
    (SELECT auth.uid()) = '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
    AND coalesce((SELECT auth.jwt())->'app_metadata'->>'role','') = 'admin'
  );
-- Only mutable fields can be changed via API grants. Names/IDs are immutable,
-- since existing product and order snapshots link by supplier name.
CREATE FUNCTION private.bump_admin_supplier_revision() RETURNS trigger
  LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  NEW.revision := OLD.revision + 1;
  NEW.updated_at := pg_catalog.clock_timestamp();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.bump_admin_supplier_revision() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER admin_supplier_revision BEFORE UPDATE ON public.admin_suppliers
  FOR EACH ROW EXECUTE FUNCTION private.bump_admin_supplier_revision();
-- No DELETE grant/policy. Archive instead so historical relationships survive.

-- Verified staged source: release/staged-admin-purchases.sql (7aa7c9b526a2b879dd4f284e92b1e98e0180f370)
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
 IF NOT FOUND OR p_revision IS DISTINCT FROM v_order.revision THEN RAISE EXCEPTION 'Purchase revision conflict' USING ERRCODE='PT409'; END IF;
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
 IF p_revision IS DISTINCT FROM v_order.revision THEN RAISE EXCEPTION 'Purchase revision conflict' USING ERRCODE='PT409'; END IF;
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

-- Verified staged source: release/staged-admin-supplier-payments.sql (d8724b5b2a7fed9a7df481376afc525a72f4b574)
CREATE TABLE public.admin_purchase_payments (
 id uuid PRIMARY KEY,
 purchase_id uuid NOT NULL REFERENCES public.admin_purchase_orders(id) ON DELETE RESTRICT,
 amount_tetri numeric(20,0) NOT NULL CHECK(amount_tetri BETWEEN 1 AND 5000000000000000000),
 method text NOT NULL CHECK(method IN ('bank_transfer','cash','other')),
 reference text NOT NULL CHECK(length(reference) BETWEEN 1 AND 120 AND reference=btrim(reference)),
 actor_id uuid NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 recorded_revision bigint NOT NULL CHECK(recorded_revision>1)
);
CREATE UNIQUE INDEX purchase_payment_reference_idx ON public.admin_purchase_payments(purchase_id,lower(reference));
CREATE INDEX purchase_payment_history_idx ON public.admin_purchase_payments(purchase_id,recorded_at DESC,id DESC);
ALTER TABLE public.admin_purchase_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_purchase_payments FROM PUBLIC,anon,authenticated;
-- No direct table grants; owner-checked read and write RPCs only.
CREATE FUNCTION private.reject_purchase_payment_mutation() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $payment$
BEGIN
 RAISE EXCEPTION 'Purchase payment history is append-only' USING ERRCODE='55000';
END;
$payment$;
REVOKE ALL ON FUNCTION private.reject_purchase_payment_mutation() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER purchase_payment_immutable BEFORE UPDATE OR DELETE ON public.admin_purchase_payments FOR EACH ROW EXECUTE FUNCTION private.reject_purchase_payment_mutation();

-- A correction invalidates one erroneous recorded payment in full; it does not issue a refund.
CREATE TABLE public.admin_purchase_payment_corrections (
 id uuid PRIMARY KEY,
 payment_id uuid NOT NULL UNIQUE REFERENCES public.admin_purchase_payments(id) ON DELETE RESTRICT,
 reason text NOT NULL CHECK(length(reason) BETWEEN 5 AND 300 AND reason=btrim(reason)),
 actor_id uuid NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 recorded_revision bigint NOT NULL CHECK(recorded_revision>1)
);
ALTER TABLE public.admin_purchase_payment_corrections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_purchase_payment_corrections FROM PUBLIC,anon,authenticated;
CREATE TRIGGER purchase_payment_correction_immutable BEFORE UPDATE OR DELETE ON public.admin_purchase_payment_corrections FOR EACH ROW EXECUTE FUNCTION private.reject_purchase_payment_mutation();

-- Return decimal strings, not JSON numeric values, so every tetri survives JS parsing.
CREATE FUNCTION private.purchase_payment_json(p public.admin_purchase_payments) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $payment$
 SELECT jsonb_build_object('id',p.id,'purchase_id',p.purchase_id,'amount_tetri',p.amount_tetri::text,
 'method',p.method,'reference',p.reference,'recorded_at',p.recorded_at,'recorded_revision',p.recorded_revision::text);
$payment$;
REVOKE ALL ON FUNCTION private.purchase_payment_json(public.admin_purchase_payments) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.record_admin_purchase_payment(p_id uuid,p_payment uuid,p_revision bigint,p_amount_tetri text,p_method text,p_reference text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $payment$
DECLARE
 v_actor uuid:=private.require_purchase_owner();
 v_order public.admin_purchase_orders%ROWTYPE;
 v_payment public.admin_purchase_payments%ROWTYPE;
 v_amount numeric; v_received numeric; v_paid numeric;
BEGIN
 IF p_id IS NULL OR p_payment IS NULL OR p_revision IS NULL OR p_revision<1
  OR coalesce(p_amount_tetri,'') !~ '^[1-9][0-9]{0,18}$'
  OR p_method IS NULL OR p_method NOT IN ('bank_transfer','cash','other')
  OR p_reference IS NULL OR length(p_reference) NOT BETWEEN 1 AND 120 OR p_reference<>btrim(p_reference)
  OR p_reference ~ '[[:cntrl:]]' THEN
  RAISE EXCEPTION 'Invalid payment record' USING ERRCODE='22023';
 END IF;
 v_amount:=p_amount_tetri::numeric;
 IF v_amount>5000000000000000000 THEN RAISE EXCEPTION 'Payment amount exceeds limit' USING ERRCODE='22023'; END IF;
 -- Serialize payments with receipts and other purchase mutations using the same order lock.
 SELECT * INTO v_order FROM public.admin_purchase_orders WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Purchase missing' USING ERRCODE='22023'; END IF;
 SELECT * INTO v_payment FROM public.admin_purchase_payments WHERE id=p_payment;
 IF FOUND THEN
  IF v_payment.purchase_id IS DISTINCT FROM p_id OR v_payment.amount_tetri IS DISTINCT FROM v_amount
    OR v_payment.method IS DISTINCT FROM p_method OR v_payment.reference IS DISTINCT FROM p_reference THEN
   RAISE EXCEPTION 'Payment identity conflict' USING ERRCODE='22023';
  END IF;
  RETURN private.purchase_payment_json(v_payment)||jsonb_build_object('idempotent_replay',true);
 END IF;
 IF p_revision IS DISTINCT FROM v_order.revision THEN RAISE EXCEPTION 'Purchase revision conflict' USING ERRCODE='PT409'; END IF;
 IF v_order.status NOT IN ('partial','received') THEN RAISE EXCEPTION 'No received goods to pay' USING ERRCODE='22023'; END IF;
 SELECT coalesce(sum(quantity*unit_cost*100),0) INTO v_received FROM public.admin_purchase_receipts WHERE purchase_id=p_id;
 SELECT coalesce(sum(h.amount_tetri),0) INTO v_paid FROM public.admin_purchase_payments h WHERE h.purchase_id=p_id AND NOT EXISTS(SELECT 1 FROM public.admin_purchase_payment_corrections c WHERE c.payment_id=h.id);
 IF v_paid>v_received OR v_amount>v_received-v_paid THEN RAISE EXCEPTION 'Payment exceeds received balance' USING ERRCODE='22023'; END IF;
 INSERT INTO public.admin_purchase_payments(id,purchase_id,amount_tetri,method,reference,actor_id,recorded_revision)
 VALUES(p_payment,p_id,v_amount,p_method,p_reference,v_actor,v_order.revision+1) RETURNING * INTO v_payment;
 UPDATE public.admin_purchase_orders SET revision=revision+1,updated_at=clock_timestamp() WHERE id=p_id;
 RETURN private.purchase_payment_json(v_payment)||jsonb_build_object('idempotent_replay',false);
END;
$payment$;
REVOKE ALL ON FUNCTION private.record_admin_purchase_payment(uuid,uuid,bigint,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.record_admin_purchase_payment(uuid,uuid,bigint,text,text,text) TO authenticated;
CREATE FUNCTION public.admin_record_purchase_payment(p_id uuid,p_payment uuid,p_revision bigint,p_amount_tetri text,p_method text,p_reference text) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $payment$
 SELECT private.record_admin_purchase_payment(p_id,p_payment,p_revision,p_amount_tetri,p_method,p_reference);
$payment$;
REVOKE ALL ON FUNCTION public.admin_record_purchase_payment(uuid,uuid,bigint,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_record_purchase_payment(uuid,uuid,bigint,text,text,text) TO authenticated;

CREATE FUNCTION private.correct_admin_purchase_payment(p_id uuid,p_payment uuid,p_correction uuid,p_revision bigint,p_reason text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $correction$
DECLARE
 v_actor uuid:=private.require_purchase_owner();
 v_order public.admin_purchase_orders%ROWTYPE;
 v_payment public.admin_purchase_payments%ROWTYPE;
 v_correction public.admin_purchase_payment_corrections%ROWTYPE;
 v_replay boolean:=false;
BEGIN
 IF p_id IS NULL OR p_payment IS NULL OR p_correction IS NULL OR p_revision IS NULL OR p_revision<1
 OR p_reason IS NULL OR length(p_reason) NOT BETWEEN 5 AND 300 OR p_reason<>btrim(p_reason) OR p_reason ~ '[[:cntrl:]]' THEN
  RAISE EXCEPTION 'Invalid correction' USING ERRCODE='22023';
 END IF;
 SELECT * INTO v_order FROM public.admin_purchase_orders WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Purchase missing' USING ERRCODE='22023'; END IF;
 SELECT * INTO v_payment FROM public.admin_purchase_payments WHERE id=p_payment AND purchase_id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Payment missing from purchase' USING ERRCODE='22023'; END IF;
 SELECT * INTO v_correction FROM public.admin_purchase_payment_corrections WHERE id=p_correction;
 IF FOUND THEN
  IF v_correction.payment_id IS DISTINCT FROM p_payment OR v_correction.reason IS DISTINCT FROM p_reason THEN
   RAISE EXCEPTION 'Correction identity conflict' USING ERRCODE='22023';
  END IF;
  v_replay:=true;
 ELSE
  IF p_revision IS DISTINCT FROM v_order.revision THEN RAISE EXCEPTION 'Purchase revision conflict' USING ERRCODE='PT409'; END IF;
  IF EXISTS(SELECT 1 FROM public.admin_purchase_payment_corrections WHERE payment_id=p_payment) THEN RAISE EXCEPTION 'Payment already corrected' USING ERRCODE='22023'; END IF;
  INSERT INTO public.admin_purchase_payment_corrections(id,payment_id,reason,actor_id,recorded_revision)
   VALUES(p_correction,p_payment,p_reason,v_actor,v_order.revision+1) RETURNING * INTO v_correction;
  UPDATE public.admin_purchase_orders SET revision=revision+1,updated_at=clock_timestamp() WHERE id=p_id;
 END IF;
 RETURN jsonb_build_object('id',v_correction.id,'purchase_id',p_id,'payment_id',p_payment,
 'amount_tetri',v_payment.amount_tetri::text,'reason',v_correction.reason,'recorded_at',v_correction.recorded_at,
 'recorded_revision',v_correction.recorded_revision::text,'idempotent_replay',v_replay);
END;
$correction$;
REVOKE ALL ON FUNCTION private.correct_admin_purchase_payment(uuid,uuid,uuid,bigint,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.correct_admin_purchase_payment(uuid,uuid,uuid,bigint,text) TO authenticated;
CREATE FUNCTION public.admin_correct_purchase_payment(p_id uuid,p_payment uuid,p_correction uuid,p_revision bigint,p_reason text) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $correction$
 SELECT private.correct_admin_purchase_payment(p_id,p_payment,p_correction,p_revision,p_reason);
$correction$;
REVOKE ALL ON FUNCTION public.admin_correct_purchase_payment(uuid,uuid,uuid,bigint,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_correct_purchase_payment(uuid,uuid,uuid,bigint,text) TO authenticated;

-- One MVCC snapshot for totals and bounded history. Totals always include ALL records.
CREATE FUNCTION private.read_admin_purchase_payments(p_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $payment$
DECLARE v_actor uuid:=private.require_purchase_owner(); v_result jsonb;
BEGIN
 SELECT jsonb_build_object(
  'purchase_id',o.id,'revision',o.revision::text,
  'received_tetri',r.total::text,'paid_tetri',p.total::text,'balance_tetri',(r.total-p.total)::text,
  'payment_count',p.n::text,'correction_count',p.corrected::text,'has_more',p.n>100,
  'payments',coalesce((SELECT jsonb_agg(private.purchase_payment_json(x)||jsonb_build_object('correction',(SELECT jsonb_build_object('id',c.id,'reason',c.reason,'recorded_at',c.recorded_at,'recorded_revision',c.recorded_revision::text) FROM public.admin_purchase_payment_corrections c WHERE c.payment_id=x.id)) ORDER BY x.recorded_at DESC,x.id DESC)
    FROM (SELECT * FROM public.admin_purchase_payments h WHERE h.purchase_id=o.id ORDER BY h.recorded_at DESC,h.id DESC LIMIT 100) x),'[]'::jsonb))
 INTO v_result
 FROM public.admin_purchase_orders o
 CROSS JOIN LATERAL (SELECT coalesce(sum(quantity*unit_cost*100),0)::numeric(20,0) AS total FROM public.admin_purchase_receipts WHERE purchase_id=o.id) r
 CROSS JOIN LATERAL (SELECT coalesce(sum(h.amount_tetri) FILTER(WHERE c.id IS NULL),0)::numeric(20,0) AS total,count(*) AS n,count(c.id) AS corrected FROM public.admin_purchase_payments h LEFT JOIN public.admin_purchase_payment_corrections c ON c.payment_id=h.id WHERE h.purchase_id=o.id) p
 WHERE o.id=p_id AND r.total>=p.total;
 IF v_result IS NULL THEN RAISE EXCEPTION 'Purchase balance unavailable' USING ERRCODE='22023'; END IF;
 RETURN v_result;
END;
$payment$;
REVOKE ALL ON FUNCTION private.read_admin_purchase_payments(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.read_admin_purchase_payments(uuid) TO authenticated;
CREATE FUNCTION public.admin_read_purchase_payments(p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $payment$
 SELECT private.read_admin_purchase_payments(p_id);
$payment$;
REVOKE ALL ON FUNCTION public.admin_read_purchase_payments(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_read_purchase_payments(uuid) TO authenticated;
-- Aggregate all purchases, not just the last 100 shown in the workspace.
CREATE FUNCTION private.read_admin_supplier_balance(p_supplier uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $summary$
DECLARE v_actor uuid:=private.require_purchase_owner(); v_result jsonb;
BEGIN
 IF p_supplier IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.admin_suppliers WHERE id=p_supplier) THEN RAISE EXCEPTION 'Supplier missing' USING ERRCODE='22023'; END IF;
 WITH balances AS (
 SELECT o.id,coalesce(r.total,0) AS received,coalesce(p.total,0) AS paid
 FROM public.admin_purchase_orders o
 LEFT JOIN LATERAL (SELECT sum(quantity*unit_cost*100) AS total FROM public.admin_purchase_receipts WHERE purchase_id=o.id) r ON true
 LEFT JOIN LATERAL (SELECT sum(h.amount_tetri) AS total FROM public.admin_purchase_payments h WHERE h.purchase_id=o.id AND NOT EXISTS(SELECT 1 FROM public.admin_purchase_payment_corrections c WHERE c.payment_id=h.id)) p ON true
 WHERE p_supplier IS NULL OR o.supplier_id=p_supplier
 )
 SELECT jsonb_build_object('supplier_id',p_supplier,'purchase_count',count(*)::text,
 'received_tetri',trunc(coalesce(sum(received),0))::text,'paid_tetri',trunc(coalesce(sum(paid),0))::text,
 'balance_tetri',trunc(coalesce(sum(received-paid),0))::text)
 INTO v_result FROM balances HAVING count(*) FILTER(WHERE paid>received)=0;
 IF v_result IS NULL THEN RAISE EXCEPTION 'Supplier balance inconsistent' USING ERRCODE='22023'; END IF;
 RETURN v_result;
END;
$summary$;
REVOKE ALL ON FUNCTION private.read_admin_supplier_balance(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.read_admin_supplier_balance(uuid) TO authenticated;
CREATE FUNCTION public.admin_read_supplier_balance(p_supplier uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $summary$
 SELECT private.read_admin_supplier_balance(p_supplier);
$summary$;
REVOKE ALL ON FUNCTION public.admin_read_supplier_balance(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_read_supplier_balance(uuid) TO authenticated;

-- Verified staged source: release/staged-marketing-consent.sql (c7aae916350f7d7f108901678b53041b6611ecd8)
CREATE TABLE private.marketing_email_consent_events (
 sequence_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 event_id uuid NOT NULL UNIQUE,
 expected_event_id uuid,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 opted_in boolean NOT NULL,
 policy_version text NOT NULL CHECK(policy_version='email-marketing-v1'),
 email_fingerprint bytea,
 verified_email_confirmed_at timestamptz,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK ((opted_in AND email_fingerprint IS NOT NULL AND octet_length(email_fingerprint)=32 AND verified_email_confirmed_at IS NOT NULL) OR (NOT opted_in AND email_fingerprint IS NULL AND verified_email_confirmed_at IS NULL))
);
CREATE INDEX marketing_email_consent_user_idx ON private.marketing_email_consent_events(user_id,sequence_id DESC);
ALTER TABLE private.marketing_email_consent_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.marketing_email_consent_events FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE private.marketing_email_consent_events_sequence_id_seq FROM PUBLIC,anon,authenticated;

-- Bind consent to a verified account address. Never expose or copy the raw address in this ledger.
CREATE FUNCTION private.marketing_email_fingerprint(p_email text) RETURNS bytea
LANGUAGE sql IMMUTABLE STRICT SECURITY INVOKER SET search_path='' AS $consent$
 SELECT sha256(convert_to(lower(btrim(p_email)),'UTF8'));
$consent$;
REVOKE ALL ON FUNCTION private.marketing_email_fingerprint(text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.read_my_marketing_email_consent() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $consent$
DECLARE v_user uuid:=auth.uid(); v_email text; v_confirmed timestamptz; v_event private.marketing_email_consent_events%ROWTYPE; v_status text;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 SELECT email,email_confirmed_at INTO v_email,v_confirmed FROM auth.users WHERE id=v_user;
 IF NOT FOUND THEN RAISE EXCEPTION 'Account unavailable' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_event FROM private.marketing_email_consent_events WHERE user_id=v_user ORDER BY sequence_id DESC LIMIT 1;
 IF NOT FOUND THEN v_status:='not_set';
 ELSIF NOT v_event.opted_in THEN v_status:='withdrawn';
 ELSIF v_confirmed IS NULL OR coalesce(btrim(v_email),'')='' OR v_event.email_fingerprint IS DISTINCT FROM private.marketing_email_fingerprint(v_email) OR v_event.verified_email_confirmed_at IS DISTINCT FROM v_confirmed THEN v_status:='reconfirmation_required';
 ELSE v_status:='opted_in';
 END IF;
 RETURN jsonb_build_object('status',v_status,'policy_version','email-marketing-v1','event_id',v_event.event_id,'recorded_at',v_event.recorded_at,
 'can_opt_in',v_confirmed IS NOT NULL AND coalesce(btrim(v_email),'')<>'');
END;
$consent$;
REVOKE ALL ON FUNCTION private.read_my_marketing_email_consent() FROM PUBLIC,anon,authenticated;
-- Customer consent RPC deliberately not granted in this release.
CREATE FUNCTION public.my_marketing_email_consent() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $consent$
 SELECT private.read_my_marketing_email_consent();
$consent$;
REVOKE ALL ON FUNCTION public.my_marketing_email_consent() FROM PUBLIC,anon,authenticated;
-- Customer consent RPC deliberately not granted in this release.

CREATE FUNCTION private.set_my_marketing_email_consent(p_event uuid,p_opted_in boolean,p_policy_version text,p_expected_event uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $consent$
DECLARE v_user uuid:=auth.uid(); v_email text; v_confirmed timestamptz; v_event private.marketing_email_consent_events%ROWTYPE; v_replay boolean:=false; v_latest uuid;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 IF p_event IS NULL OR p_opted_in IS NULL OR p_policy_version IS DISTINCT FROM 'email-marketing-v1' OR (NOT p_opted_in AND p_expected_event IS NOT NULL) THEN RAISE EXCEPTION 'Invalid consent request' USING ERRCODE='22023'; END IF;
 -- Serialize consent changes and account email changes. No auth row mutation.
 SELECT email,email_confirmed_at INTO v_email,v_confirmed FROM auth.users WHERE id=v_user FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Account unavailable' USING ERRCODE='42501'; END IF;
 SELECT * INTO v_event FROM private.marketing_email_consent_events WHERE event_id=p_event;
 IF FOUND THEN
  IF v_event.user_id IS DISTINCT FROM v_user OR v_event.opted_in IS DISTINCT FROM p_opted_in OR v_event.policy_version IS DISTINCT FROM p_policy_version OR v_event.expected_event_id IS DISTINCT FROM p_expected_event THEN
   RAISE EXCEPTION 'Consent request conflict' USING ERRCODE='22023';
  END IF;
  v_replay:=true;
 ELSE
  SELECT event_id INTO v_latest FROM private.marketing_email_consent_events WHERE user_id=v_user ORDER BY sequence_id DESC LIMIT 1;
  IF p_opted_in AND v_latest IS DISTINCT FROM p_expected_event THEN RAISE EXCEPTION 'Consent changed; refresh before opting in' USING ERRCODE='PT409'; END IF;
  IF p_opted_in AND (v_confirmed IS NULL OR coalesce(btrim(v_email),'')='') THEN RAISE EXCEPTION 'Verified email required' USING ERRCODE='22023'; END IF;
  INSERT INTO private.marketing_email_consent_events(event_id,user_id,opted_in,policy_version,email_fingerprint,expected_event_id,verified_email_confirmed_at)
  VALUES(p_event,v_user,p_opted_in,p_policy_version,CASE WHEN p_opted_in THEN private.marketing_email_fingerprint(v_email) ELSE NULL END,p_expected_event,CASE WHEN p_opted_in THEN v_confirmed ELSE NULL END)
  RETURNING * INTO v_event;
 END IF;
 -- A retry of an old opt-in cannot override a later withdrawal or a changed email.
 RETURN private.read_my_marketing_email_consent()||jsonb_build_object('acknowledged_event_id',v_event.event_id,'idempotent_replay',v_replay);
END;
$consent$;
REVOKE ALL ON FUNCTION private.set_my_marketing_email_consent(uuid,boolean,text,uuid) FROM PUBLIC,anon,authenticated;
-- Customer consent RPC deliberately not granted in this release.
CREATE FUNCTION public.set_my_marketing_email_consent(p_event uuid,p_opted_in boolean,p_policy_version text,p_expected_event uuid) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $consent$
 SELECT private.set_my_marketing_email_consent(p_event,p_opted_in,p_policy_version,p_expected_event);
$consent$;
REVOKE ALL ON FUNCTION public.set_my_marketing_email_consent(uuid,boolean,text,uuid) FROM PUBLIC,anon,authenticated;
-- Customer consent RPC deliberately not granted in this release.

-- Owner-only aggregate; not a deliverable audience or a list of customer addresses.
CREATE FUNCTION private.read_admin_marketing_consent_summary() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $consent$
DECLARE v_result jsonb;
BEGIN
 IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid OR coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
 WITH states AS (
 SELECT CASE WHEN e.event_id IS NULL THEN 'not_set' WHEN NOT e.opted_in THEN 'withdrawn'
 WHEN u.email_confirmed_at IS NULL OR coalesce(btrim(u.email),'')='' OR e.email_fingerprint IS DISTINCT FROM private.marketing_email_fingerprint(u.email) OR e.verified_email_confirmed_at IS DISTINCT FROM u.email_confirmed_at THEN 'reconfirmation_required'
 ELSE 'opted_in' END AS status
 FROM auth.users u LEFT JOIN LATERAL (SELECT * FROM private.marketing_email_consent_events WHERE user_id=u.id ORDER BY sequence_id DESC LIMIT 1) e ON true
 )
 SELECT jsonb_build_object('total',count(*)::text,'not_set',(count(*) FILTER(WHERE status='not_set'))::text,
 'withdrawn',(count(*) FILTER(WHERE status='withdrawn'))::text,'reconfirmation_required',(count(*) FILTER(WHERE status='reconfirmation_required'))::text,
 'opted_in',(count(*) FILTER(WHERE status='opted_in'))::text)
 INTO v_result FROM states;
 RETURN v_result;
END;
$consent$;
REVOKE ALL ON FUNCTION private.read_admin_marketing_consent_summary() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.read_admin_marketing_consent_summary() TO authenticated;
CREATE FUNCTION public.admin_marketing_consent_summary() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $consent$
 SELECT private.read_admin_marketing_consent_summary();
$consent$;
REVOKE ALL ON FUNCTION public.admin_marketing_consent_summary() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_marketing_consent_summary() TO authenticated;
-- Release hold: no real consent reads/writes until retention and activation are approved.
DO $pause$
BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
  EXECUTE 'REVOKE ALL ON FUNCTION private.read_my_marketing_email_consent() FROM service_role';
  EXECUTE 'REVOKE ALL ON FUNCTION public.my_marketing_email_consent() FROM service_role';
  EXECUTE 'REVOKE ALL ON FUNCTION private.set_my_marketing_email_consent(uuid,boolean,text,uuid) FROM service_role';
  EXECUTE 'REVOKE ALL ON FUNCTION public.set_my_marketing_email_consent(uuid,boolean,text,uuid) FROM service_role';
  EXECUTE 'REVOKE ALL ON private.marketing_email_consent_events FROM service_role';
  EXECUTE 'REVOKE ALL ON SEQUENCE private.marketing_email_consent_events_sequence_id_seq FROM service_role';
 END IF;
END $pause$;

-- Verified staged source: release/staged-marketing-segments.sql (bffb1ca6d2a136dc18efbe3c9d8cff5fc01d6b5f)
CREATE FUNCTION private.read_admin_marketing_segments() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $segment$
DECLARE v_result jsonb; v_today date:=(statement_timestamp() AT TIME ZONE 'Asia/Tbilisi')::date;
BEGIN
 IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid OR coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
 WITH accounts AS (
  SELECT u.id,u.created_at,coalesce(c.is_vip,false) AS vip,
   coalesce(c.is_blocked,false) OR coalesce(u.banned_until>statement_timestamp(),false) AS blocked,
   coalesce(lower(btrim(u.email)),'') AS normalized_email,
   coalesce(e.opted_in AND u.email_confirmed_at IS NOT NULL AND coalesce(btrim(u.email),'')<>'' AND e.email_fingerprint=private.marketing_email_fingerprint(u.email) AND e.verified_email_confirmed_at=u.email_confirmed_at,false) AS consent
  FROM auth.users u
  LEFT JOIN private.admin_customer_crm_profiles c ON c.user_id=u.id
  LEFT JOIN LATERAL (SELECT * FROM private.marketing_email_consent_events WHERE user_id=u.id ORDER BY sequence_id DESC LIMIT 1) e ON true
  WHERE u.id<>'1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid
   AND coalesce(u.raw_app_meta_data->>'role','') NOT IN ('admin','staff')
   AND NOT EXISTS(SELECT 1 FROM public.admin_staff_members m WHERE m.user_id=u.id)
   AND coalesce(u.is_anonymous,false)=false
   AND u.deleted_at IS NULL
 ), activity AS (
  SELECT a.*,
   coalesce(o.completed,0) AS completed,o.last_day
  FROM accounts a
  LEFT JOIN LATERAL (
   SELECT count(*) AS completed,max((ord.created_at AT TIME ZONE 'Asia/Tbilisi')::date) AS last_day
   FROM public.orders ord
   WHERE ord.user_id=a.id AND lower(btrim(ord.status)) IN ('დასრულებული','ჩაბარებულია','completed','delivered','доставлен','завершён','завершен')
   AND ord.created_at IS NOT NULL AND ord.created_at<=statement_timestamp()
  ) o ON true
 ), address_counts AS (
  -- Count the full Auth address universe, including owner, staff and excluded
  -- accounts. An ambiguous address must never be a candidate.
  SELECT lower(btrim(email)) AS normalized_email,count(*) AS address_accounts
  FROM auth.users WHERE coalesce(btrim(email),'')<>''
  GROUP BY lower(btrim(email))
 ), dedup AS (
  SELECT a.*,coalesce(d.address_accounts,0) AS address_accounts
  FROM activity a LEFT JOIN address_counts d USING(normalized_email)
 ), classified AS (
 SELECT d.*,
  (NOT blocked AND consent AND address_accounts=1) AS consent_candidate,
  (created_at IS NOT NULL AND (created_at AT TIME ZONE 'Asia/Tbilisi')::date BETWEEN v_today-29 AND v_today AND created_at<=statement_timestamp()) AS recent_account,
  (completed>0 AND last_day<v_today-89) AS inactive
 FROM dedup d
 )
 SELECT jsonb_build_object('as_of',statement_timestamp(),'timezone','Asia/Tbilisi','new_days',30,'inactive_days',90,
 'segments',jsonb_object_agg(segment,jsonb_build_object('accounts',accounts::text,'consent_candidates',candidates::text)))
 INTO v_result FROM (SELECT g.segment,count(c.id) AS accounts,count(c.id) FILTER(WHERE c.consent_candidate) AS candidates
 FROM (VALUES ('all'),('vip'),('new'),('no_purchase'),('one_purchase'),('repeat'),('inactive')) g(segment)
 LEFT JOIN classified c ON CASE g.segment
  WHEN 'all' THEN true WHEN 'vip' THEN c.vip WHEN 'new' THEN c.recent_account WHEN 'no_purchase' THEN c.completed=0 WHEN 'one_purchase' THEN c.completed=1 WHEN 'repeat' THEN c.completed>=2 WHEN 'inactive' THEN c.inactive ELSE false END
 GROUP BY g.segment) results;
 RETURN v_result;
END;
$segment$;
REVOKE ALL ON FUNCTION private.read_admin_marketing_segments() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.read_admin_marketing_segments() TO authenticated;
CREATE FUNCTION public.admin_marketing_segments() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $segment$
 SELECT private.read_admin_marketing_segments();
$segment$;
REVOKE ALL ON FUNCTION public.admin_marketing_segments() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_marketing_segments() TO authenticated;

-- Verified staged source: release/staged-marketing-campaigns.sql (fb8204b18227a068f87e553fceb4789203b9ea0b)
CREATE TABLE private.marketing_campaigns (
 id uuid PRIMARY KEY,
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 120 AND name=btrim(name)),
 segment text NOT NULL CHECK(segment IN ('all','vip','new','no_purchase','one_purchase','repeat','inactive')),
 subject text NOT NULL CHECK(length(subject) BETWEEN 1 AND 160 AND subject=btrim(subject)),
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 10000 AND body=btrim(body)),
 planned_at timestamptz,
 archived boolean NOT NULL DEFAULT false,
 revision bigint NOT NULL DEFAULT 1 CHECK(revision>0),
 created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX marketing_campaign_recent_idx ON private.marketing_campaigns(updated_at DESC,id);
ALTER TABLE private.marketing_campaigns ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.marketing_campaigns FROM PUBLIC,anon,authenticated;
CREATE TABLE private.marketing_campaign_revisions (
 request_id uuid PRIMARY KEY,
 campaign_id uuid NOT NULL REFERENCES private.marketing_campaigns(id) ON DELETE RESTRICT,
 revision bigint NOT NULL,
 operation text NOT NULL CHECK(operation IN ('create','edit','archive')),
 payload jsonb NOT NULL,
 snapshot jsonb NOT NULL,
 actor_id uuid NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(campaign_id,revision)
);
ALTER TABLE private.marketing_campaign_revisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.marketing_campaign_revisions FROM PUBLIC,anon,authenticated;
CREATE FUNCTION private.reject_marketing_revision_mutation() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $campaign$
BEGIN RAISE EXCEPTION 'Campaign revisions are append-only' USING ERRCODE='55000'; END;
$campaign$;
REVOKE ALL ON FUNCTION private.reject_marketing_revision_mutation() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER marketing_revision_immutable BEFORE UPDATE OR DELETE ON private.marketing_campaign_revisions FOR EACH ROW EXECUTE FUNCTION private.reject_marketing_revision_mutation();

CREATE FUNCTION private.marketing_campaign_json(p private.marketing_campaigns) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $campaign$
 SELECT jsonb_build_object('id',p.id,'name',p.name,'segment',p.segment,'subject',p.subject,'body',p.body,
 'planned_at',p.planned_at,'archived',p.archived,'revision',p.revision::text,'created_at',p.created_at,'updated_at',p.updated_at,'delivery_enabled',false);
$campaign$;
REVOKE ALL ON FUNCTION private.marketing_campaign_json(private.marketing_campaigns) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.save_admin_marketing_campaign(p_id uuid,p_request uuid,p_revision bigint,p_operation text,p_name text,p_segment text,p_subject text,p_body text,p_planned_at timestamptz) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $campaign$
DECLARE v_actor uuid:=auth.uid(); v_row private.marketing_campaigns%ROWTYPE; v_old private.marketing_campaign_revisions%ROWTYPE; v_payload jsonb; v_snapshot jsonb;
BEGIN
 IF v_actor IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid OR coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_request IS NULL OR p_revision IS NULL OR p_operation IS NULL OR p_operation NOT IN ('create','edit','archive') OR (p_operation='create' AND p_revision<>0) OR (p_operation<>'create' AND p_revision<1) THEN RAISE EXCEPTION 'Invalid campaign request' USING ERRCODE='22023'; END IF;
 IF p_operation='archive' THEN
  IF p_name IS NOT NULL OR p_segment IS NOT NULL OR p_subject IS NOT NULL OR p_body IS NOT NULL OR p_planned_at IS NOT NULL THEN RAISE EXCEPTION 'Archive payload must be empty' USING ERRCODE='22023'; END IF;
 ELSE
  IF p_name IS NULL OR length(p_name) NOT BETWEEN 1 AND 120 OR p_name<>btrim(p_name) OR p_name ~ '[[:cntrl:]]'
   OR p_segment IS NULL OR p_segment NOT IN ('all','vip','new','no_purchase','one_purchase','repeat','inactive')
   OR p_subject IS NULL OR length(p_subject) NOT BETWEEN 1 AND 160 OR p_subject<>btrim(p_subject) OR p_subject ~ '[[:cntrl:]]'
   OR p_body IS NULL OR length(p_body) NOT BETWEEN 1 AND 10000 OR btrim(p_body)='' OR p_body<>btrim(p_body)
   OR p_body ~ '[[:cntrl:]]' AND regexp_replace(p_body,E'[\n\r\t]','','g') ~ '[[:cntrl:]]'
   OR (p_planned_at IS NOT NULL AND NOT isfinite(p_planned_at)) THEN RAISE EXCEPTION 'Invalid campaign fields' USING ERRCODE='22023'; END IF;
 END IF;
 v_payload:=jsonb_build_object('id',p_id,'revision',p_revision::text,'operation',p_operation,'name',p_name,'segment',p_segment,'subject',p_subject,'body',p_body,'planned_at',p_planned_at);
 -- Serialize identical request IDs, including concurrent retries.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request::text,1809));
 SELECT * INTO v_old FROM private.marketing_campaign_revisions WHERE request_id=p_request;
 IF FOUND THEN
  IF v_old.payload IS DISTINCT FROM v_payload OR v_old.actor_id IS DISTINCT FROM v_actor THEN RAISE EXCEPTION 'Campaign request identity conflict' USING ERRCODE='22023'; END IF;
  RETURN v_old.snapshot||jsonb_build_object('request_id',p_request,'idempotent_replay',true);
 END IF;
 IF p_operation<>'archive' AND p_planned_at IS NOT NULL AND (p_planned_at<=statement_timestamp() OR p_planned_at>statement_timestamp()+interval '365 days') THEN RAISE EXCEPTION 'Planning date outside next 365 days' USING ERRCODE='22023'; END IF;
 IF p_operation='create' THEN
  INSERT INTO private.marketing_campaigns(id,name,segment,subject,body,planned_at,created_by)
  VALUES(p_id,p_name,p_segment,p_subject,p_body,p_planned_at,v_actor) RETURNING * INTO v_row;
 ELSE
  SELECT * INTO v_row FROM private.marketing_campaigns WHERE id=p_id FOR UPDATE;
  IF NOT FOUND OR v_row.revision<>p_revision THEN RAISE EXCEPTION 'Campaign revision conflict' USING ERRCODE='PT409'; END IF;
  IF v_row.archived THEN RAISE EXCEPTION 'Archived campaign is read-only' USING ERRCODE='22023'; END IF;
  IF p_operation='archive' THEN
   UPDATE private.marketing_campaigns SET archived=true,planned_at=NULL,revision=revision+1,updated_at=clock_timestamp() WHERE id=p_id RETURNING * INTO v_row;
  ELSE
   UPDATE private.marketing_campaigns SET name=p_name,segment=p_segment,subject=p_subject,body=p_body,planned_at=p_planned_at,revision=revision+1,updated_at=clock_timestamp() WHERE id=p_id RETURNING * INTO v_row;
  END IF;
 END IF;
 v_snapshot:=private.marketing_campaign_json(v_row);
 INSERT INTO private.marketing_campaign_revisions(request_id,campaign_id,revision,operation,payload,snapshot,actor_id) VALUES(p_request,p_id,v_row.revision,p_operation,v_payload,v_snapshot,v_actor);
 RETURN v_snapshot||jsonb_build_object('request_id',p_request,'idempotent_replay',false);
END;
$campaign$;
REVOKE ALL ON FUNCTION private.save_admin_marketing_campaign(uuid,uuid,bigint,text,text,text,text,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.save_admin_marketing_campaign(uuid,uuid,bigint,text,text,text,text,text,timestamptz) TO authenticated;
CREATE FUNCTION public.admin_save_marketing_campaign(p_id uuid,p_request uuid,p_revision bigint,p_operation text,p_name text,p_segment text,p_subject text,p_body text,p_planned_at timestamptz) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $campaign$
 SELECT private.save_admin_marketing_campaign(p_id,p_request,p_revision,p_operation,p_name,p_segment,p_subject,p_body,p_planned_at);
$campaign$;
REVOKE ALL ON FUNCTION public.admin_save_marketing_campaign(uuid,uuid,bigint,text,text,text,text,text,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_marketing_campaign(uuid,uuid,bigint,text,text,text,text,text,timestamptz) TO authenticated;

CREATE FUNCTION private.read_admin_marketing_campaigns(p_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $campaign$
DECLARE v_result jsonb;
BEGIN
 IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid OR coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object('campaigns',coalesce(jsonb_agg(private.marketing_campaign_json(c) ORDER BY c.updated_at DESC,c.id),'[]'::jsonb),
 'total',(SELECT count(*)::text FROM private.marketing_campaigns WHERE p_id IS NULL OR id=p_id),'delivery_enabled',false)
 INTO v_result FROM (SELECT * FROM private.marketing_campaigns WHERE p_id IS NULL OR id=p_id ORDER BY updated_at DESC,id LIMIT 100) c;
 RETURN v_result;
END;
$campaign$;
REVOKE ALL ON FUNCTION private.read_admin_marketing_campaigns(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.read_admin_marketing_campaigns(uuid) TO authenticated;
CREATE FUNCTION public.admin_read_marketing_campaigns(p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $campaign$
 SELECT private.read_admin_marketing_campaigns(p_id);
$campaign$;
REVOKE ALL ON FUNCTION public.admin_read_marketing_campaigns(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_read_marketing_campaigns(uuid) TO authenticated;

-- Verified staged source: release/staged-marketing-templates.sql (f2a6b7ba6c91b9e0406f372018c99441ad8fa7bf)
CREATE TABLE private.marketing_template_versions (
 template_id uuid NOT NULL, revision bigint NOT NULL CHECK(revision>0),
 request_id uuid NOT NULL UNIQUE,
 operation text NOT NULL CHECK(operation IN ('create','edit','archive')),
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 120 AND name=btrim(name)),
 category text NOT NULL CHECK(category IN ('welcome','loyalty','promotion','reactivation','other')),
 segment text NOT NULL CHECK(segment IN ('all','vip','new','no_purchase','one_purchase','repeat','inactive')),
 subject text NOT NULL CHECK(length(subject) BETWEEN 1 AND 160 AND subject=btrim(subject)),
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 10000 AND body=btrim(body)),
 archived boolean NOT NULL,
 actor_id uuid NOT NULL, recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(template_id,revision)
);
ALTER TABLE private.marketing_template_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.marketing_template_versions FROM PUBLIC,anon,authenticated;
CREATE TRIGGER marketing_template_version_immutable BEFORE UPDATE OR DELETE ON private.marketing_template_versions FOR EACH ROW EXECUTE FUNCTION private.reject_marketing_revision_mutation();
CREATE FUNCTION private.marketing_template_json(v private.marketing_template_versions) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $template$
 SELECT jsonb_build_object('id',v.template_id,'revision',v.revision::text,'name',v.name,'category',v.category,'segment',v.segment,'subject',v.subject,'body',v.body,'archived',v.archived,'recorded_at',v.recorded_at);
$template$;
REVOKE ALL ON FUNCTION private.marketing_template_json(private.marketing_template_versions) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION private.save_admin_marketing_template(p_id uuid,p_request uuid,p_revision bigint,p_operation text,p_fields jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $template$
DECLARE v_actor uuid:=auth.uid(); v_old private.marketing_template_versions%ROWTYPE; v_new private.marketing_template_versions%ROWTYPE; v_fields jsonb;
BEGIN
 IF v_actor IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid OR coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_request IS NULL OR p_revision IS NULL OR p_operation IS NULL OR p_operation NOT IN ('create','edit','archive') OR (p_operation='create' AND p_revision<>0) OR (p_operation<>'create' AND p_revision<1) THEN RAISE EXCEPTION 'Invalid template operation' USING ERRCODE='22023'; END IF;
 IF p_operation='archive' THEN
  IF p_fields IS DISTINCT FROM '{}'::jsonb THEN RAISE EXCEPTION 'Archive requires empty fields' USING ERRCODE='22023'; END IF;
 ELSE
  IF jsonb_typeof(p_fields) IS DISTINCT FROM 'object' OR NOT (p_fields ?& ARRAY['name','category','segment','subject','body']) OR (p_fields-ARRAY['name','category','segment','subject','body'])<>'{}'::jsonb THEN RAISE EXCEPTION 'Invalid template fields' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM jsonb_each(p_fields) WHERE jsonb_typeof(value)<>'string') THEN RAISE EXCEPTION 'Invalid template field types' USING ERRCODE='22023'; END IF;
  IF length(p_fields->>'name') NOT BETWEEN 1 AND 120 OR p_fields->>'name'<>btrim(p_fields->>'name') OR p_fields->>'name'~'[[:cntrl:]]'
   OR p_fields->>'category' NOT IN ('welcome','loyalty','promotion','reactivation','other')
   OR p_fields->>'segment' NOT IN ('all','vip','new','no_purchase','one_purchase','repeat','inactive')
   OR length(p_fields->>'subject') NOT BETWEEN 1 AND 160 OR p_fields->>'subject'<>btrim(p_fields->>'subject') OR p_fields->>'subject'~'[[:cntrl:]]'
   OR length(p_fields->>'body') NOT BETWEEN 1 AND 10000 OR p_fields->>'body'<>btrim(p_fields->>'body') OR regexp_replace(p_fields->>'body',E'[\n\r\t]','','g')~'[[:cntrl:]]'
   OR btrim(regexp_replace(p_fields->>'body',E'[\n\r\t]','','g'))='' THEN RAISE EXCEPTION 'Invalid template values' USING ERRCODE='22023'; END IF;
 END IF;
 -- Lock request then template identity in separate advisory namespaces.
 PERFORM pg_advisory_xact_lock(19031,hashtext(p_request::text));
 PERFORM pg_advisory_xact_lock(19032,hashtext(p_id::text));
 SELECT * INTO v_old FROM private.marketing_template_versions WHERE request_id=p_request;
 IF FOUND THEN
  v_fields:=jsonb_build_object('name',v_old.name,'category',v_old.category,'segment',v_old.segment,'subject',v_old.subject,'body',v_old.body);
  IF v_old.template_id<>p_id OR v_old.actor_id<>v_actor OR v_old.revision<>p_revision+1 OR v_old.operation<>p_operation OR (p_operation<>'archive' AND v_fields IS DISTINCT FROM p_fields) THEN RAISE EXCEPTION 'Template request identity conflict' USING ERRCODE='22023'; END IF;
  RETURN private.marketing_template_json(v_old)||jsonb_build_object('request_id',p_request,'idempotent_replay',true);
 END IF;
 SELECT * INTO v_old FROM private.marketing_template_versions WHERE template_id=p_id ORDER BY revision DESC LIMIT 1;
 IF coalesce(v_old.revision,0)<>p_revision THEN RAISE EXCEPTION 'Template revision conflict' USING ERRCODE='PT409'; END IF;
 IF coalesce(v_old.archived,false) THEN RAISE EXCEPTION 'Archived template is read-only' USING ERRCODE='22023'; END IF;
 IF p_operation='archive' THEN v_fields:=jsonb_build_object('name',v_old.name,'category',v_old.category,'segment',v_old.segment,'subject',v_old.subject,'body',v_old.body); ELSE v_fields:=p_fields; END IF;
 INSERT INTO private.marketing_template_versions(template_id,revision,request_id,operation,name,category,segment,subject,body,archived,actor_id)
 VALUES(p_id,p_revision+1,p_request,p_operation,v_fields->>'name',v_fields->>'category',v_fields->>'segment',v_fields->>'subject',v_fields->>'body',p_operation='archive',v_actor) RETURNING * INTO v_new;
 RETURN private.marketing_template_json(v_new)||jsonb_build_object('request_id',p_request,'idempotent_replay',false);
END;
$template$;
REVOKE ALL ON FUNCTION private.save_admin_marketing_template(uuid,uuid,bigint,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.save_admin_marketing_template(uuid,uuid,bigint,text,jsonb) TO authenticated;
CREATE FUNCTION public.admin_save_marketing_template(p_id uuid,p_request uuid,p_revision bigint,p_operation text,p_fields jsonb) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $template$
 SELECT private.save_admin_marketing_template(p_id,p_request,p_revision,p_operation,p_fields);
$template$;
REVOKE ALL ON FUNCTION public.admin_save_marketing_template(uuid,uuid,bigint,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_marketing_template(uuid,uuid,bigint,text,jsonb) TO authenticated;
CREATE FUNCTION private.read_admin_marketing_templates(p_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $template$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid OR coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
 WITH latest AS (SELECT DISTINCT ON(template_id) * FROM private.marketing_template_versions WHERE p_id IS NULL OR template_id=p_id ORDER BY template_id,revision DESC)
 SELECT jsonb_build_object('total',(SELECT count(*)::text FROM latest),'templates',coalesce(jsonb_agg(private.marketing_template_json(v) ORDER BY v.recorded_at DESC,v.template_id),'[]'::jsonb)) INTO result
 FROM (SELECT * FROM latest ORDER BY recorded_at DESC,template_id LIMIT 100) v;
 RETURN result;
END;
$template$;
REVOKE ALL ON FUNCTION private.read_admin_marketing_templates(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.read_admin_marketing_templates(uuid) TO authenticated;
CREATE FUNCTION public.admin_read_marketing_templates(p_id uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $template$
 SELECT private.read_admin_marketing_templates(p_id);
$template$;
REVOKE ALL ON FUNCTION public.admin_read_marketing_templates(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_read_marketing_templates(uuid) TO authenticated;

-- Verified staged source: release/staged-marketing-preflight.sql (5fc8f32cb3411eb259160b4bfea68436ff4f2b4e)
CREATE TABLE private.marketing_campaign_preflights (
 request_id uuid PRIMARY KEY,
 campaign_id uuid NOT NULL REFERENCES private.marketing_campaigns(id) ON DELETE RESTRICT,
 campaign_revision bigint NOT NULL CHECK(campaign_revision>0),
 segment text NOT NULL CHECK(segment IN ('all','vip','new','no_purchase','one_purchase','repeat','inactive')),
 accounts bigint NOT NULL CHECK(accounts>=0),
 consent_candidates bigint NOT NULL CHECK(consent_candidates>=0 AND consent_candidates<=accounts),
 blockers text[] NOT NULL CHECK(cardinality(blockers)>0),
 audience_as_of timestamptz NOT NULL,
 checked_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 actor_id uuid NOT NULL,
 FOREIGN KEY(campaign_id,campaign_revision) REFERENCES private.marketing_campaign_revisions(campaign_id,revision) ON DELETE RESTRICT
);
CREATE INDEX marketing_preflight_campaign_idx ON private.marketing_campaign_preflights(campaign_id,checked_at DESC,request_id);
ALTER TABLE private.marketing_campaign_preflights ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.marketing_campaign_preflights FROM PUBLIC,anon,authenticated;
CREATE TRIGGER marketing_preflight_immutable BEFORE UPDATE OR DELETE ON private.marketing_campaign_preflights FOR EACH ROW EXECUTE FUNCTION private.reject_marketing_revision_mutation();

CREATE FUNCTION private.marketing_preflight_json(v private.marketing_campaign_preflights) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $preflight$
 SELECT jsonb_build_object('request_id',v.request_id,'campaign_id',v.campaign_id,'campaign_revision',v.campaign_revision::text,
 'segment',v.segment,'accounts',v.accounts::text,'consent_candidates',v.consent_candidates::text,'blockers',to_jsonb(v.blockers),
 'audience_as_of',v.audience_as_of,'checked_at',v.checked_at,'status','blocked','delivery_enabled',false,'is_send_authorization',false);
$preflight$;
REVOKE ALL ON FUNCTION private.marketing_preflight_json(private.marketing_campaign_preflights) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.check_admin_marketing_campaign(p_id uuid,p_revision bigint,p_request uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $preflight$
DECLARE v_actor uuid:=auth.uid(); v_campaign private.marketing_campaigns%ROWTYPE;
 v_record private.marketing_campaign_preflights%ROWTYPE; v_segments jsonb; v_counts jsonb; v_accounts bigint; v_candidates bigint;
 v_blockers text[]:=ARRAY['delivery_disabled','provider_not_configured','sender_not_verified','unsubscribe_not_verified','suppression_not_verified','privacy_review_pending','delivery_recheck_not_implemented'];
BEGIN
 IF v_actor IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid OR coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_request IS NULL OR p_revision IS NULL OR p_revision<1 THEN RAISE EXCEPTION 'Invalid preflight request' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(20001,hashtext(p_request::text));
 SELECT * INTO v_record FROM private.marketing_campaign_preflights WHERE request_id=p_request;
 IF FOUND THEN
  IF v_record.campaign_id<>p_id OR v_record.campaign_revision<>p_revision OR v_record.actor_id<>v_actor THEN RAISE EXCEPTION 'Preflight request identity conflict' USING ERRCODE='22023'; END IF;
  RETURN private.marketing_preflight_json(v_record)||jsonb_build_object('idempotent_replay',true);
 END IF;
 SELECT * INTO v_campaign FROM private.marketing_campaigns WHERE id=p_id FOR SHARE;
 IF NOT FOUND OR v_campaign.revision<>p_revision THEN RAISE EXCEPTION 'Campaign revision conflict' USING ERRCODE='PT409'; END IF;
 v_segments:=private.read_admin_marketing_segments();
 v_counts:=v_segments->'segments'->v_campaign.segment;
 IF v_counts IS NULL OR coalesce(v_counts->>'accounts','') !~ '^[0-9]+$' OR coalesce(v_counts->>'consent_candidates','') !~ '^[0-9]+$' THEN RAISE EXCEPTION 'Audience data unavailable' USING ERRCODE='22023'; END IF;
 v_accounts:=(v_counts->>'accounts')::bigint; v_candidates:=(v_counts->>'consent_candidates')::bigint;
 IF v_candidates=0 THEN v_blockers:=array_append(v_blockers,'no_consent_candidates'); END IF;
 IF v_campaign.archived THEN v_blockers:=array_append(v_blockers,'campaign_archived'); END IF;
 IF v_campaign.planned_at IS NOT NULL AND v_campaign.planned_at<=statement_timestamp() THEN v_blockers:=array_append(v_blockers,'planned_time_elapsed'); END IF;
 INSERT INTO private.marketing_campaign_preflights(request_id,campaign_id,campaign_revision,segment,accounts,consent_candidates,blockers,audience_as_of,actor_id)
 VALUES(p_request,p_id,p_revision,v_campaign.segment,v_accounts,v_candidates,v_blockers,(v_segments->>'as_of')::timestamptz,v_actor)
 RETURNING * INTO v_record;
 RETURN private.marketing_preflight_json(v_record)||jsonb_build_object('idempotent_replay',false);
END;
$preflight$;
REVOKE ALL ON FUNCTION private.check_admin_marketing_campaign(uuid,bigint,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.check_admin_marketing_campaign(uuid,bigint,uuid) TO authenticated;
CREATE FUNCTION public.admin_check_marketing_campaign(p_id uuid,p_revision bigint,p_request uuid) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $preflight$
 SELECT private.check_admin_marketing_campaign(p_id,p_revision,p_request);
$preflight$;
REVOKE ALL ON FUNCTION public.admin_check_marketing_campaign(uuid,bigint,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_check_marketing_campaign(uuid,bigint,uuid) TO authenticated;

-- The current revision is returned with each history read, so callers cannot mistake
-- a historical observation for current readiness. Exact request lookup supports retries.
CREATE FUNCTION private.read_admin_marketing_preflights(p_id uuid,p_request uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $preflight$
DECLARE v_result jsonb;
BEGIN
 IF auth.uid() IS DISTINCT FROM '1060de3d-d28a-45f8-9a64-5e0368cffc4b'::uuid OR coalesce(auth.jwt()->'app_metadata'->>'role','')<>'admin' THEN RAISE EXCEPTION 'Owner required' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object('campaign_id',c.id,'current_revision',c.revision::text,'delivery_enabled',false,
 'total',(SELECT count(*)::text FROM private.marketing_campaign_preflights p WHERE p.campaign_id=c.id AND (p_request IS NULL OR p.request_id=p_request)),
 'checks',coalesce((SELECT jsonb_agg(private.marketing_preflight_json(p) ORDER BY p.checked_at DESC,p.request_id)
 FROM (SELECT * FROM private.marketing_campaign_preflights x WHERE x.campaign_id=c.id AND (p_request IS NULL OR x.request_id=p_request) ORDER BY x.checked_at DESC,x.request_id LIMIT 100) p),'[]'::jsonb))
 INTO v_result FROM private.marketing_campaigns c WHERE c.id=p_id;
 IF v_result IS NULL THEN RAISE EXCEPTION 'Campaign unavailable' USING ERRCODE='22023'; END IF;
 RETURN v_result;
END;
$preflight$;
REVOKE ALL ON FUNCTION private.read_admin_marketing_preflights(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.read_admin_marketing_preflights(uuid,uuid) TO authenticated;
CREATE FUNCTION public.admin_read_marketing_preflights(p_id uuid,p_request uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $preflight$
 SELECT private.read_admin_marketing_preflights(p_id,p_request);
$preflight$;
REVOKE ALL ON FUNCTION public.admin_read_marketing_preflights(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_read_marketing_preflights(uuid,uuid) TO authenticated;

-- In-transaction release guards: any violation must abort the migration.
-- Disposable catalog contract; no mutations, no customer data.
DO $audit$
DECLARE f record; t text; col record; privilege text; expected boolean; actual boolean; routine_oid oid; definer boolean; settings text[];
BEGIN
 FOR f IN SELECT * FROM (VALUES
  ('private','bump_admin_supplier_revision',false,false),
  ('private','require_purchase_owner',false,false),
  ('private','reject_purchase_receipt_mutation',false,false),
  ('private','purchase_variant',false,false),
  ('private','create_admin_purchase',true,true),
  ('private','transition_admin_purchase',true,true),
  ('private','receive_admin_purchase',true,true),
  ('public','admin_create_purchase',true,false),
  ('public','admin_transition_purchase',true,false),
  ('public','admin_receive_purchase',true,false),
  ('private','reject_purchase_payment_mutation',false,false),
  ('private','purchase_payment_json',false,false),
  ('private','record_admin_purchase_payment',true,true),
  ('public','admin_record_purchase_payment',true,false),
  ('private','correct_admin_purchase_payment',true,true),
  ('public','admin_correct_purchase_payment',true,false),
  ('private','read_admin_purchase_payments',true,true),
  ('public','admin_read_purchase_payments',true,false),
  ('private','read_admin_supplier_balance',true,true),
  ('public','admin_read_supplier_balance',true,false),
  ('private','marketing_email_fingerprint',false,false),
  ('private','read_my_marketing_email_consent',false,true),
  ('public','my_marketing_email_consent',false,false),
  ('private','set_my_marketing_email_consent',false,true),
  ('public','set_my_marketing_email_consent',false,false),
  ('private','read_admin_marketing_consent_summary',true,true),
  ('public','admin_marketing_consent_summary',true,false),
  ('private','read_admin_marketing_segments',true,true),
  ('public','admin_marketing_segments',true,false),
  ('private','reject_marketing_revision_mutation',false,false),
  ('private','marketing_campaign_json',false,false),
  ('private','save_admin_marketing_campaign',true,true),
  ('public','admin_save_marketing_campaign',true,false),
  ('private','read_admin_marketing_campaigns',true,true),
  ('public','admin_read_marketing_campaigns',true,false),
  ('private','marketing_template_json',false,false),
  ('private','save_admin_marketing_template',true,true),
  ('public','admin_save_marketing_template',true,false),
  ('private','read_admin_marketing_templates',true,true),
  ('public','admin_read_marketing_templates',true,false),
  ('private','marketing_preflight_json',false,false),
  ('private','check_admin_marketing_campaign',true,true),
  ('public','admin_check_marketing_campaign',true,false),
  ('private','read_admin_marketing_preflights',true,true),
  ('public','admin_read_marketing_preflights',true,false)
 ) AS v(schema_name,routine_name,authenticated_execute,security_definer) LOOP
  SELECT p.oid,p.prosecdef,p.proconfig INTO STRICT routine_oid,definer,settings
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname=f.schema_name AND p.proname=f.routine_name;
  IF has_function_privilege('anon',routine_oid,'EXECUTE') OR
     EXISTS(SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid=routine_oid AND a.grantee=0 AND a.privilege_type='EXECUTE') OR
     has_function_privilege('authenticated',routine_oid,'EXECUTE') IS DISTINCT FROM f.authenticated_execute OR definer IS DISTINCT FROM f.security_definer THEN
   RAISE EXCEPTION 'Candidate routine ACL or definer mismatch %.%',f.schema_name,f.routine_name;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM unnest(settings) s WHERE replace(s,'"','')='search_path=') THEN
   RAISE EXCEPTION 'Candidate routine search_path not empty %.%',f.schema_name,f.routine_name;
  END IF;
 END LOOP;
 -- Payment/correction tables are RPC-only even though they reside in public.
 FOREACH t IN ARRAY ARRAY['public.admin_suppliers','public.admin_purchase_orders','public.admin_purchase_lines','public.admin_purchase_receipts','public.admin_purchase_payments','public.admin_purchase_payment_corrections','private.marketing_email_consent_events','private.marketing_campaigns','private.marketing_campaign_revisions','private.marketing_template_versions','private.marketing_campaign_preflights'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE oid=to_regclass(t) AND relrowsecurity) THEN RAISE EXCEPTION 'Missing RLS %',t; END IF;
  FOREACH privilege IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] LOOP
   expected:=t IN ('public.admin_suppliers','public.admin_purchase_orders','public.admin_purchase_lines','public.admin_purchase_receipts') AND privilege='SELECT';
   IF has_table_privilege('anon',t,privilege) OR has_table_privilege('authenticated',t,privilege) IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Unexpected table ACL % %',t,privilege; END IF;
  END LOOP;
  FOR col IN SELECT attname FROM pg_attribute WHERE attrelid=to_regclass(t) AND attnum>0 AND NOT attisdropped LOOP
   FOREACH privilege IN ARRAY ARRAY['SELECT','INSERT','UPDATE','REFERENCES'] LOOP
    expected:=(t IN ('public.admin_suppliers','public.admin_purchase_orders','public.admin_purchase_lines','public.admin_purchase_receipts') AND privilege='SELECT') OR (t='public.admin_suppliers' AND ((privilege='INSERT' AND col.attname IN ('name','commission','is_active')) OR (privilege='UPDATE' AND col.attname IN ('commission','is_active'))));
    actual:=has_column_privilege('authenticated',t,col.attname,privilege);
    IF has_column_privilege('anon',t,col.attname,privilege) OR actual IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Unexpected column ACL %.% %',t,col.attname,privilege; END IF;
   END LOOP;
  END LOOP;
 END LOOP;
 IF has_sequence_privilege('anon','private.marketing_email_consent_events_sequence_id_seq','USAGE,SELECT,UPDATE') OR has_sequence_privilege('authenticated','private.marketing_email_consent_events_sequence_id_seq','USAGE,SELECT,UPDATE') THEN RAISE EXCEPTION 'Consent sequence exposed'; END IF;
END $audit$;

-- Read-only assertion against installed candidate before synthetic-only activation.
DO $paused$
DECLARE fn text; r text;
BEGIN
 FOREACH fn IN ARRAY ARRAY['private.read_my_marketing_email_consent()','public.my_marketing_email_consent()','private.set_my_marketing_email_consent(uuid,boolean,text,uuid)','public.set_my_marketing_email_consent(uuid,boolean,text,uuid)'] LOOP
  FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
   IF has_function_privilege(r,fn,'EXECUTE') THEN RAISE EXCEPTION 'Paused consent executable: % %',r,fn; END IF;
   IF has_table_privilege(r,'private.marketing_email_consent_events','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN') OR has_sequence_privilege(r,'private.marketing_email_consent_events_sequence_id_seq','USAGE,SELECT,UPDATE') THEN RAISE EXCEPTION 'Paused ledger exposed: %',r; END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM pg_proc p CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE p.oid=to_regprocedure(fn) AND a.grantee=0 AND a.privilege_type='EXECUTE') THEN RAISE EXCEPTION 'Paused consent PUBLIC execute: %',fn; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM private.marketing_email_consent_events) THEN RAISE EXCEPTION 'Paused candidate ledger is not empty'; END IF;
END $paused$;
