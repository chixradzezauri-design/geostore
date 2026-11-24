# Stage 68 — legacy admin product listing would revoke finance staff permissions

**NOT RELEASE-READY. Draft PR #149 only. Production unchanged and no paid staging created.**

## Read-only Production contract (2026-11-22)

Connected Supabase metadata confirms that the existing `private.admin_list_products()` is SECURITY DEFINER and checks `public.has_staff_permission('expenses')`, allowing authenticated active staff with the `expenses` permission to read the full product catalogue, including private `purchase_cost`. Staff with only `products` permission cannot fetch purchasing cost through this protected RPC.

The older **unapplied** migration `20261107172000_stabilize_admin_product_order.sql` defines the **same function** with a different authorization condition: it requires the exact primary-owner ID and `app_metadata.role = 'admin'`. Replaying this migration after the newer Staff Products migration would replace a valid server-side permission policy with an owner-only check. The administrative frontend calls `admin_list_products` for expenses-authorized users, so a finance staff account would encounter an authorization error, even though its actual `expenses` permission remains valid.

The more recent `20261117140000_staff_products_permission.sql` explicitly patches this function's owner-only guard into `IF NOT public.has_staff_permission('expenses') THEN`. The live function body matches that later contract. This is a source- and live-metadata-supported migration ordering conflict, not a reason to modify staff permissions.

## Existing free PostgreSQL 17 integration

The new `tests/sql/stage68_legacy_admin_product_scope_replay.sql` is appended to the same disposable PostgreSQL17 GitHub Actions workflow used since Stage52.

- Uses the actual old `20261107172000_stabilize_admin_product_order.sql` SQL source unchanged. Temporarily adds the timestamp column that the existing synthetic products fixture omitted.
- Applies the exact newer finance permission replacement pattern from `20261117140000_staff_products_permission.sql` to reproduce the current authorized behavior.
- Confirms active finance-only staff (`expenses=true`, `products=false`) can see the protected products and cost snapshot, whereas products-only staff cannot.
- Replays the **actual old migration source** within the same transaction and checks that it now rejects that legitimate finance user with SQLSTATE 42501, while the verified primary owner remains allowed.
- Restores the modern function to confirm access, then unconditionally `ROLLBACK`s the entire experiment and asserts that the disposable product schema and variant inventory have not changed.
- Adds source/tests in `tests/stage68LegacyAdminProductScope.test.js` to prevent accidental deletion or weakening of this free release gate.

This test has no Production credentials, no real customer or financial record access, and **no paid staging**. It is a negative compatibility demonstration, not a full-schema migration rehearsal.

## Safe deployment consequence

**Do not replay** `20261107172000_stabilize_admin_product_order.sql` while reconciling historical timestamps. Also keep the historical checkout SQL blocked by the earlier Stage66 and Stage67 tests. Do not auto-repair migration history or automatically apply 42 migration files with mismatched version history.

The three newer checkout/history/ledger redaction migrations remain staged only. Real JWT sessions and HTTP/PostgREST behavior, complete legacy SQL-by-SQL reconciliation, full-schema Supabase staging and coordinated website+database deployment are still mandatory release gates. The user declined additional paid environments; **no paid staging** was created, and Production remains untouched.
