-- Release phase B: revoke direct finance-bearing raw order snapshots ONLY AFTER
-- (1) phase A admin_order_ledger_page + admin_order_image_refs_page RPCs are
-- installed and tested, and (2) new PR #149 frontend is READY in Production.
-- Never run this before the site cutover: the existing production frontend
-- reads rest/v1/orders?select=* and select=items for admin tools.
-- Existing order RLS policies, status mutations, stock and order data unchanged.
BEGIN;

DO $verify_bridge$
BEGIN
 IF to_regprocedure('public.admin_order_ledger_page(integer,integer)') IS NULL
    OR to_regprocedure('public.admin_order_image_refs_page(integer,integer)') IS NULL
    OR to_regprocedure('private.admin_order_ledger_page(integer,integer)') IS NULL
    OR to_regprocedure('private.admin_order_image_refs_page(integer,integer)') IS NULL
    OR NOT has_function_privilege('authenticated', 'public.admin_order_ledger_page(integer,integer)', 'EXECUTE')
    OR NOT has_function_privilege('authenticated', 'public.admin_order_image_refs_page(integer,integer)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.admin_order_ledger_page(integer,integer)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.admin_order_image_refs_page(integer,integer)', 'EXECUTE')
 THEN
   RAISE EXCEPTION 'Stage70: compatible order projection APIs are missing or unsafe; do not revoke old reads';
 END IF;
END $verify_bridge$;

REVOKE SELECT ON TABLE public.orders FROM PUBLIC, anon, authenticated;
REVOKE SELECT (items,checkout_result,checkout_request)
  ON TABLE public.orders FROM PUBLIC, anon, authenticated;
GRANT SELECT (
  id, customer_name, phone, address, user_email, customer_email,
  user_id, total_gel, status, created_at, admin_note, status_changed_at,
  stock_deducted_at, stock_restored_at
) ON TABLE public.orders TO authenticated;

DO $verify_acl$
BEGIN
 IF has_table_privilege('anon','public.orders','SELECT')
    OR has_table_privilege('authenticated','public.orders','SELECT')
    OR has_column_privilege('authenticated','public.orders','items','SELECT')
    OR has_column_privilege('authenticated','public.orders','checkout_result','SELECT')
    OR has_column_privilege('authenticated','public.orders','checkout_request','SELECT')
    OR NOT has_column_privilege('authenticated','public.orders','id','SELECT')
    OR NOT has_column_privilege('authenticated','public.orders','status','SELECT')
 THEN
   RAISE EXCEPTION 'Stage70: raw order-snapshot ACL cutover did not reach safe state';
 END IF;
END $verify_acl$;

COMMIT;
