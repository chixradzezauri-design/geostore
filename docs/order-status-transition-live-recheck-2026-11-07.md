# Order status transition guard — fresh live verification

A fresh read-only `pg_get_functiondef` inspection of the live Supabase database confirms that `private.guard_order_status_transition()` already protects direct order status changes:

- completed/delivered orders cannot move backwards;
- shipped/in-transit orders cannot return to earlier states or be cancelled;
- cancelled orders can only reactivate to the new status when stock markers are valid, the configured admin UID and app-metadata role match, the transaction-local `geostore.order_reactivation` marker is set, and a password authentication event occurred within the last five minutes.

The live `private.admin_update_order_status()` RPC repeats the transition checks and restores stock transactionally when cancelling an order. The separate `private.prevent_cancellation_after_dispatch()` trigger also blocks cancellation after dispatch/completion.

**Correction to the earlier stock audit:** the note that the live trigger only blocked cancellation after dispatch was stale. The complete backward-transition protection is already live through `orders_guard_status_transition`; do not apply the staged status-transition migration merely to repeat that behavior.

The new staged migration `20261107234500_harden_order_json_and_variant_integrity.sql` addresses a separate issue in cancellation/reactivation functions: it splits JSON array-type checks from `jsonb_array_length` checks to avoid relying on Boolean short-circuit evaluation, and adds database-level duplicate variant ID/name validation.

No live orders, stock values, functions, triggers, or migration records were changed during this inspection.
