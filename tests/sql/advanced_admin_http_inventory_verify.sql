-- Disposable fixture only, after signed HTTP scenarios.
\set ON_ERROR_STOP on
DO $test$
DECLARE p public.products%ROWTYPE;
BEGIN
 SELECT * INTO STRICT p FROM public.products WHERE id='http-variant';
 IF p.stock IS DISTINCT FROM 9 OR p.purchase_cost IS DISTINCT FROM 9 OR p.price_gel IS DISTINCT FROM 25 OR p.variants IS DISTINCT FROM '[{"id":"v","name":"Red S","variantType":"size_color","stock":5,"priceGEL":25},{"id":"w","name":"Blue M","variantType":"size_color","stock":4,"priceGEL":30}]'::jsonb THEN RAISE EXCEPTION 'Variant inventory or unrelated fields changed incorrectly'; END IF;
 IF (SELECT count(*) FROM private.inventory_movements WHERE product_id='http-variant' AND reason='manual_adjustment')<>1 OR NOT EXISTS(SELECT 1 FROM private.inventory_movements WHERE product_id='http-variant' AND variant_id='v' AND reason='manual_adjustment' AND before_quantity=2 AND after_quantity=5 AND quantity_delta=3 AND related_order_id IS NULL) THEN RAISE EXCEPTION 'Variant inventory ledger mismatch'; END IF;
 IF (SELECT count(*) FROM public.admin_purchase_receipts r JOIN public.admin_purchase_lines l ON l.id=r.line_id WHERE l.product_id='http-variant')<>1 THEN RAISE EXCEPTION 'Duplicate variant receipt'; END IF;
END $test$;
\echo 'PASS HTTP variant receipt aggregate, sibling, cost and append-only inventory ledger'

-- Restore paused candidate ACL after synthetic HTTP behavior tests.
REVOKE ALL ON FUNCTION private.read_my_marketing_email_consent() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.my_marketing_email_consent() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.set_my_marketing_email_consent(uuid,boolean,text,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.set_my_marketing_email_consent(uuid,boolean,text,uuid) FROM PUBLIC,anon,authenticated;
