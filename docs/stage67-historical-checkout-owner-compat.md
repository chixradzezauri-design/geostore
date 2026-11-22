# Stage 67 — historical variant checkout replay would silently corrupt order ownership and audit attribution

**NOT RELEASE-READY. Draft PR #149 only. No Production write, merge, deployment, or paid staging.**

## Verified with production metadata, read-only (2026-11-22)

The present `private.create_order_with_stock(jsonb)` is a SECURITY DEFINER implementation that:

- Persists `auth.uid()` to `public.orders.user_id` when an authenticated customer checks out, so the existing `get_my_orders()` ownership filter can find that order.
- Records `geostore.inventory_reason='order_deduction'` and `geostore.inventory_order_id=v_order_id` before decrementing inventory; the append-only ledger can associate stock consumption with a specific order.
- Snapshots `image` and `gallery` fields in the order item so product images remain meaningful even if the catalog later changes.

The outdated **unapplied** `20261107170000_integrate_custom_product_variants.sql` would `CREATE OR REPLACE` this same private checkout function without the `user_id` insert, without the `inventory_reason` / `inventory_order_id` audit context and without item `gallery` snapshots. It also redefines the status and reactivation functions, so replaying this historical migration would revert multiple newer safeguards.

An old SQL timestamp is not evidence of safe migration ordering. This is a **new, independent** blocking incompatibility in addition to Stage66's guest-email validator mismatch and Stage64's 42 migration-history version mismatches.

## Free executable proof

`scripts/stage67LegacyCheckoutReplayFixture.mjs` extracts the **exact original** `private.create_order_with_stock(jsonb)` source from the legacy 35 KB migration. It rejects missing markers or unexpected additional function bodies, and emits only a test-only SQL artifact.

The existing disposable **PostgreSQL 17** GitHub Actions job now calls `tests/sql/stage67_legacy_checkout_ownership_replay.sql` after all earlier Stages52–66. It reuses the genuine newer checkout, redacting public wrapper, synthetic Auth function, product size/color variants, stock trigger and inventory movement ledger.

In ONE transaction ending with unconditional `ROLLBACK`, the integration:

1. Creates one synthetic, confirmed Auth identity; checks out a real synthetic size/color variant using an authenticated JWT. The current implementation must persist the matching `user_id`, snapshot its `gallery`, record `order_deduction` with the exact order ID, and return a finance-redacted receipt.
2. Rolls back that checkout to a savepoint, so the same starting variant stock is available for comparison.
3. Temporarily replaces **only** the private checkout function with its unmodified legacy SQL source, then performs the equivalent signed-in checkout. It verifies that checkout can appear successful yet its stored order loses `user_id` and `gallery`, and the stock audit no longer attributes the deduction to the new order.
4. Ends the entire experiment with `ROLLBACK`; verifies the current function definition, synthetic user, order records, inventory movements and variant stock were restored.

This test cannot make new paid resources or write live Supabase data. Passing proves a **specific regression if this obsolete SQL is replayed**, not that the full Supabase environment is approved for Production.

## Release consequence

**Never apply or mark as applied** `20261107170000_integrate_custom_product_variants.sql` as part of a blind database replay. Keep this migration and the obsolete email/variant triggers quarantined until SQL-by-SQL equivalence reconciliation. Do not bypass the migration history classifier with manual "repair".

The later, staged Stage51/54/57 redaction migrations still require their own controlled, full-schema Supabase staging and real-authenticated user/staff/finance checkout checks. The user explicitly refused paid staging; **no paid staging** was created. No automatic Production merge will be attempted based only on disposable fixture tests.

Pending: SQL history reconciliation, staging JWT and real HTTP integration, full-schema Supabase staging, checked multi-device UI, and a safe coordinated release after all gates are green.
