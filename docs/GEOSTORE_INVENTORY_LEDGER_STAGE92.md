# GEOSTORE inventory movement ledger — Stage 92

Repository: `chixradzezauri-design/geostore`  
PR: #129 — draft, not merged  
Migration: `20261117180000_private_inventory_movement_ledger.sql`

## What this staged migration adds

- A private-schema `inventory_movements` table with immutable before/after quantities, signed delta, product and variant snapshots, reason, actor, optional order ID, timestamp and metadata.
- An AFTER trigger on `public.products` that observes base-stock and per-variant stock changes. It does not update stock.
- Separate handling for product creation/deletion and switches between base-stock and variant inventory models, without double-counting a variant product's aggregate parent stock.
- Append-only enforcement against UPDATE and DELETE, no foreign keys to products or orders, and no direct table privileges for API roles.
- A bounded, cursor-paginated admin read RPC. The private table itself is not exposed to PostgREST clients.
- Transaction-local reason and order context added to existing checkout, cancellation, reactivation and admin stock RPC definitions through guarded source replacements. If an expected stock-code marker is absent, the migration raises and rolls back rather than silently installing partial tracking.

## Existing logic preserved

The migration does not replace checkout, order cancellation, order reactivation, product-update, variant-update, locking, validation, idempotency or stock-protection implementations. It only adds an AFTER observer and transaction-local metadata around existing writes.

The ledger records current changes only. It does not backfill guessed historical movements from current product quantities or order snapshots.

## Read-only live audit (2026-11-17)

- Live migration history currently ends at `20261116135251`; this Stage 92 migration is not applied.
- Live products: 8; live orders: 2.
- Six products currently have variant inventory.
- Forty-nine variant inventory positions are at or below the existing five-unit alert threshold.
- No duplicate variant IDs were found in the current live product rows.
- The live database has no inventory movement ledger table or AFTER product-stock audit trigger.
- Existing stock-related RPCs and BEFORE triggers were inspected read-only. Their current protections are retained.

## Verification and release status

- The migration has been committed to the draft PR branch only.
- GitHub Build check: passed for the migration commit.
- Dependency security audit: passed for the migration commit.
- CodeQL: running at last check.
- No live database migration, row update, product/order edit, or deployment was performed.
- Before production use: run staging integration tests for base stock, size/color and custom variants, checkout, cancellation, reactivation, manual stock edits, product creation/deletion, transaction rollback, append-only enforcement and admin-only pagination. Reconcile the entire migration history before applying.
