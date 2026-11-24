# Stage 67 — original legacy checkout blocks valid orders (no-cost integration proof)

**NOT RELEASE-READY. Draft PR #149 only. No Production writes or paid staging.**

## Exact regression discovered

Live Supabase catalog inspection (read-only, November 22, 2026) confirmed that the present `private.create_order_with_stock(jsonb)` persists `orders.user_id=auth.uid()`, stores the item's `gallery` snapshot, and sets `geostore.inventory_reason='order_deduction'` plus `geostore.inventory_order_id` to connect stock movements to the order.

The historical, **unapplied** `20261107170000_integrate_custom_product_variants.sql` replaces that same checkout function but has several independent regressions:

1. **Direct confirmed runtime failure:** the old checkout's SELECT for `v_product` does not retrieve `image`, but later it references `v_product.image` in the order-item JSON. In the genuine disposable PostgreSQL17 integration this fails with the exact error `record "v_product" has no field "image"` on an otherwise valid authenticated variant checkout. **No order is created.** Blindly applying this function could stop valid purchases.
2. **Source-level latent regression:** the obsolete INSERT omits `orders.user_id`. If its runtime error were repaired without updating the legacy logic, authenticated purchases could be stored without their owner's ID and be absent from `get_my_orders()`.
3. **Source-level latent regression:** it omits the newer `gallery` image snapshot and `geostore.inventory_reason` / `geostore.inventory_order_id` inventory attribution. These behaviors are already present in the current function.

The same old SQL file also overwrites status and cancellation/reactivation functions. These source-level differences are not proof that its historical SQL is equivalent or safe to replay.

## Free, rollback-only executable regression test

`scripts/stage67LegacyCheckoutReplayFixture.mjs` extracts **only the exact historical checkout function** from the old migration. It does not edit the original SQL or run any database update outside the existing disposable test instance.

`tests/sql/stage67_legacy_checkout_ownership_replay.sql` runs after Stage52–66 on **isolated PostgreSQL 17** in the existing CI service:

- It inserts a synthetic Auth user in a transaction, checks out a synthetic red/S variant using the **current** original checkout: verifies signed-in owner ID, gallery, stock movement tied to order, and finance-redacted public receipt.
- It rolls that order and stock change back to a savepoint, temporarily installs the **exact obsolete** checkout function, and submits the same legitimate request.
- It requires the **specific** missing-image-field error. Unrelated permission, stock, schema or network errors fail the test.
- It confirms the failed historic call did not create order, change inventory, or add order audit records. The entire test ends with **ROLLBACK**, after which current function definition and all synthetic data are verified unchanged.

`tests/stage67HistoricalCheckoutParity.test.js` guards the exact SQL source, the extraction boundaries and the required workflow steps.

## Production release decision

**Do NOT replay `20261107170000_integrate_custom_product_variants.sql` or mark its migration as applied** to bypass a history mismatch. Do not auto-run obsolete checkout validators from Stage66. More than forty migration version/name mismatches remain; the later pending Stage51/54/57 redaction/projection migrations are separate and not yet deployed.

A passing disposable integration test proves this concrete negative case; it **does not replace full-schema Supabase staging** and real signed JWT/customer/finance role end-to-end tests, nor a coordinated migration+frontend deployment. The user refused paid staging; **no paid staging was created**. Production remains unchanged and Draft PR #149 is unmerged.

Next release gate: continue SQL-by-SQL reconciliation and no-cost negative compatibility tests without changing existing live customers, orders, stock or financial records.
