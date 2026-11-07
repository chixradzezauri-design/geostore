# Forward migration SQL validation — 2026-11-07

## Scope

The following staged migrations were executed together against the live Supabase schema inside one explicit transaction ending in `ROLLBACK`:

1. `20261107200000_bind_order_ownership_to_auth_user_uuid.sql`
2. `20261107230000_admin_adjust_product_variant_stock.sql`
3. `20261107234500_harden_order_json_and_variant_integrity.sql`
4. `20261107241000_revoke_direct_order_note_column_update.sql`

PostgreSQL accepted the DDL and function definitions without returning an error.

## Post-rollback verification

A separate read-only query confirmed:
- `public.orders.user_id` does not exist;
- `public.order_notifications.recipient_user_id` does not exist;
- `public.admin_adjust_product_variant_stock(text,text,integer)` does not exist;
- `private.admin_adjust_product_variant_stock(text,text,integer)` does not exist;
- the authenticated direct `orders.admin_note` column grant is still present;
- the live migration ledger remains at 67 applied versions.

These results confirm that the test transaction rolled back and none of the staged DDL or privilege changes persisted.

## Limits

This validates SQL parsing and object compatibility against the current live schema only. It does not replace:
- functional tests with authenticated admin/customer JWTs;
- checkout, retry, cancellation, reactivation, stock-concurrency, and order-history behavior tests;
- browser QA;
- complete Node test-suite execution;
- migration-history reconciliation.

No order, product, stock, customer, or notification data was changed. No migration was applied permanently, and no Vercel build/deployment was triggered.
