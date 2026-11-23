# Stage83 — authentic Production product-stock trigger integration

**NOT RELEASE-READY. Production unchanged. No paid staging.** All work in Draft PR #149.

Stage80 checked the genuine versioned GEOSTORE checkout/stock function using local signed GoTrue Auth and PostgREST, with the original inventory ledger trigger. Its synthetic products schema did not yet have two important Production product triggers:
- private.preserve_product_variant_stock() guards untrusted product edits against overwriting transactionally deducted variant stock, and blocks deleting a variant referenced by prior order history.
- private.sync_size_color_aggregate_stock() calculates parent product stock from the individual size/color/custom variant quantities, rather than leaving a parent variant product with stock=0.

The source SQL extractor copies these definitions verbatim from historical checked-in migrations (20261107170000 and the newer 20261109203329, plus original trigger DDL from 20261108225558). No historical migration is replayed in Production or re-registered. We add them only in the existing free disposable Supabase CI stack after Stage80's synthetic products are created but **before** Stage80 signed checkout, with an initial synthetic parent stock reconciliation.

With real signed Auth/PostgREST, Stage80 then verifies parent stock 1 after 4/5 size/color units sell, and parent stock 5 after cancellation with exactly-once variant restoration, along with idempotent replay, authorization, financial privacy, oversell and discount checks. Stage83 follows with a locally isolated check of the actual compiled trigger function MD5s against read-only Production fingerprints: preserve=6cd5f0a9ad0927af1e17368d43491995 and aggregate=f08ae438ed985b79b6317d034bc1b780. Source parity is an assertion, not an assumption.

The additional disposable local SQL checks include an ordinary catalog edit trying to set variant stock 99 (must be ignored by preservation guard), an attempted deletion of the historically ordered size/color variant (must be refused), a trusted manual stock adjustment 3 to 4 with parent total 6 and exactly one stock-audit movement, and an ensuing stale catalog overwrite to 800 (must not change stock). No Production row or customer data is used or touched.

This exercises **three** real product triggers together: preservation, aggregate, and inventory ledger. It is not a **full-schema** Production clone; more Production order triggers, policy/dependency chains and 11 executable historical migration divergences remain. In particular it does not prove that every Production table/trigger is equivalent or that a safe cutover is fully rehearsed.

Release still requires coordinated **Phase A** checkout/history redaction plus additive admin RPCs, verified new frontend READY, then **Phase B** old raw cost-bearing order read revocation only after stale client handling. Do not blind-push old migrations. No paid staging was created and **Production unchanged** (no live SQL writes, migrations, PR merge or Production deployment).
