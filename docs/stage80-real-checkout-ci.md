# Stage80 — real signed checkout, stock, variants, audit and cancellation

**NOT RELEASE-READY. Production unchanged. No paid staging.** All changes stay in Draft PR #149.

The existing Stage78/79 CI already runs real signed Auth/PostgREST role tests and simulated Phase A/B cutover. Stage79 deliberately used a mock private checkout writer. Stage80 upgrades the *same disposable Supabase Docker stack* after those successful tests: it installs synthetic local products, coupons and delivery fees; imports the exact original Stage92 inventory ledger/trigger source via the existing checked Stage60 extractor; then runs the exact GitHub versioned checkout source SQL 20261117231546_stable_checkout_idempotency_ordering.sql and staff cancellation SQL 20261117231459_staff_orders_permission.sql.

The real source SQL replaces the mock. The customer-facing Phase A redaction remains the exact staged source. The only synthetic RPC delegate is the public SECURITY INVOKER status wrapper matching the live shape; the private cancellation/stock implementation is unmodified.

Over local signed GoTrue/Auth HTTP and PostgREST, the suite checks multi-variant checkout 3/2 -> 1/0, separate add-on lines and server totals, original movement audit with -4 quantity delta, stored internal cost, idempotent replay without extra stock deduction, mismatched size and oversell rejection without phantom orders, coupon + delivery pricing, authenticated checkout tied to correct email, customer history isolation, unauthorized status denial, authorized cancellation and one-time variant stock restore with zero net movement, cost-redacted staff ledger.

**Limits:** the actual private checkout and stock source SQL is real, not a mock, but the underlying local tables/accounts are synthetic and this is NOT a full-schema replay of Production's 135 migrations. Versioned GitHub SQL has not been proven byte-equivalent to the current live function. Additional live triggers, RLS, permissions, storage and older mismatched migration source history require validation. This is not approval for a blind migration push, history repair, or deploying Phase B before the new frontend is verified. Keep release sequence Phase A -> frontend readiness -> Phase B with stale-browser reload handling.

All operations are local tests. **Production unchanged**; no remote account, order, stock or schema mutation, no merged PR and **no paid staging**.
