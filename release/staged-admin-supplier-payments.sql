-- STAGED ONLY: run after staged-admin-suppliers.sql and staged-admin-purchases.sql.
-- Records payments already made elsewhere; does not initiate a payment or post a general-ledger expense.
-- Policy for this block: no advances or overpayments; debt = received value minus recorded payments.
BEGIN;
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
 IF p_revision IS DISTINCT FROM v_order.revision THEN RAISE EXCEPTION 'Purchase revision conflict' USING ERRCODE='40001'; END IF;
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
  IF p_revision IS DISTINCT FROM v_order.revision THEN RAISE EXCEPTION 'Purchase revision conflict' USING ERRCODE='40001'; END IF;
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
COMMIT;
