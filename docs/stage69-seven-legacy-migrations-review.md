# Stage 69 — seven legacy migrations: incompatibility versus already-present effects

**NOT RELEASE-READY. Draft PR #149 only; Production remains unchanged.**

## Scope and evidence

Live Supabase catalog metadata was inspected **read-only** on November 22, 2026.
The prior Stage64 migration-history audit identified **42** local SQL migration
versions not listed in remote history, including seven older SQL files not
matched by normalized name and three deliberately staged new security migrations.
These seven files are categorized below. Observing a similar existing live
effect is **not proof of SQL equivalence** and is never permission to repair
migration history or replay source code automatically.

| Legacy SQL file (unmatched, not automatically deployable) | Observation and decision |
| --- | --- |
| `20261106120000_validate_order_item_variants.sql` | **BLOCK REPLAY:** Installs `orders_validate_item_variants` on `BEFORE INSERT OR UPDATE OF items`, comparing historical `selectedSize/selectedColor` to today's product arrays without recognizing historical snapshots or `custom_variant_id`. Stage69 rollback-only PG17 negative contract tests a historically valid order after later changes to catalog options. The old trigger is absent on Production. |
| `20261106210000_validate_checkout_input_on_order_insert.sql` | **BLOCK REPLAY:** Stage66 proved the exact obsolete insert trigger rejects a legitimate guest checkout without optional customer email. Trigger absent on Production. |
| `20261106220000_harden_support_ticket_public_insert.sql` | **EFFECT PRESENT, NOT PROVEN EQUIVALENT:** live `anon`/`authenticated` lack full support-ticket INSERT grants; anon has message-column INSERT but not status/reply, and authenticated cannot write created_at. Do not infer history is applied or identical. |
| `20261107153000_enable_rls_order_tracking_rate_limits.sql` | **EFFECT PRESENT, NOT PROVEN EQUIVALENT:** `private.order_tracking_rate_limits` has RLS enabled according to live metadata. Old SQL must still be reconciled. |
| `20261107170000_integrate_custom_product_variants.sql` | **BLOCK REPLAY:** Stage67 reproduced exact historical checkout exception `record "v_product" has no field "image"`; older source also omits authenticated `user_id`, gallery snapshots and order-attributed inventory audit context. |
| `20261107172000_stabilize_admin_product_order.sql` | **BLOCK REPLAY:** Stage68 proved that this owner-only legacy RPC overwrites current `expenses` permission-based staff product listing and returns 42501 to legitimately authorized finance staff. |
| `20261110050000_enable_support_ticket_status_realtime.sql` | **EFFECT PRESENT, NOT PROVEN EQUIVALENT:** live `supabase_realtime` publication includes `public.support_tickets` exactly once. This does not mean this migration version was applied. |

## Free regression: historical orders are not today's catalogue

This stage adds `tests/sql/stage69_legacy_variant_history_replay.sql` to the
**existing** ephemeral PostgreSQL 17 CI job. It reuses the actual staged
checkout, cancellation and reactivation SQL test fixtures from Stages61–62,
which created and later cancelled a size/color order.

Inside a disposable transaction:

1. It takes a synthetic snapshot of that existing completed-history order.
2. It clears the product's **current** selectable size and color arrays,
   simulating a later catalogue edit, without changing the stored order,
   its financial amount, the product's independent variant stock or the
   inventory movement ledger.
3. It proves that the modern schema allows an idempotent no-op
   `UPDATE public.orders SET items=items` of that historical order.
4. It installs the **exact original** legacy SQL
   `20261106120000_validate_order_item_variants.sql`, then repeats the same
   no-op update. The newly installed trigger must reject it with the exact
   old `არჩეული ზომა ამ პროდუქტისთვის ხელმისაწვდომი არ არის.` error
   ("This selected size is not available for the product").
5. It checks order status/total/stock and historical audit fields for
   corruption, then unconditionally executes `ROLLBACK` and confirms that
   the old trigger, helper function, catalogue edits and ephemeral snapshot
   were all removed while the original product and order are preserved.

This is a negative compatibility test for *historical* order records; it does
not assert that an out-of-stock or discontinued option is valid for a *new*
checkout. The newer checkout RPC already validates live selectable options,
stock, pricing and size/color consistency.

## Release gate

- Four old migration files have **demonstrated** incompatibilities in isolated
  SQL tests (Stages66, 67, 68, 69). Keep them out of any blind migration
  replay or automatic history repair.
- The other three have read-only **effect-present** evidence only; matching
  history or SQL equivalence has **not** been established.
- The three intended Stage51/54/57 migrations also remain staged, not applied
  to live Production. The full **42** local-version mismatches, remotely
  applied-only versions, function source definitions and four duplicate
  logical migration names still require reconciliation.
- A passing PostgreSQL fixture is not full-schema staging. Actual
  authenticated Supabase/JWT + HTTP/PostgREST tests and **full-schema staging**
  remain necessary for eventual synchronized Production deployment.

The user declined billable resources. **No paid staging** was created; this work uses no paid staging environment; there
are no Production SQL writes, real customer/order/finance records, merged PR
or Production deployment in Stage69. All SQL checks use an isolated,
no-cost fixture and always end in `ROLLBACK`.
